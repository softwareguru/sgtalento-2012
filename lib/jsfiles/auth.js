/**
 * Module to handle authentication.
 * Originally developed by iamedu
 * Last refactored by pedrogk
 * To Do:
 */

var everyauth = require('everyauth');
var crypto = require('crypto');
var conf = require('./conf');
var model = require('./model');
var mailer = require('./mailer');
var Promise = everyauth.Promise;

// Everyauth vars
everyauth.debug = false;
var User = model.User;


everyauth.everymodule.findUserById( function (userId, callback) {
    User.findById(userId, callback);
});

// Password functions
authenticate = function (login, password) {
    console.log("Autenticando a login: "+login+" password: "+password);
    var promise, errors = [];
    if (!login) errors.push('Indica tu email.');
    if (!password) errors.push('Indica tu password.');
    if (errors.length) return errors;

    promise = this.Promise();
    var searchParams = {
        email: login,
        password: crypto.createHash('md5').update(password).digest('hex')
    };
    User.findOne(searchParams, function (err, u) {
        if (err) {
            errors.push(err.message || err);
            return promise.fulfill(errors);
        }
        if (!u) {
            errors.push('El email o contraseña es incorrecto.');
            return promise.fulfill(errors);
        }
        promise.fulfill(u);
    });
    return promise;
}

registerUser = function(newUserAttributes) {
    var promise = this.Promise();

    var userObj = new User({
        email: newUserAttributes.email,
        password: crypto.createHash('md5').update(newUserAttributes.password).digest('hex')
    });
    var searchParams = {
        email: newUserAttributes.email
    };
    User.findOne(searchParams, function (err, foundUser) {
        if(foundUser) {
            return promise.fulfill(['Ya existe un usuario con ese email.']);
        }
        else {
            userObj.save(function(err) {
                if (err)
                    return promise.fulfill([err]);
                else {
//                    mailer.send(userObj.email, "Bienvenido a SG Talento", "Te has registrado a SG Talento con estos datos:\n\n  Email: "+userObj.email+"\n  Password: "+newUserAttributes.password);
                    return promise.fulfill(userObj);
                }
            });
        }
    });

    return promise;
}

validateRegistration = function (newUserAttrs, errors) {
    var promise = this.Promise();
    var user = new User(newUserAttrs);
    user.validate( function (err) {
        if (err) {
            errors.push(err.message || err);
        }
        if (errors.length)
            return promise.fulfill(errors);
        promise.fulfill(null);
    });
    return promise;
}

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
    .validateRegistration(validateRegistration)
    .registerUser(registerUser)
    .loginSuccessRedirect('/home')
    .registerSuccessRedirect('/home');

// Delegate middleware method to
// everyauth's middleware method
exports.middleware = everyauth.middleware.bind(everyauth);

// Delegate helpExpress method to everyauth.
// Adds dynamic helpers such as loggedIn,
// accessible from the views
exports.helpExpress = everyauth.helpExpress.bind(everyauth);

/*
exports.setupHelpers = function(app) {
    return everyauth.helpExpress(app);
};
*/