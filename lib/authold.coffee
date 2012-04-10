everyauth = require 'everyauth'
conf = require 'conf'
model = require 'model'
crypto = require 'crypto'

everyauth.debug = true;

#Everyauth vars
Promise = everyauth.Promise
User = model.User
UserProfile = model.UserProfile

extractor = (user, type) ->

  extractGithub = () ->
    {
      email: user.email or ''
      slug: user.login or String(user.id)
    }

  extractFacebook = () ->
    {
      email: ''
      slug: user.username or String(user.id)
    }

  extractLinkedin = () ->
    {
      email: ''
      slug: String(user.id)
    }

  extractTwitter = () ->
    {
      email: ''
      slug: user.screen_name
    }

  if type == 'github'
    extracted = extractGithub() 
  if type == 'facebook'
    extracted = extractFacebook()
  if type == 'linkedin'
    extracted = extractLinkedin()
  if type == 'twitter'
    extracted = extractLinkedin()

  extracted



createFindOrCreate = (type) ->

  createUser = (promise, sess, user) ->
    userData = extractor user, type

    u = new User {
      slug: userData.slug
      email: userData.email
      registered: false
      filled: false
      profile: []
      services: [
        {
          type: type
          id: String(user.id)
          data: user
        }
      ]
      created: new Date()
    }

    u.save (err) ->
      console.log err
    
    sess.user = u
    promise.fulfill u
  
  findUser = (promise, sess, user) ->

    searchParams = 
      'services.type': type
      'services.id': String(user.id)

    User.findOne searchParams, (err, u) ->
      if(!err && u)
        sess.user = u
        promise.fulfill u
      else
        createUser promise, sess, user

  addService = (promise, user, sess, newUserData) ->

    User.findById user._id, (err, u) ->
      if(!err && u)
        u.services.push {
          type: type
          id: String(newUserData.id)
          data: newUserData
        }
        sess.user = u
        u.save (err) ->
          promise.fulfill u


  findOrCreateUser = (sess, accessToken, accessTokenSecret, user) ->
    sess[type] =
      accessToken: accessToken
      accessTokenSecret: accessTokenSecret
    findServices = () ->
      services = []
      sess.user.services.forEach (service) ->
        services.push service.type
      services

    promise = this.Promise()
    if sess.user
      if !(type in findServices())
        addService promise, sess.user, sess, user
      else
        promise.fulfill sess.user
    else
      findUser promise, sess, user
    promise

everyauth
  .github
  .appId(conf.github.id)
  .appSecret(conf.github.secret)
  .scope('repo')
  .findOrCreateUser(createFindOrCreate('github'))
  .redirectPath('/')

everyauth
  .facebook
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


#Password functions
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

everyauth
  .password
  .loginWith('login')
  .getLoginPath('/login')
  .postLoginPath('/login')
  .loginView('login')
  .authenticate(authenticate)
  .getRegisterPath('/register')
  .postRegisterPath('/register')
  .registerLocals({
    scripts: ['/scripts/coffee/register.js']
    styles: ['/styles/css/validationEngine.jquery.css']
  })
  .registerView('register')
  .registerUser(registerUser)
  .extractExtraRegistrationParams (req) ->
    {
      name: req.body.name
      email: req.body.email
    }
  .loginSuccessRedirect('/')
  .registerSuccessRedirect('/')

exports.middleware = everyauth.middleware
exports.setupHelpers = (app) ->
  everyauth.helpExpress app
exports.Promise = Promise