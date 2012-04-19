model = require '../lib/model'
conf = require '../lib/conf'

elastical = require 'elastical'
crypto = require 'crypto'

User = model.User
Profile = model.Profile

needLogin = [
  '/home',
  '/buscar',
  '/edit',
  '/admin'
]


setup = (app) ->

  app.all '*', (req, res, next) ->
    if(req.loggedIn)
      console.log "Received request at "+req.url+" by "+req.user.email
    if req.url in needLogin and !req.loggedIn
      res.redirect '/'
    else
      next()

  app.get '/home', (req, res) ->
    res.render "home"

  app.get '/', (req, res, next) ->
    if req.loggedIn
      res.redirect "/home"
    else
      next()

  app.get '/', (req, res) ->
    res.render "index"

  app.get '/buscar', (req, res) ->
    res.local 'query', ''
    res.render 'buscar'

  app.post '/buscar', (req, res) ->
    isRecruiter = req.user.isRecruiter()
    res.local 'query', ''
    client = new elastical.Client(conf.elasticsearch.host)
    #eres is the elastic response
    if req.body.query
      res.local 'query', req.body.query
      client.search {query: req.body.query, size : 50, indices_boost : { skills : 1.2, titles: 1.5 } }, (err, results, eres) ->
        if !err
          res.local 'hits', results.hits
          res.local 'total', results.total
          res.local 'max_score', results.max_score
          res.local 'isRecruiter', isRecruiter
        else
          console.log "Error en busqueda: "+err
          res.local 'total', 0
        res.render 'buscar'
    else
      res.render 'buscar'

  app.get '/solo-reclutadores', (req, res) ->
    res.render 'solo-reclutadores'

  app.get '/:alias', (req, res) ->
    regexAlias = new RegExp req.params.alias, 'i'
    sessionUser = req.user || false
    isMe = false

    isRecruiter = false
    if(req.loggedIn)
      isRecruiter = req.user.isRecruiter()

    showProfile = (user) ->
      skills = []
      if(sessionUser.id == user.id)
        isMe = true

      if (user.profile[0].skills.length)
        user.profile[0].skills.forEach (skill) ->
          uiSkill =
            id: escape(skill.name)
            auto: skill.auto
            name: skill.name
            level: skill.level
            stars: []
          if(uiSkill.level > 0)
            console.log 'Looking for ranking of skill '+skill.name
            uiSkill.level = skill.level / 100;
          lastLevel = Math.round(uiSkill.level)
          lastLevel = 4 if uiSkill.level > 4
          uiSkill.stars.push 'active' for i in [0..lastLevel]
          uiSkill.stars.push 'inactive' for i in [(lastLevel+1)..4] if i < 5
          # Ignore this skill, it is just a placeholder so user.profile[0].skills is not empty and doesnt throw errors
          if(skill.name != "sgtalento")
            skills.push uiSkill
        skills.sort (a, b) ->
          b.level - a.level

      res.local 'gravatar', crypto.createHash('md5').update(user.email).digest('hex')
      res.local 'person', user
      res.local 'profile', user.profile[0]
      res.local 'isMe', isMe
      res.local 'isRecruiter', isRecruiter
      res.local 'skills', skills

      res.render('profile', { layout : 'layout-profile'});

    User.findOne {'alias':regexAlias}, (err, user) ->
      if !err && user
        if (user.profile.length)
          showProfile user
        else
          res.send 'El usuario '+user.alias+' está registrado pero no ha creado su currículum', 404
      else
        res.send 'No tenemos registrado ningun currículum con ese alias', 404

  return true  # just to finish the setup function

exports.setup = setup