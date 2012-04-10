model = require 'model'

auth = require 'auth'
crypto = require 'crypto'
url = require 'url'
ranking = require 'ranking'
recruiter = require 'recruiter'
admin = require 'admin'
conf = require 'conf'
elastical = require 'elastical'
fs = require 'fs'

User = model.User
UserProfile = model.UserProfile
Company = model.Company
School = model.School

secured = [
  '/select',
  '/edit',
  '/admin',
  '/recruiter'
]

findSkill = (skills, skill) ->
  skillIndex = -1
  if(typeof(skills) != 'undefined')
    lowerSkills = skills.map (e) -> e.toLowerCase()
    skillIndex = lowerSkills.indexOf skill.toLowerCase()
  skills[skillIndex] if skillIndex >= 0


findServices = (person) ->
  services = []
  if not person.services
    return services
  person.services.forEach (service) ->
    services.push service.type
  services

indexProfile = (person) ->
  client = new elastical.Client(conf.elasticsearch.host)
  response = ""
  profile = {
    firstName: person.profile[0].firstName
    lastName: person.profile[0].lastName
    email: person.email
    title: person.profile[0].title
    summary: person.profile[0].summary
    slug: person.slug
    place: person.profile[0].place
    skills: skill.name for skill in person.profile[0].skills
    titles: job.title for job in person.profile[0].jobs
  }
  options = {
    id: person.slug
  }
  client.index 'sgtalento', 'profile', profile, options, (err, res) ->
    if (err)
      console.log "Errors indexing profile: "+err
      return false
    console.log "Indexed profile "+person.slug+". Response: "+res
  true

setup = (app) ->
  app.all '*', (req, res, next) ->
    console.log "Received request. loggedIn is "+req.loggedIn
    req.session.user = null if not req.loggedIn
    person = req.session.user

    if req.url in secured and !req.loggedIn
      res.redirect '/'
    else
      if req.loggedIn
        User.findById req.session.auth.userId, (err, p) ->
          person = p
          req.session.user = p
          res.local 'person', p
          if person.role == 'RECRUITER'
            if (not person.registered) and req.url != '/recruiter/denied'
              res.redirect '/recruiter/denied'
            else if person.registered and req.url == '/'
              res.redirect '/recruiter'
            else
              next()
          else if person.role == 'ADMIN'
            if req.url == '/'
              res.redirect '/admin'
            else
              next()
          else
            next()
      else
        next()


  app.get '/', (req, res, next) ->
    if req.loggedIn
      person = res.local 'person'
      if person.registered
        if person.filled
          res.redirect "/#{person.slug}"
        else
          res.redirect "/edit"
      else
        res.redirect '/select'
    else
      next()

  app.get '/', (req, res) ->
    res.render 'home'

  app.get '/login-profesionistas', (req, res) ->
    res.render 'login-profesionistas'

  app.get '/select', (req, res) ->
    res.render('select');

  
  app.get '/edit', (req, res) ->
    person = res.local 'person'
    profile = person.profile[0] || {}
    services = findServices(person)

    res.local 'person', person
    res.local 'styles', ['/styles/css/validationEngine.jquery.css']
    res.local 'scripts', ['/scripts/coffee/edit.js']
    res.local 'hasLinkedin', 'linkedin' in services
    res.local 'skills', profile.skills || []
    res.local 'isMe', true

    res.render('edit', { layout : 'layout-profile' });

  app.post '/edit', (req, res) ->
    person = res.local 'person'
    
    jobs = []
    schools = []
    publications = []
    affiliations = []

    User.findById req.session.auth.userId, (err, user) ->
      formProfile = req.body.profile
      formPerson = req.body.person
      profile = {}

      skills = []
