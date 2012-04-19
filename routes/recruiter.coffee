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

  app.get '/recruiter', (req, res) ->
    res.local 'query', ''
    res.render 'recruiter/index' 
      
  app.post '/recruiter', (req, res) ->
    res.local 'query', ''
    client = new elastical.Client(conf.elasticsearch.host)
    #eres is the elastic response
    if req.body.query
      res.local 'query', req.body.query
      client.search {query: req.body.query, size : 40, indices_boost : { skills : 1.2, titles: 1.5 } }, (err, results, eres) ->
        console.log eres
        console.log results
        if !err
          res.local 'hits', results.hits
          res.local 'total', results.total
          res.local 'max_score', results.max_score
        res.render 'recruiter/index'
    else
      res.render 'recruiter/index'    

  

exports.setup = setup