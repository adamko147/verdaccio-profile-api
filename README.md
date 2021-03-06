# Verdaccio 2.x/3.x module for npm profile commands

[![build](https://travis-ci.org/ahoracek/verdaccio-profile-api.svg?branch=master)](https://travis-ci.org/ahoracek/verdaccio-profile-api)
[![codecov](https://codecov.io/gh/ahoracek/verdaccio-profile-api/branch/master/graph/badge.svg)](https://codecov.io/gh/ahoracek/verdaccio-profile-api)
[![npm](https://img.shields.io/npm/v/verdaccio-profile-api.svg)](https://www.npmjs.com/package/verdaccio-profile-api)
[![downloads](https://img.shields.io/npm/dt/verdaccio-profile-api.svg)](https://www.npmjs.com/package/verdaccio-profile-api)


Basic Verdaccio 2.x/3.x module for handling npm profile commands and changing password with ```verdaccio-htpasswd``` authentication plugin

## Install
As simple as running:
```
$ npm install -g verdaccio-profile-api
```

## Configure
Plugin configuration:
```
middlewares:
  profile-api:
    password_hash: md5
    password_policy: (?=.{9,})(?=.*?[^\w\s])(?=.*?[0-9])(?=.*?[A-Z]).*?[a-z].*
```
#### password_hash
- `md5`: use apache-md5 hash
- `sha1`: use crypt sha-1 hash
- leave empty to use `crypt` DES from `unix-crypt-td-js`

#### password_policy
Regular expression to check for password policy. `(?=.{9,})(?=.*?[^\w\s])(?=.*?[0-9])(?=.*?[A-Z]).*?[a-z].*` for lenght at least 9 characters, at least one upper, lower, number and special character

## Usage
- First log in to npm private registry
  ```
  $ npm login --registry http://localhost:4873
  ```
- Once logged in, you can view your profile. Except username all fields are blank, which is okey, as Verdaccio does not store profile information
  ```
  $ npm profile get --registry http://localhost:4873
  ┌─────────────────┬──────────────┐
  │ name            │ adam         │
  ├─────────────────┼──────────────┤
  │ email           │ (unverified) │
  ├─────────────────┼──────────────┤
  │ two-factor auth │ disabled     │
  ├─────────────────┼──────────────┤
  │ fullname        │              │
  ├─────────────────┼──────────────┤
  │ homepage        │              │
  ├─────────────────┼──────────────┤
  │ freenode        │              │
  ├─────────────────┼──────────────┤
  │ twitter         │              │
  ├─────────────────┼──────────────┤
  │ github          │              │
  ├─────────────────┼──────────────┤
  │ created         │              │
  ├─────────────────┼──────────────┤
  │ updated         │              │
  └─────────────────┴──────────────┘
  ```
- Change your password (works only for htpasswd authetification) by running
  ```
  $ npm profile set password --registry http://localhost:4873
  Current password: 
  New password: 
  Again: 
  Set password
  ```
  Now you can logout and login with your new credentials. 
- If password policy is configured, server returns `E400` for passwords not matching password policy

## How does it work
Plugin implements npm user API. Currently only ```npm profile get``` and ```npm profile set password``` is supported.

### Usefull links
- [npm profile API](https://github.com/npm/registry/blob/master/docs/user/profile.md)
- [Plugin Development](http://www.verdaccio.org/docs/en/dev-plugins.html)
