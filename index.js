'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var locker = require('@verdaccio/file-locking');
var crypt = require('unix-crypt-td-js');
var crypto = require('crypto');
var md5 = require('apache-md5');

function crypt3(password) {
    var salt = '$6$' + crypto.randomBytes(10).toString('base64');
    return crypt(password, salt);
}

function middlewares(config, stuff, app, auth, storage) {
    if (stuff.logger) {
        stuff.logger.warn('Profile api configuration ' + JSON.stringify(config));
    }
    var htpasswd = undefined;
    for (var i = 0; i < auth.plugins.length; i++) {
        if (auth.plugins[i].constructor.name === 'HTPasswd') {
            htpasswd = auth.plugins[i];
            break;
        }
    }

    var router = express.Router();
    if (auth.basic_middleware) {
        router.use(auth.basic_middleware());
    }
    if (auth.bearer_middleware) {
        router.use(auth.bearer_middleware());
    }
    if (auth.apiJWTmiddleware) {
        router.use(auth.apiJWTmiddleware());
    }
    router.use(bodyParser.json());

    router.get('/', function(req, res, next) {
        if (req.remote_user === undefined || req.remote_user.name === undefined) {
            res.status(403);
            return next({message: "You must be authenticated"});
        }
        else {
            res.status(200);
            next({name: req.remote_user.name});
        }
    });

    router.post('/', function(req, res, next) {
        if (!htpasswd) {
            res.status(404);
            return next({message: "HTPasswd not used"});
        }
        if (req.remote_user === undefined || req.remote_user.name === undefined) {
            res.status(403);
            return next({message: "You must be authenticated"});
        }
        if (!req.body.password) {
            res.status(501);
            return next({message: "Not implemented"});
        }
        
        htpasswd.authenticate(req.remote_user.name, req.body.password.old, (err, groups) => {
            if (err) {
                res.status(500);
                return next({message: err.message || err});
            }
            if (groups === false) {
                res.status(403);
                return next({message: "You must be authenticated"});
            }
            if (config.password_policy) {
                var m = req.body.password.new.match(config.password_policy);
                if (!m) {
                    res.status(400);
                    return next({message: "Password does not match password policy"});
                }
            }
            var config_file = htpasswd._config ? htpasswd._config.file : htpasswd.config.file;
            locker.readFile(config_file, { lock: true }, (err, body) => {
                if (err) {
                    res.status(500);
                    return next({message: err.message || err});
                }
                body = (body || '').toString('utf8');
                var newpwd = '';
                var newbody = [];
                if (config.password_hash == 'md5') {
                    newpwd = md5(req.body.password.new);
                }
                else if (config.password_hash == 'sha1') {
                    newpwd = '{SHA}' + crypto.createHash('sha1').update(req.body.password.new, 'binary').digest('base64');
                }
                else {
                    newpwd = crypt3(req.body.password.new);
                }
                body.split('\n').forEach(line => {
                    if (line.startsWith(req.remote_user.name + ':')) {
                        let args = line.split(':', 2); // remove comments
                        args[1] = newpwd;
                        newbody.push(args.join(':'))
                    }
                    else if (line.length) {
                        newbody.push(line);
                    }
                });
                fs.writeFile(config_file, newbody.join('\n')+'\n', (err) => {
                    locker.unlockFile(config_file, () => {
                        res.status(err ? 500 : 200);
                        return next(err ? 
                            {message: "Internal server error" } :
                            {name: req.remote_user.name});
                    });
                });
            });
        });
    });
    app.use('/-/npm/v1/user', router);
}

module.exports = function(config, stuff) {
    return {
        register_middlewares: middlewares.bind(undefined, config, stuff)
    }
}
