
###
pedrogk
Este código se usó para migrar a los usuarios al nuevo esquema. Lo dejó aquí de referencia.

###

app.get '/migrate1', (req, res) ->
  Olduser.find {}, (err, docs) ->
    docs.forEach (doc) ->
      doc.migrated = false
      doc.save (err) ->
        console.log "Prepare a "+doc.id
  res.render "index"

app.get '/migratedb', (req, res) ->
  console.log "Migrando un grupo ..."
  query = Olduser.find({ migrated : false }).limit(200)
  query.exec (err, oldusers) ->
    oldusers.forEach (x) ->
      console.log "Migrando a: "+x.id+" email: "+x.email

      newuser = new User(
        password: ""
        created: x.created
      )

      newuser.email = x.email.toLowerCase() if x.email
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
            newuser.socialData.push tmpService._id
      newuser.save (err) ->

      x.migrated = true
      x.save (err) ->

  res.render "index"
