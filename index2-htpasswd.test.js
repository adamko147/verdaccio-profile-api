'use strict';

var request = require('supertest');
var express = require('express');
var plugin = require('./index')({}, {});
var auth = {
  plugins: []
}
var app = express();
plugin.register_middlewares(app, auth, undefined);
app.use((body, req, res, next) => {
  res.header('Content-type', 'application/json');
  res.send(JSON.stringify(body));
});

describe('verdaccio no htpasswd plugin', () => {
  test('POST /-/npm/v1/user', (done) => {
    request(app).
      post('/-/npm/v1/user').
      expect(404, done);
  });
});