#      skills = user.profile[0].skills or [] if user.profile and user.profile[0]
      if(typeof(user.profile[0].skills) != 'undefined')
        skills = user.profile[0].skills

      preprocessSelfSkill = (skill) ->
        #If the use has self skills
        #Remove from the list so it can be added again
        if req.body.selfSkills
          if skill.auto && req.body.selfSkills.tags.indexOf(skill.name) < 0
            user.skills.remove skill
        else
          if skill.auto
            user.skills.remove skill

      processSelfSkill = (skillTag) ->
        if !findSkill(user.skills, skillTag)
          saidSkill =
            name: skillTag
            auto: true
            level: 0
          console.log "Haciendo push a skills de "+saidSkill.name+" : "+saidSkill.level
          skills.push saidSkill

      preprocessSelfSkill skill for skill in user.skills if user.skills

      numJobs = req.body.numJobs || 0
      numSchools = req.body.numSchools || 0
      numPublications = req.body.numPublications || 0
      numAffiliations = req.body.numAffiliations || 0

      user.slug = formPerson.slug

      profile.firstName = formProfile.firstName
      profile.lastName = formProfile.lastName
      profile.title = formProfile.title
      profile.phone = formProfile.phone
      profile.summary = formProfile.summary
      profile.place = formProfile.place
      profile.url = [formProfile.url]
      profile.shareData = false
      profile.shareData = true if formProfile.shareData


      processSelfSkill skill for skill in req.body.selfSkills.tags if req.body.selfSkills
      profile.skills = skills

      processJob = (id) ->
        job = req.body["job#{id}"]
        if job
          theCompany = new Company({
            name: job.company
            md5: crypto.createHash('md5').update(job.company).digest('hex')
          })
          theCompany.save()
          jobs.push job

      processJob jobId for jobId in [1..numJobs]
      profile.jobs = jobs

      processSchool = (id) ->
        school = req.body["school#{id}"]
        if school
          theSchool = new School({
            name: school.school
            md5: crypto.createHash('md5').update(school.school).digest('hex')
          })
          theSchool.save()
          schools.push school

      processSchool schoolId for schoolId in [1..numSchools]
      profile.educations = schools

      addPublication = (id) ->
        publication = req.body["publication#{id}"]
        if publication
          publications.push publication

      addPublication publicationId for publicationId in [1..numPublications]
      profile.publications = publications

      addAffiliation = (id) ->
        affiliation = req.body["affiliation#{id}"]
        if affiliation
          affiliations.push affiliation

      addAffiliation affiliationId for affiliationId in [1..numAffiliations]
      profile.affiliations = affiliations

      profiles = [profile]

      user.filled = true
      user.profile = profiles

      if(!user.role || user.role == "")
        user.role = "CANDIDATE"
        user.indexed = false

      if indexProfile user
        user.indexed = true

      user.save (err) ->

        if !err 
          req.flash 'success', 'Tus datos se han guardado exitosamente'
          res.redirect "/#{user.slug}"
        else
          req.flash 'warning', err
          res.redirect 'edit'

  app.get '/edit/skills', ranking.github

  app.get '/delete', (req, res) ->
    res.local 'scripts', ['/scripts/coffee/delete.js']
    res.local 'isMe', true
    res.render('delete', { layout : 'layout-profile'} );
    

  app.get '/delete/confirm', (req, res) ->
    if req.session.auth && req.session.auth.loggedIn
      User.findById req.session.auth.userId, (err,user) ->
        if !err && user
          user.remove()
          req.session.destroy()
        res.redirect '/'

  app.get '/privacidad', (req, res) ->
    res.render('privacidad');

  recruiter.setup app
  admin.setup app

  app.get '/:slug/badge', (req, res) ->
    regexSlug = new RegExp req.params.slug, 'i'

    User.findOne {'slug':regexSlug, }, (err, user) ->
      if !err && user
        res.local 'person', user
        res.render 'badge', {layout: false}
      else
        res.send 'Aun no tenemos registro a nadie con ese username', 404


  app.get '/:slug/index', (req, res) ->
    regexSlug = new RegExp req.params.slug, 'i'

    User.findOne {'slug':regexSlug}, (err, user) ->
      if !err && user
        if(indexProfile user)
          user.indexed = true
          user.save (err) ->
            if !err
              console.log 'Success: Prendimos bandera indexed a '+user.slug
            else
              console.log 'Error: No pudimos prender bandera indexed a '+user.slug
          res.send 'Hemos indexado a '+user.slug
      else
        res.send 'Aun no tenemos registrado a nadie con ese username', 404


  app.get '/:slug', (req, res) ->
    regexSlug = new RegExp req.params.slug, 'i'
    sessionUser = res.local 'person'
    isMe = false
    isRecruiter = false

    skills = []
    skillsUniverse = []

    showUser = (user) ->
      if (typeof(sessionUser) != 'undefined')
        if(sessionUser.slug == user.slug)
          isMe = true
        if(sessionUser.role == "RECRUITER")
          isRecruiter = true

      if (typeof(user.profile[0].skills) != 'undefined')
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

      services = findServices(user)
      totalServices = ['linkedin', 'github', 'facebook', 'twitter']
      needsServices = (service for service in totalServices when not (service in services))

      res.local 'scripts', ['/scripts/coffee/profile.js']
      res.local 'gravatar', crypto.createHash('md5').update(user.email).digest('hex')
      res.local 'person', user
      res.local 'profile', user.profile[0]
      res.local 'isMe', isMe
      res.local 'isRecruiter', isRecruiter
      res.local 'needsServices', needsServices
      res.local 'skills', skills

      res.render('profile', { layout : 'layout-profile'});

    User.findOne {'slug':regexSlug}, (err, user) ->
      if !err && user
        if (user.filled)
          showUser user
        else
          res.send 'El usuario '+user.slug+' está registrado pero no ha creado su currículum', 404
      else
        res.send 'Aun no tenemos registro a nadie con ese username', 404

exports.setup = setup