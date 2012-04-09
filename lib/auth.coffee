
var everyauth = require('everyauth');

// Password functions
authenticate = (login, password) ->
    promise = new Promise()
searchParams =
    slug: login
password: crypto.createHash('md5').update(password).digest('hex')

User.findOne searchParams, (err, u) ->
if (!err and u)
promise.fulfill u
else
promise.fulfill [err]


promise



registerUser = (user) ->
    promise = new Promise()

console.log user

u = new User {
    slug: user.login
    email: user.email
    password: crypto.createHash('md5').update(user.password).digest('hex')
    name: user.name
    registered: false
    role: 'RECRUITER'
    created: new Date()
}

u.save (err) ->
if err
    promise.fulfill [err]
else
    searchParams =
        slug: user.login
User.findOne searchParams, (err, u) ->
if (!err and u)
promise.fulfill u
else
promise.fulfill [err]

promise


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
    .authenticate( function (login, password) {
        var errors = [];
        if (!login) errors.push('Missing login');
        if (!password) errors.push('Missing password');
        if (errors.length) return errors;
        var user = usersByLogin[login];
        if (!user) return ['Login failed'];
        if (user.password !== password) return ['Login failed'];
        return user;
    })

    .getRegisterPath('/register')
    .postRegisterPath('/register')
    .registerView('register.jade')
//    .registerLocals({
//      title: 'Register'
//    })
//    .registerLocals(function (req, res) {
//      return {
//        title: 'Sync Register'
//      }
//    })
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
    .registerUser( function (newUserAttrs) {
        var login = newUserAttrs[this.loginKey()];
        return usersByLogin[login] = addUser(newUserAttrs);
    })

    .loginSuccessRedirect('/')
    .registerSuccessRedirect('/');


function addHelpers(app) {
  everyauth.helpExpress(app);
}

exports = addHelpers;