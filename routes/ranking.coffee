model = require("./model")
http = require("http")
url = require("url")
User = model.User
DominantSkill = model.DominantSkill
Company = model.Company
School = model.School
findService = (user, serviceName) ->
  i = 0

  while i < user.services.length
    return user.services[i]  if user.services[i].type is serviceName
    i++

findSkill = (skills, skillName) ->
  i = 0

  while i < skills.length
    return skills[i]  if skills[i].name is skillName
    i++

storeIfMax = (skill) ->
  DominantSkill.findOne
    name: skill.name
  , (err, foundSkill) ->
    if not err and foundSkill
      if foundSkill.level < skill.level
        foundSkill.level = skill.level
        foundSkill.save (err) ->
          console.log err  if err
    else
      newSkill = new DominantSkill(skill)
      newSkill.save (err) ->
        console.log err  if err

exports.findSkill = findSkill
exports.github = (req, res) ->
  if req.session.auth and req.session.auth.loggedIn
    User.findById req.session.auth.userId, (err, user) ->
      unless err
        globalSkills = []
        service = findService(user, "github")
        if service
          fetchRepos = fetchRepos = (path) ->
            path = path or "/api/v2/json/repos/show/" + service.data.login
            options =
              host: "github.com"
              port: 80
              path: path

            http.get(options, (result) ->
              jsonResult = ""
              result.on "data", (chunk) ->
                jsonResult += chunk

              result.on "end", ->
                next = result.headers["x-next"]
                repos = JSON.parse(jsonResult).repositories
                foundSkill = undefined
                buildProcessLanguage = (last) ->
                  processLanguages = (result) ->
                    skillText = ""
                    result.on "data", (chunk) ->
                      skillText += chunk

                    result.on "end", ->
                      skills = JSON.parse(skillText).languages
                      for skill of skills
                        if skills.hasOwnProperty(skill)
                          foundSkill = findSkill(globalSkills, skill)
                          unless foundSkill
                            foundSkill =
                              name: skill
                              level: skills[skill]

                            globalSkills.push foundSkill
                          else
                            foundSkill.level += skills[skill]
                          storeIfMax foundSkill
                      if last
                        console.log "Got there"
                        profile =
                          name: user.profile[0].name
                          lastNames: user.profile[0].lastNames
                          title: user.profile[0].title
                          phone: user.profile[0].phone
                          summary: user.profile[0].summary
                          url: user.profile[0].url
                          shareData: user.profile[0].shareData
                          jobs: user.profile[0].jobs
                          educations: user.profile[0].educations
                          publications: user.profile[0].publications
                          affiliations: user.profile[0].affiliations
                          skills: globalSkills

                        profiles = []
                        profiles.push profile
                        user.profile = profiles
                        user.save()
                        console.log globalSkills

                currentIndex = 0
                repos.forEach (repo) ->
                  options =
                    host: "github.com"
                    port: 80
                    path: "/api/v2/json/repos/show/" + service.data.login + "/" + repo.name + "/languages"

                  currentIndex++
                  console.log currentIndex
                  console.log repos.length
                  http.get options, buildProcessLanguage(currentIndex is repos.length)

                if next
                  fetchRepos next
                else
                  req.flash "success", "Tus skills estan siendo calculados, regresa en unos segundos"
                  res.redirect "/" + user.slug
            ).on "error", (e) ->
              req.flash "warning", e
              res.redirect user.slug

          fetchRepos()
        else
          req.flash "warning", "No se encontro cuenta de github asociada"
          res.redirect user.slug
      else
        req.flash "warning", err
        res.redirect "/"
  else
    res.redirect "/"
