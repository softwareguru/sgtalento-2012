auth = require './lib/auth'
views = require './lib/views'
conf = require './lib/conf'
lang = require './lib/lang'
model = require './lib/model'
services = require './lib/services'

express = require 'express'
less = require 'less'
browserify = require 'browserify'
i18n = require 'connect-i18n'
gzip = require 'connect-gzip'

everyauth = require 'everyauth'

#Our browser files go here
public_path = "#{__dirname}/public"

app = express.createServer(
  express.logger(),
  express.cookieParser()
)

gzip.gzip {matchType: /css/ }
gzip.gzip { flags: '--best' }

app.configure ->
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use express.cookieParser()
  app.use express.session { secret: "holamundobonito" }
  app.use auth.middleware()
  app.set 'view engine', 'jade'
  app.use express.compiler({ src: public_path, enable: ['less'] })

  #We wanna be able to use this on the browser
  app.use browserify(
    require: [
      'underscore',
      'backbone',
      'async'
    ]
    filter: require 'uglify-js'
  )

  app.use express.compiler({
    src: public_path
    enable: ['coffeescript']
  })

  app.use gzip.gzip()
  app.use gzip.staticGzip public_path
  app.use i18n({ default_locale: 'en' })
  
#  app.use app.router

app.configure 'development', ->
  app.use express.errorHandler {
    dumpExceptions: true
    showStack: true
  }

app.configure 'production', ->
  app.use express.errorHandler()

setupHelpers = (app) ->

  getRequest = (req, res) ->
    req

  app.dynamicHelpers {
    request: getRequest
  }

setupHelpers app

everyauth.helpExpress app
lang.setupHelpers app
auth.setupHelpers app
views.setup app
services.setup app

io = require('socket.io').listen app

app.listen conf.port, ->
  console.log "Starting app"
  console.log "Listening on port #{conf.port}"
