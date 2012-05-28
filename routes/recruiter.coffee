model = require 'model'

auth = require 'auth'
url = require 'url'
ranking = require 'ranking'
elastical = require 'elastical'
conf = require 'conf'

User = model.User
UserProfile = model.UserProfile
DominantSkill = model.DominantSkill
Company = model.Company
School = model.School

setup = (app) ->

  app.get '/recruiter/denied', (req, res) ->
    res.render 'recruiter/denied'

  app.get '/recruiter/request', (req, res) ->
    now = new Date()

    if(!req.user.isRecruiter())
      tmpRole =
        name: "RECRUITER"
        requestDate: now
      req.user.roles.push tmpRole
      req.user.save (err) ->

    res.render 'home', { message : 'Hemos registrado tu petición de ser activado como reclutador.'}


exports.setup = setup