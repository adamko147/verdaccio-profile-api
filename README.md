[![Build Status](https://travis-ci.org/ahoracek/verdaccio-profile-api.svg?branch=master)](https://travis-ci.org/ahoracek/verdaccio-profile-api)

# Verdaccio 2.x module for npm profile commands

Basic Verdaccio 2.x module for handling npm profile commands and changing password with ```verdaccio-htpasswd``` authentication plugin

## Install
As simple as running:
```
$ npm install -g verdaccio-profile-api
```

## Configure
Plugin has no specific configuration, all you need is to enable the middlewares plugin in your configuration
```
middlewares:
  profile-api:
```

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

## How does it work
Plugin implements npm user API. Currently only ```npm profile get``` and ```npm profile set password``` is supported.

### Usefull links
- [npm profile API](https://github.com/npm/registry/blob/master/docs/user/profile.md)
- [Plugin Development](http://www.verdaccio.org/docs/en/dev-plugins.html)
