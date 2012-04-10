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
var Promise = everyauth.Promise;

everyauth.debug = true;

// Everyauth vars
var User = model.User;

extractor = function(user, type) {
    var extractFacebook, extractGithub, extractLinkedin, extractTwitter, extracted;
    console.log("Entering extractor");
    extractGithub = function() {
        return {
            email: user.email || '',
            slug: user.login || String(user.id)
        };
    };
    extractFacebook = function() {
        return {
            email: '',
            slug: user.username || String(user.id)
        };
    };
    extractLinkedin = function() {
        return {
            email: '',
            slug: String(user.id)
        };
    };
    extractTwitter = function() {
        return {
            email: '',
            slug: user.screen_name
        };
    };
    if (type === 'github') extracted = extractGithub();
    if (type === 'facebook') extracted = extractFacebook();
    if (type === 'linkedin') extracted = extractLinkedin();
    if (type === 'twitter') extracted = extractLinkedin();
    return extracted;
};

createFindOrCreate = function(type) {
    var addService, createUser, findOrCreateUser, findUser;
    createUser = function(promise, sess, user) {
        var u, userData;
        userData = extractor(user, type);
        u = new User({
            slug: userData.slug,
            email: userData.email,
            registered: false,
            filled: false,
            profile: [],
            services: [
                {
                    type: type,
                    id: String(user.id),
                    data: user
                }
            ],
            created: new Date()
        });
        u.save(function(err) {
            return console.log(err);
        });
        sess.user = u;
        return promise.fulfill(u);
    };
    findUser = function(promise, sess, user) {
        var searchParams;
        searchParams = {
            'services.type': type,
            'services.id': String(user.id)
        };
        return User.findOne(searchParams, function(err, u) {
            if (!err && u) {
                sess.user = u;
                return promise.fulfill(u);
            } else {
                return createUser(promise, sess, user);
            }
        });
    };
    addService = function(promise, user, sess, newUserData) {
        return User.findById(user._id, function(err, u) {
            if (!err && u) {
                u.services.push({
                    type: type,
                    id: String(newUserData.id),
                    data: newUserData
                });
                sess.user = u;
                return u.save(function(err) {
                    return promise.fulfill(u);
                });
            }
        });
    };
    return findOrCreateUser = function(sess, accessToken, accessTokenSecret, user) {
        var findServices, promise;
        sess[type] = {
            accessToken: accessToken,
            accessTokenSecret: accessTokenSecret
        };

        findServices = function() {
            var services;
            services = [];
            sess.user.services.forEach(function(service) {
                return services.push(service.type);
            });
            return services;
        };
        promise = this.Promise();
        if (sess.user) {
            if (findServices().indexOf(type) == -1) {
                addService(promise, sess.user, sess, user);
            } else {
                promise.fulfill(sess.user);
            }
        } else {
            findUser(promise, sess, user);
        }
        return promise;
    };
};

everyauth
    .github
    .appId(conf.github.id)
    .appSecret(conf.github.secret)
    .scope('repo')
    .findOrCreateUser(createFindOrCreate('github'))
    .redirectPath('/')

everyauth
    .facebook
    .myHostname(conf.facebook.myHostname)
    .appId(conf.facebook.id)
    .appSecret(conf.facebook.secret)
    .findOrCreateUser(createFindOrCreate('facebook'))
    .redirectPath('/')

everyauth
    .linkedin
    .consumerKey(conf.linkedin.key)
    .consumerSecret(conf.linkedin.secret)
    .findOrCreateUser(createFindOrCreate('linkedin'))
    .redirectPath('/')

everyauth
    .twitter
    .consumerKey(conf.twitter.key)
    .consumerSecret(conf.twitter.secret)
    .findOrCreateUser(createFindOrCreate('twitter'))
    .redirectPath('/')


// Password functions

authenticate = function (login, password) {
    var promise, errors = [];
    if (!login) errors.push('Indica tu email.');
    if (!password) errors.push('Indica tu password.');
    if (errors.length) return errors;

    promise = this.Promise();
    var searchParams = {
        slug: login,
        password: crypto.createHash('md5').update(password).digest('hex')
    };
    User.findOne(searchParams, function (err, u) {
        if (err) {
            errors.push(err.message || err);
            return promise.fulfill(errors);
        }
        if (!u) {
            errors.push('El usuario o contraseña es incorrecto.');
            return promise.fulfill(errors);
        }
        promise.fulfill(u);
    });
    return promise;
}

registerUser = function(newUserAttributes) {
    console.log("Registrando al usuario");
    var promise = this.Promise();
    var tmpProfile = {};
    var tmpSkill = { name: "sgtalento", auto : true, level: 0 };
    tmpProfile.skills = [tmpSkill];

    var userObj = new User({
        slug: newUserAttributes.email,
        email: newUserAttributes.email,
        password: crypto.createHash('md5').update(newUserAttributes.password).digest('hex'),
        registered: true,
        profile: [tmpProfile]
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
                else
                    return promise.fulfill(userObj);
            });
        }
    });
    return promise;
}

validateRegistration = function (newUserAttrs, errors) {
    console.log("Validando el registro de usuario");
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
    .loginSuccessRedirect('/')
    .registerSuccessRedirect('/');

exports.middleware = everyauth.middleware;

exports.setupHelpers = function(app) {
    return everyauth.helpExpress(app);
};
