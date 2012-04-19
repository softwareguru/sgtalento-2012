model = require 'model'

auth = require 'auth'
url = require 'url'
ranking = require 'ranking'

User = model.User
UserProfile = model.UserProfile
DominantSkill = model.DominantSkill
Company = model.Company
School = model.School

setup = (app) ->
  app.get '/admin', (req, res) ->

    User.find {role:'RECRUITER', registered:false}, (err, authorizeUsers) ->
      if (!err)
        res.local 'authorizeUsers', authorizeUsers

      User.find {role:'RECRUITER', registered:true}, (err, users) ->
        if (!err)
          res.local 'users', users

        User.count { filled : true }, (err, filled) ->
          if(!err)
            res.local 'filled', filled

          res.render 'admin/index'

  app.get '/admin/authorize/:id', (req, res) ->
    id = req.params.id

    User.findById id, (err, user) ->


      if err
        req.flash 'warning', err 
      else
        user.registered = true
        user.save (err) ->

          if err
            req.flash 'warning', err 
          else
            req.flash 'success', 'El usuario ha sido autorizado'
            
          res.redirect '/admin'

exports.setup = setup