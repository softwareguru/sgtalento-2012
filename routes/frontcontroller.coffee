model = require '../lib/model'
conf = require '../lib/conf'

elastical = require 'elastical'
crypto = require 'crypto'
async = require 'async'

User = model.User
Profile = model.Profile
Role = model.Role

needLogin = [
  '/home',
  '/buscar',
  '/edit',
  '/admin',
  '/recruiter/request'
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

    async.series [
      (callback) ->
        req.user.isWaitingActivation (waiting) ->
          callback null, waiting
      ,
      (callback) ->
        req.user.isRecruiter (recruiter) ->
          callback null, recruiter
    ],
    (err, results) ->
      console.log req.user.email+" isWaiting: "+results[0]+" isRecruiter: "+results[1]

      if(!results[0] && !results[1])
        res.local 'showRequestLink', true

    if(req.user.isAdmin())
      res.local 'isAdmin', true

    res.render 'home'


  app.get '/', (req, res, next) ->
    if req.loggedIn
      res.redirect "/home"
    else
      next()

  app.get '/', (req, res) ->
    res.render "index"

  app.get '/login-profesionistas', (req, res) ->
    res.render "login-profesionistas"

  # recruiter routes
  app.get '/recruiter/request', (req, res) ->
    resultMsg = "Hemos registrado tu petición de ser activado como reclutador."

    async.series [
      (callback) ->
        req.user.isWaitingActivation (waiting) ->
          if (waiting)
            resultMsg = "Actualmente tienes una petición pendiente de autorizar."
          callback null, waiting
      ,
      (callback) ->
        req.user.isRecruiter (recruiter) ->
          if (recruiter)
            resultMsg = "Actualmente estás activo como reclutador, no es necesario reactivarte."
          callback null, recruiter
    ],
    (err, results) ->
      if(!results[0] && !results[1])
        now = new Date()

        tmpRole = new Role(
          _user : req.user._id
          type : "RECRUITER"
        )
        tmpRole.save (err) ->
          if (!err)
            req.user.roles.push tmpRole._id
            req.user.save (err) ->
              if(!err)
                resultMsg = "Hemos registrado tu petición de ser activado como reclutador."

      req.flash 'success', resultMsg
      res.redirect '/home'

  app.get '/buscar', (req, res) ->
    res.local 'query', ''
    res.render 'buscar'

  app.post '/buscar', (req, res) ->
    req.user.isRecruiter (recruiter) ->
      res.local 'isRecruiter', recruiter

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
        else
          console.log "Error en busqueda: "+err
          res.local 'total', 0
        res.render 'buscar'
    else
      res.render 'buscar'

  app.get '/solo-reclutadores', (req, res) ->
    res.render 'solo-reclutadores'

  app.get '/admin', (req, res) ->
    User.count {}, (err, totalUsers) ->
      if(err)
        req.flash 'error', err
        req.redirect '/home'
      else
        res.local 'totalUsers', totalUsers

        Role.find( type : "RECRUITER", expiration : 0).populate('_user').run (err, pendingRoles) ->
          if (err)
            req.flash 'error', err
            req.redirect '/home'
          else
            res.local 'pendingRoles', pendingRoles
            res.render 'admin'



  app.get '/admin/authorize/:id', (req, res) ->
    # Finding the role should be more efficient than finding the user
    # Once we have the role, we populate just in case we need the user info.
    Role.findOne(_user : req.params.id, type : "RECRUITER", expiration : 0).populate('_user').run (err, role) ->
      if err
        console.log "Error en el populate"
        req.flash 'warning', err
        res.redirect '/admin'
      else
        newDate = new Date()
        newDate.setDate(newDate.getDate()+90)
        role.expiration = newDate
        role.save (err) ->
          if !err
            console.log "Active como reclutador a "+ role._user.email
            req.flash 'success', "Se activó exitosamente el rol del usuario"

        res.redirect '/admin'

  app.get '/:alias', (req, res) ->
    console.log "Entrando a ruta de alias: "+req.params.alias
    regexAlias = new RegExp req.params.alias, 'i'
    sessionUser = req.user || false
    isMe = false

    if(req.loggedIn)
      req.user.isRecruiter (recruiter) ->
        res.local 'isRecruiter', recruiter

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
