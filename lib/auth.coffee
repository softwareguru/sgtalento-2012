everyauth = require("everyauth")
crypto = require("crypto")
conf = require("./conf")
model = require("./model")
mailer = require("./mailer")
Promise = everyauth.Promise
everyauth.debug = false
User = model.User
everyauth.everymodule.findUserById (userId, callback) ->
  User.findById userId, callback

authenticate = (login, password) ->
  console.log "Autenticando a login: " + login + " password: " + password
  promise = undefined
  errors = []
  errors.push "Indica tu email."  unless login
  errors.push "Indica tu password."  unless password
  return errors  if errors.length
  promise = @Promise()
  searchParams =
    email: login
    password: crypto.createHash("md5").update(password).digest("hex")

  User.findOne searchParams, (err, u) ->
    if err
      errors.push err.message or err
      return promise.fulfill(errors)
    unless u
      errors.push "El email o contraseña es incorrecto."
      return promise.fulfill(errors)
    promise.fulfill u

  promise

registerUser = (newUserAttributes) ->
  promise = @Promise()
  userObj = new User(
    email: newUserAttributes.email
    password: crypto.createHash("md5").update(newUserAttributes.password).digest("hex")
  )
  searchParams = email: newUserAttributes.email
  User.findOne searchParams, (err, foundUser) ->
    if foundUser
      promise.fulfill [ "Ya existe un usuario con ese email." ]
    else
      userObj.save (err) ->
        promise.fulfill userObj  unless err

  promise

validateRegistration = (newUserAttrs, errors) ->
  promise = @Promise()
  user = new User(newUserAttrs)
  user.validate (err) ->
    errors.push err.message or err  if err
    return promise.fulfill(errors)  if errors.length
    promise.fulfill null

  promise

everyauth.password.loginWith("email").getLoginPath("/login").postLoginPath("/login").loginView("login.jade").loginLocals((req, res, done) ->
  setTimeout (->
    done null,
      title: "Async login"
  ), 200
).authenticate(authenticate).getRegisterPath("/register").postRegisterPath("/register").registerView("register.jade").registerLocals((req, res, done) ->
  setTimeout (->
    done null,
      title: "Async Register"
  ), 200
).validateRegistration(validateRegistration).registerUser(registerUser).loginSuccessRedirect("/home").registerSuccessRedirect "/home"
exports.middleware = everyauth.middleware.bind(everyauth)
exports.helpExpress = everyauth.helpExpress.bind(everyauth)
