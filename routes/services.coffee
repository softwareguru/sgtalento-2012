OAuth = require('oauth').OAuth
model = require 'model'
conf = require 'conf'

linkedinOAuth = new OAuth(
  'https://api.linkedin.com/uas/oauth/requestToken',
  'https://api.linkedin.com/uas/oauth/accessToken',
  conf.linkedin.key,
  conf.linkedin.secret,
  '1.0',
  null,
  'HMAC-SHA1',
  null,
  {
    Accept: '/'
    Connection: 'close'
    'User-Agent': 'SGCarrera extractor'
    'x-li-format': 'json'
  }
)

setup = (app) ->
  app.get '/interact/self', (req, res) ->
    res.contentType 'application/json'
    person = res.local 'person'

    res.send person if req.loggedIn
    res.send 'Now allowed' if not req.loggedIn

  app.get '/interact/importLinkedin', (req, res) ->
    res.contentType 'application/json'
    person = res.local 'person'
    if req.session.linkedin
      accessToken = req.session.linkedin.accessToken
      accessTokenSecret = req.session.linkedin.accessTokenSecret
      linkedinOAuth.get 'http://api.linkedin.com/v1/people/~:(id,first-name,last-name,headline,location:(name,country:(code)),industry,num-connections,num-connections-capped,summary,specialties,proposal-comments,associations,honors,interests,positions,publications,patents,languages,skills,certifications,educations,three-current-positions,three-past-positions,num-recommenders,recommendations-received,phone-numbers,im-accounts,twitter-accounts,date-of-birth,main-address,member-url-resources,picture-url,site-standard-profile-request:(url),api-standard-profile-request:(url,headers),public-profile-url)', accessToken, accessTokenSecret, (err,data,response) ->
        res.send data if !err
        res.send err if err
    else
      res.send 'Not allowed'

exports.setup = setup