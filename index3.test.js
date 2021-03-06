'use strict';

var fs = require('jest-plugin-fs').default;
jest.mock('fs', () => require('jest-plugin-fs/mock'));

var request = require('supertest');
var express = require('express');
var plugin = require('./index')({}, {});
var locker = request('@verdaccio/file-locking');

var mock_authenticate = jest.fn((user, password, cb) => {
  cb(null, (user === 'adam3' && password === 'Welcome1') ? [user] : false);
});
var mock_basic_middleware = jest.fn((req, res, next) => {
  next();
});

function HTPasswd() {
  this.config = { file: '/mocked_htpasswd' };
};
HTPasswd.prototype.authenticate = mock_authenticate;
var auth = {
  plugins: [new HTPasswd()],
  apiJWTmiddleware: () => mock_basic_middleware
}
var app = express();
plugin.register_middlewares(app, auth, undefined);
app.use((body, req, res, next) => {
  res.header('Content-type', 'application/json');
  res.send(JSON.stringify(body));
});

describe('verdaccio 3.x', () => {
  beforeEach(() => fs.mock({"/mocked_htpasswd": "adam3:$6abcdefghijk:autocreated 2018-06-04T21:47:11.284Z\n"}));
  afterEach(() => fs.restore());
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
        req.remote_user = {name: 'adam3'};
        next();
      });
    });
    test('GET /-/npm/v1/user', (done) => {
      request(app).
        get('/-/npm/v1/user').
        expect(200, {name: 'adam3'}, done);
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
          expect(200, {name: 'adam3'}, done);
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
