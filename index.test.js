'use strict';

var fs = require('jest-plugin-fs').default;
jest.mock('fs', () => require('jest-plugin-fs/mock'));

var request = require('supertest');
var express = require('express');
var plugin = require('./index')({}, {});
var locker = request('@verdaccio/file-locking');

var mock_authenticate = jest.fn((user, password, cb) => {
  cb(null, (user === 'adam' && password === 'Welcome1') ? [user] : false);
});
var mock_basic_middleware = jest.fn((req, res, next) => {
  next();
});

function HTPasswd() {
  this._config = { file: '/mocked_htpasswd' };
};
HTPasswd.prototype.authenticate = mock_authenticate;

describe('npm profile API', () => {
  // set('filename', () => 'mocked-htpasswd');
  // action('write', () => FileWriter.write(filename));
  beforeEach(() => fs.mock({"/mocked_htpasswd": "adam:$6abcdefghijk:autocreated 2018-06-04T21:47:11.284Z\n"}));
  afterEach(() => fs.restore());
  describe('verdaccio 2.x', () => {
    var app;
    beforeAll(() => {
      var auth = {
        plugins: [new HTPasswd()],
        basic_middleware: () => mock_basic_middleware,
        bearer_middleware: () => (req, res, next) => next()
      }
      app = express();
      plugin.register_middlewares(app, auth, undefined);
      app.use((body, req, res, next) => {
        res.header('Content-type', 'application/json');
        res.send(JSON.stringify(body));
      });
    });

    describe('unauthenticated', () => {
      test('GET /-/npm/v1/user', (done) => {
        request(app).
          get('/-/npm/v1/user').
          expect(403, done);
      });

      test('POST /-/npm/v1/user', done => {
        request(app).
          post('/-/npm/v1/user').
          send({password: {old: 'Password1', new: 'Welcome1'}}).
          expect(403, done);
      });
    });
    describe('authenticated', () => {
      beforeEach(() => {
        mock_basic_middleware.mockImplementation((req, res, next) => {
          req.remote_user = {name: 'adam'};
          next();
        });
      });
      test('GET /-/npm/v1/user', (done) => {
        request(app).
          get('/-/npm/v1/user').
          expect(200, {name: 'adam'}, done);
      });

      describe('POST /-/npm/v1/user', () => {
        test('missing change password data', done => {
          request(app).
            post('/-/npm/v1/user').
            send({}).
            expect(501, done);
        });
  
        test('wrong old password', done => {
          request(app).
            post('/-/npm/v1/user').
            send({password: {old: 'wrong', new: 'Password1'}}).
            expect(403, done);
        });

        test('password changed', done => {
          request(app).
            post('/-/npm/v1/user').
            send({password: {old: 'Welcome1', new: 'Password1'}}).
            expect(200, {name: 'adam'}, done);
        });

        test('authenticate returns error', done => {
          mock_authenticate.mockImplementation((usr, pwd, cb) => { 
            cb(new Error('mocked error'));
          });
          request(app).
            post('/-/npm/v1/user').
            send({password: {old: 'Welcome1', new: 'Password1'}}).
            expect(500, done);
        });
      });
    });
  });
});
