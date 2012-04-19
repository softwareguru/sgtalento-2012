(function() {
  var Company, School, User, UserProfile, admin, auth, conf, crypto, elastical, findServices, findSkill, fs, indexProfile, model, ranking, recruiter, secured, setup, url,
    __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  auth = require('./auth');

  model = require('./model');

  ranking = require('./ranking');

  recruiter = require('./recruiter');

  admin = require('./admin');

  conf = require('./conf');

  crypto = require('crypto');

  url = require('url');

  elastical = require('elastical');

  fs = require('fs');

  User = model.User;

  UserProfile = model.UserProfile;

  Company = model.Company;

  School = model.School;

  secured = ['/select', '/edit', '/admin', '/recruiter'];

  findSkill = function(skills, skill) {
    var lowerSkills, skillIndex;
    skillIndex = -1;
    if (typeof skills !== 'undefined') {
      lowerSkills = skills.map(function(e) {
        return e.toLowerCase();
      });
      skillIndex = lowerSkills.indexOf(skill.toLowerCase());
    }
    if (skillIndex >= 0) return skills[skillIndex];
  };

  findServices = function(person) {
    var services;
    services = [];
    if (!person.services) return services;
    person.services.forEach(function(service) {
      return services.push(service.type);
    });
    return services;
  };

  indexProfile = function(person) {
    var client, job, options, profile, response, skill;
    client = new elastical.Client(conf.elasticsearch.host);
    response = "";
    profile = {
      firstName: person.profile[0].firstName,
      lastName: person.profile[0].lastName,
      email: person.email,
      title: person.profile[0].title,
      summary: person.profile[0].summary,
      slug: person.slug,
      place: person.profile[0].place,
      skills: (function() {
        var _i, _len, _ref, _results;
        _ref = person.profile[0].skills;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          skill = _ref[_i];
          _results.push(skill.name);
        }
        return _results;
      })(),
      titles: (function() {
        var _i, _len, _ref, _results;
        _ref = person.profile[0].jobs;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          job = _ref[_i];
          _results.push(job.title);
        }
        return _results;
      })()
    };
    options = {
      id: person.slug
    };
    client.index('sgtalento', 'profile', profile, options, function(err, res) {
      if (err) {
        console.log("Errors indexing profile: " + err);
        return false;
      }
      return console.log("Indexed profile " + person.slug + ". Response: " + res);
    });
    return true;
  };

  setup = function(app) {
    app.all('*', function(req, res, next) {
      var person, _ref;
      console.log("Received request. loggedIn is " + req.loggedIn);
      if (!req.loggedIn) req.session.user = null;
      person = req.session.user;
      if ((_ref = req.url, __indexOf.call(secured, _ref) >= 0) && !req.loggedIn) {
        return res.redirect('/');
      } else {
        if (req.loggedIn) {
          return User.findById(req.session.auth.userId, function(err, p) {
            person = p;
            req.session.user = p;
            res.local('person', p);
            if (person.role === 'RECRUITER') {
              if ((!person.registered) && req.url !== '/recruiter/denied') {
                return res.redirect('/recruiter/denied');
              } else if (person.registered && req.url === '/') {
                return res.redirect('/recruiter');
              } else {
                return next();
              }
            } else if (person.role === 'ADMIN') {
              if (req.url === '/') {
                return res.redirect('/admin');
              } else {
                return next();
              }
            } else {
              return next();
            }
          });
        } else {
          return next();
        }
      }
    });
    app.get('/', function(req, res, next) {
      var person;
      if (req.loggedIn) {
        person = res.local('person');
        if (person.registered) {
          if (person.filled) {
            return res.redirect("/" + person.slug);
          } else {
            return res.redirect("/edit");
          }
        } else {
          return res.redirect('/select');
        }
      } else {
        return next();
      }
    });
    app.get('/', function(req, res) {
      return res.render('home');
    });
    app.get('/login-profesionistas', function(req, res) {
      return res.render('login-profesionistas');
    });
    app.get('/select', function(req, res) {
      return res.render('select');
    });
    app.get('/edit', function(req, res) {
      var person, profile, services;
      person = res.local('person');
      profile = person.profile[0] || {};
      services = findServices(person);
      res.local('person', person);
      res.local('styles', ['/styles/css/validationEngine.jquery.css']);
      res.local('scripts', ['/scripts/coffee/edit.js']);
      res.local('hasLinkedin', __indexOf.call(services, 'linkedin') >= 0);
      res.local('skills', profile.skills || []);
      res.local('isMe', true);
      return res.render('edit', {
        layout: 'layout-profile'
      });
    });
    app.post('/edit', function(req, res) {
      var affiliations, jobs, person, publications, schools;
      person = res.local('person');
      jobs = [];
      schools = [];
      publications = [];
      affiliations = [];
      return User.findById(req.session.auth.userId, function(err, user) {
        var addAffiliation, addPublication, affiliationId, formPerson, formProfile, jobId, numAffiliations, numJobs, numPublications, numSchools, preprocessSelfSkill, processJob, processSchool, processSelfSkill, profile, profiles, publicationId, schoolId, skill, skills, _i, _j, _len, _len2, _ref, _ref2;
        formProfile = req.body.profile;
        formPerson = req.body.person;
        profile = {};
        skills = [];
        if (typeof user.profile[0].skills !== 'undefined') {
          skills = user.profile[0].skills;
        }
        preprocessSelfSkill = function(skill) {
          if (req.body.selfSkills) {
            if (skill.auto && req.body.selfSkills.tags.indexOf(skill.name) < 0) {
              return user.skills.remove(skill);
            }
          } else {
            if (skill.auto) return user.skills.remove(skill);
          }
        };
        processSelfSkill = function(skillTag) {
          var saidSkill;
          if (!findSkill(user.skills, skillTag)) {
            saidSkill = {
              name: skillTag,
              auto: true,
              level: 0
            };
            console.log("Haciendo push a skills de " + saidSkill.name + " : " + saidSkill.level);
            return skills.push(saidSkill);
          }
        };
        if (user.skills) {
          _ref = user.skills;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            skill = _ref[_i];
            preprocessSelfSkill(skill);
          }
        }
        numJobs = req.body.numJobs || 0;
        numSchools = req.body.numSchools || 0;
        numPublications = req.body.numPublications || 0;
        numAffiliations = req.body.numAffiliations || 0;
        user.slug = formPerson.slug;
        profile.firstName = formProfile.firstName;
        profile.lastName = formProfile.lastName;
        profile.title = formProfile.title;
        profile.phone = formProfile.phone;
        profile.summary = formProfile.summary;
        profile.place = formProfile.place;
        profile.url = [formProfile.url];
        profile.shareData = false;
        if (formProfile.shareData) profile.shareData = true;
        if (req.body.selfSkills) {
          _ref2 = req.body.selfSkills.tags;
          for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
            skill = _ref2[_j];
            processSelfSkill(skill);
          }
        }
        profile.skills = skills;
        processJob = function(id) {
          var job, theCompany;
          job = req.body["job" + id];
          if (job) {
            theCompany = new Company({
              name: job.company,
              md5: crypto.createHash('md5').update(job.company).digest('hex')
            });
            theCompany.save();
            return jobs.push(job);
          }
        };
        for (jobId = 1; 1 <= numJobs ? jobId <= numJobs : jobId >= numJobs; 1 <= numJobs ? jobId++ : jobId--) {
          processJob(jobId);
        }
        profile.jobs = jobs;
        processSchool = function(id) {
          var school, theSchool;
          school = req.body["school" + id];
          if (school) {
            theSchool = new School({
              name: school.school,
              md5: crypto.createHash('md5').update(school.school).digest('hex')
            });
            theSchool.save();
            return schools.push(school);
          }
        };
        for (schoolId = 1; 1 <= numSchools ? schoolId <= numSchools : schoolId >= numSchools; 1 <= numSchools ? schoolId++ : schoolId--) {
          processSchool(schoolId);
        }
        profile.educations = schools;
        addPublication = function(id) {
          var publication;
          publication = req.body["publication" + id];
          if (publication) return publications.push(publication);
        };
        for (publicationId = 1; 1 <= numPublications ? publicationId <= numPublications : publicationId >= numPublications; 1 <= numPublications ? publicationId++ : publicationId--) {
          addPublication(publicationId);
        }
        profile.publications = publications;
        addAffiliation = function(id) {
          var affiliation;
          affiliation = req.body["affiliation" + id];
          if (affiliation) return affiliations.push(affiliation);
        };
        for (affiliationId = 1; 1 <= numAffiliations ? affiliationId <= numAffiliations : affiliationId >= numAffiliations; 1 <= numAffiliations ? affiliationId++ : affiliationId--) {
          addAffiliation(affiliationId);
        }
        profile.affiliations = affiliations;
        profiles = [profile];
        user.filled = true;
        user.profile = profiles;
        if (!user.role || user.role === "") {
          user.role = "CANDIDATE";
          user.indexed = false;
        }
        if (indexProfile(user)) user.indexed = true;
        return user.save(function(err) {
          if (!err) {
            req.flash('success', 'Tus datos se han guardado exitosamente');
            return res.redirect("/" + user.slug);
          } else {
            req.flash('warning', err);
            return res.redirect('edit');
          }
        });
      });
    });
    app.get('/edit/skills', ranking.github);
    app.get('/delete', function(req, res) {
      res.local('scripts', ['/scripts/coffee/delete.js']);
      res.local('isMe', true);
      return res.render('delete', {
        layout: 'layout-profile'
      });
    });
    app.get('/delete/confirm', function(req, res) {
      if (req.session.auth && req.session.auth.loggedIn) {
        return User.findById(req.session.auth.userId, function(err, user) {
          if (!err && user) {
            user.remove();
            req.session.destroy();
          }
          return res.redirect('/');
        });
      }
    });
    app.get('/privacidad', function(req, res) {
      return res.render('privacidad');
    });
    recruiter.setup(app);
    admin.setup(app);
    app.get('/:slug/badge', function(req, res) {
      var regexSlug;
      regexSlug = new RegExp(req.params.slug, 'i');
      return User.findOne({
        'slug': regexSlug
      }, function(err, user) {
        if (!err && user) {
          res.local('person', user);
          return res.render('badge', {
            layout: false
          });
        } else {
          return res.send('Aun no tenemos registro a nadie con ese username', 404);
        }
      });
    });
    app.get('/:slug/index', function(req, res) {
      var regexSlug;
      regexSlug = new RegExp(req.params.slug, 'i');
      return User.findOne({
        'slug': regexSlug
      }, function(err, user) {
        if (!err && user) {
          if (indexProfile(user)) {
            user.indexed = true;
            user.save(function(err) {
              if (!err) {
                return console.log('Success: Prendimos bandera indexed a ' + user.slug);
              } else {
                return console.log('Error: No pudimos prender bandera indexed a ' + user.slug);
              }
            });
            return res.send('Hemos indexado a ' + user.slug);
          }
        } else {
          return res.send('Aun no tenemos registrado a nadie con ese username', 404);
        }
      });
    });
    return app.get('/:slug', function(req, res) {
      var isMe, isRecruiter, regexSlug, sessionUser, showUser, skills, skillsUniverse;
      regexSlug = new RegExp(req.params.slug, 'i');
      sessionUser = res.local('person');
      isMe = false;
      isRecruiter = false;
      skills = [];
      skillsUniverse = [];
      showUser = function(user) {
        var needsServices, service, services, totalServices;
        if (typeof sessionUser !== 'undefined') {
          if (sessionUser.slug === user.slug) isMe = true;
          if (sessionUser.role === "RECRUITER") isRecruiter = true;
        }
        if (typeof user.profile[0].skills !== 'undefined') {
          user.profile[0].skills.forEach(function(skill) {
            var i, lastLevel, uiSkill, _ref;
            uiSkill = {
              id: escape(skill.name),
              auto: skill.auto,
              name: skill.name,
              level: skill.level,
              stars: []
            };
            if (uiSkill.level > 0) {
              console.log('Looking for ranking of skill ' + skill.name);
              uiSkill.level = skill.level / 100;
            }
            lastLevel = Math.round(uiSkill.level);
            if (uiSkill.level > 4) lastLevel = 4;
            for (i = 0; 0 <= lastLevel ? i <= lastLevel : i >= lastLevel; 0 <= lastLevel ? i++ : i--) {
              uiSkill.stars.push('active');
            }
            if (i < 5) {
              for (i = _ref = lastLevel + 1; _ref <= 4 ? i <= 4 : i >= 4; _ref <= 4 ? i++ : i--) {
                uiSkill.stars.push('inactive');
              }
            }
            if (skill.name !== "sgtalento") return skills.push(uiSkill);
          });
          skills.sort(function(a, b) {
            return b.level - a.level;
          });
        }
        services = findServices(user);
        totalServices = ['linkedin', 'github', 'facebook', 'twitter'];
        needsServices = (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = totalServices.length; _i < _len; _i++) {
            service = totalServices[_i];
            if (!(__indexOf.call(services, service) >= 0)) _results.push(service);
          }
          return _results;
        })();
        res.local('scripts', ['/scripts/coffee/profile.js']);
        res.local('gravatar', crypto.createHash('md5').update(user.email).digest('hex'));
        res.local('person', user);
        res.local('profile', user.profile[0]);
        res.local('isMe', isMe);
        res.local('isRecruiter', isRecruiter);
        res.local('needsServices', needsServices);
        res.local('skills', skills);
        return res.render('profile', {
          layout: 'layout-profile'
        });
      };
      return User.findOne({
        'slug': regexSlug
      }, function(err, user) {
        if (!err && user) {
          if (user.filled) {
            return showUser(user);
          } else {
            return res.send('El usuario ' + user.slug + ' está registrado pero no ha creado su currículum', 404);
          }
        } else {
          return res.send('Aun no tenemos registro a nadie con ese username', 404);
        }
      });
    });
  };

  exports.setup = setup;

}).call(this);
