'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var locker = require('@verdaccio/file-locking');
var crypt = require('unix-crypt-td-js');
var crypto = require('crypto');

function crypt3(password) {
    var salt = '$6$' + crypto.randomBytes(10).toString('base64');
    return crypt(password, salt);
}

function middlewares(config, stuff, app, auth, storage) {
    var htpasswd = undefined;
    for (var i = 0; i < auth.plugins.length; i++) {
        if (auth.plugins[i].constructor.name === 'HTPasswd') {
            htpasswd = auth.plugins[i];
            break;
        }
    }

    var router = express.Router();
    router.use(auth.basic_middleware());
    router.use(auth.bearer_middleware());
    router.use(bodyParser.json());

    router.get('/', function(req, res, next) {
        if (req.remote_user === undefined || req.remote_user.name === undefined) {
            res.status(403);
            return next({message: "You must be authenticated"});
        }
        else {
            res.status(200)
            return next({
                tfa: null,
                name: req.remote_user.name  
            });
        }
    });

    router.post('/', function(req, res, next) {
        if (!htpasswd) {
            res.status(404);
            return next();
        }
        if (req.remote_user === undefined || req.remote_user.name === undefined) {
            res.status(403);
            return next({message: "You must be authenticated"});
        }
        if (!req.body.password) {
            res.status(501);
            next({message: "Not implemented"});
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
            
            locker.readFile(htpasswd._config.file, { lock: true }, (err, body) => {
                if (err) {
                    res.status(500);
                    return next({message: err.message || err});
                }
                console.log(`Read ${res.lenght} from ${htpasswd._config.file}`);
                body = (body || '').toString('utf8');
                var newbody = '';
                var newpwd = crypt3(req.body.password.new);
                
                body.split('\n').forEach(line => {
                    if (line.startsWith(req.remote_user.name + ':')) {
                        let args = line.split(':');
                        args[1] = newpwd;
                        newbody += args.join(':');
                    }
                    else {
                        newbody += line;
                    }
                    newbody += "\n";
                });
                console.log(`about to write new file`);
                fs.writeFile(htpasswd._config.file, newbody, (err) => {
                    console.log(err);
                    locker.unlockFile(htpasswd._config.file, () => {
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
