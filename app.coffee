express = require("express")
frontcontroller = require("./routes/frontcontroller")
auth = require("./lib/auth")
app = module.exports = express.createServer()
app.configure ->
  app.set "views", __dirname + "/views"
  app.set "view engine", "jade"
  app.set express.logger("dev")
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use express.cookieParser()
  app.use express.session(secret: "holamundobonito")
  app.use auth.middleware()
  app.use express.static(__dirname + "/public")
  app.use express.favicon(__dirname + "/public/img/favicon.ico")

app.configure "development", ->
  app.use express.errorHandler(
    dumpExceptions: true
    showStack: true
  )

app.configure "production", ->
  app.use express.errorHandler()

setupHelpers = (app) ->
  getRequest = undefined
  getRequest = (req, res) ->
    req

  app.dynamicHelpers request: getRequest

setupHelpers app
auth.helpExpress app
frontcontroller.setup app
app.listen 3000, ->
  console.log "Express server listening on port %d in %s mode", app.address().port, app.settings.env
