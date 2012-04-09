/**
 * Module to handle authentication.
 * Originally developed by iamedu
 * Last refactored by pedrogk
 * To Do:
 */

var everyauth = require('everyauth');
var crypto = require('crypto');
var conf = require('conf');
var model = require('./model');

everyauth.debug = true;

// Everyauth vars
var User = model.User;
var UserProfile = model.UserProfile;

// Password functions
authenticate = function (login, password) {
    var promise = this.Promise();
    var searchParams = {
        slug: login,
        password: crypto.createHash('md5').update(password).digest('hex')
    };

    User.findOne(searchParams, function (err, u) {
        if (err)
            return promise.fulfill(err);
        else
            promise.fulfill(u);
    })
    return promise;
}

registerUser = function(user) {
    var promise = this.Promise();
    var u = new User({
        slug: user.login,
        email: user.email,
        password: crypto.createHash('md5').update(user.password).digest('hex'),
        name: user.name,
        registered: false,
        role: 'RECRUITER',
        created: new Date()
    });
    u.save(function(err) {
        var searchParams;
        if (err) {
            return promise.fulfill([err]);
        } else {
            searchParams = {
                slug: user.login
            };
            return User.findOne(searchParams, function(err, u) {
                if (!err && u) {
                    return promise.fulfill(u);
                } else {
                    return promise.fulfill([err]);
                }
            });
        }
    });
    return promise;
};

everyauth.password
    .loginWith('email')
    .getLoginPath('/login')
    .postLoginPath('/login')
    .loginView('login.jade')
    .loginLocals( function (req, res, done) {
        setTimeout( function () {
            done(null, {
                title: 'Async login'
            });
        }, 200);
    })
    .authenticate(authenticate)
    .getRegisterPath('/register')
    .postRegisterPath('/register')
    .registerView('register.jade')
    .registerLocals( function (req, res, done) {
        setTimeout( function () {
            done(null, {
                title: 'Async Register'
            });
        }, 200);
    })
    .validateRegistration( function (newUserAttrs, errors) {
        var login = newUserAttrs.login;
        if (usersByLogin[login]) errors.push('Login already taken');
        return errors;
    })
    .registerUser(registerUser)
    .loginSuccessRedirect('/')
    .registerSuccessRedirect('/');

function addHelpers(app) {
  everyauth.helpExpress(app);
}

exports = addHelpers;