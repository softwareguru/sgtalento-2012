model = require("../lib/model")
User = model.User
Olduser = model.Olduser
SocialData = model.SocialData

migrate = ->
  console.log "Voy a buscar oldusers"
  Olduser.find {}, (err, oldusers) ->
    oldusers.forEach (x) ->
      console.log "Migrando a: "+x.email

      newuser = new User(
        password: ""
        created: x.created
      )

      newuser.email = x.email  if x.email
      newuser.alias = x.slug  if x.filled

      if x.role is "RECRUITER"
        tmpRoles = new Array()
        tmpRoles[0] =
          name: "RECRUITER"
          expiration: new Date(2012, 6, 1)

        newuser.roles = tmpRoles

      newuser.profile = new Array()

      if x.profile.length
        tmpProfile =
          title: x.profile[0].title
          firstName: x.profile[0].name
          lastName: x.profile[0].lastNames
          place: x.profile[0].place
          url: x.profile[0].url
          summary: x.profile[0].summary
          skills: x.profile[0].skills
          jobs: x.profile[0].jobs
          educations: x.profile[0].educations
          affiliations: x.profile[0].affiliations
          publications: x.profile[0].publications
          shareData: x.profile[0].compartirDatos
          contact_phone: x.profile[0].phone
          contact_email: x.email

        newuser.profile.push tmpProfile

      newuser.save (err) ->
        console.log "Guarde nuevo user: " + newuser.email  unless err

      newuser.socialData = new Array()
      if x.services
        x.services.forEach (service) ->
          tmpService = new SocialData(
            _user: newuser._id
            type: service.type
            id: service.id
            data: service.data
            collectionDate: x.created
          )
          tmpService.save (err) ->
            console.log "Guarde serviceData y la voy a agregar a user: " + newuser.email  unless err
            newuser.socialData.push tmpService._id
      newuser.save (err) ->
        console.log "Guarde nuevo user: " + newuser.email  unless err

exports.migrate = migrate
