var model = require('./model');

var http = require('http');
var url = require('url');

var User = model.User;
var DominantSkill = model.DominantSkill;
var Company = model.Company;
var School = model.School;

var findService = function(user, serviceName) {
    for(var i = 0; i < user.services.length; i++) {
        if(user.services[i].type == serviceName) {
            return user.services[i];
        }
    }
};

var findSkill = function(skills, skillName) {
    for(var i = 0; i < skills.length; i++) {
        if(skills[i].name == skillName) {
            return skills[i];
        }
    }
};

var storeIfMax = function(skill) {
    DominantSkill.findOne({name:skill.name}, function(err,foundSkill) {
        if(!err && foundSkill) {
            if(foundSkill.level < skill.level) {
                foundSkill.level = skill.level;
                foundSkill.save(function(err) {
                    if(err) {
                        console.log(err);
                    }
                });
            }
        } else {
            var newSkill = new DominantSkill(skill);
            newSkill.save(function(err) {
                if(err) {
                    console.log(err);
                }
            });
        }
    });
};

exports.findSkill = findSkill;
exports.github = function(req, res) {
        if(req.session.auth && req.session.auth.loggedIn) {
            User.findById(req.session.auth.userId, function(err,user) {
                if(!err) {
                    var globalSkills = [];
                    var service = findService(user, 'github');

                    if(service) {
                        var fetchRepos = function fetchRepos(path) {
                            path = path || '/api/v2/json/repos/show/' + service.data.login;


                            var options = {
                                host: 'github.com',
                                port: 80,
                                path: path
                            };

                            http.get(options, function(result) {
                                var jsonResult = '';
                                result.on('data', function(chunk) {
                                    jsonResult += chunk;
                                });
                                result.on('end', function() {
                                    var next = result.headers['x-next'];
                                    var repos = JSON.parse(jsonResult).repositories;
                                    var foundSkill;
                                    var buildProcessLanguage = function(last) {

                                        return processLanguages = function(result) {
                                            var skillText = '';
                                            result.on('data', function(chunk) {
                                                skillText += chunk;
                                            });
                                            result.on('end', function() {
                                                var skills = JSON.parse(skillText).languages;
                                                for(var skill in skills) {
                                                    if(skills.hasOwnProperty(skill)) {
                                                        foundSkill = findSkill(globalSkills, skill);
                                                        if(!foundSkill) {
                                                            foundSkill = {
                                                                name: skill,
                                                                level: skills[skill]
                                                            };
                                                            globalSkills.push(foundSkill);
                                                        } else {
                                                            foundSkill.level += skills[skill];
                                                        }
                                                        storeIfMax(foundSkill);
                                                    }
                                                }
                                            
                                                if(last) {
                                                    console.log("Got there");
                                                    profile = {
                                                        name: user.profile[0].name,
                                                        lastNames: user.profile[0].lastNames,
                                                        title: user.profile[0].title,
                                                        phone: user.profile[0].phone,
                                                        summary: user.profile[0].summary,
                                                        url: user.profile[0].url,
                                                        shareData: user.profile[0].shareData,
                                                        jobs: user.profile[0].jobs,
                                                        educations: user.profile[0].educations,
                                                        publications: user.profile[0].publications,
                                                        affiliations: user.profile[0].affiliations,
                                                        skills: globalSkills
                                                    };
                                                    var profiles = [];
                                                    profiles.push(profile);
                                                    user.profile = profiles;
                                                    user.save();
                                                    console.log(globalSkills);
                                                }
                                                
                                            });
                                        };
                                    }

                                    var currentIndex = 0;
                                    repos.forEach(function(repo) {
                                        //if(!repo.fork) {
                                            var options = {
                                                host: 'github.com',
                                                port: 80,
                                                path: '/api/v2/json/repos/show/' + service.data.login + '/' + repo.name + '/languages'
                                            };
                                            currentIndex++;
                                            console.log(currentIndex);
                                            console.log(repos.length);
                                            http.get(options, buildProcessLanguage(currentIndex == repos.length));
                                        //}
                                    });

                                    if(next) {
                                        fetchRepos(next);
                                    } else {
                                        req.flash('success', 'Tus skills estan siendo calculados, regresa en unos segundos');
                                        
                                        res.redirect("/" + user.slug);
                                    }

                                });
                            }).on('error', function(e) {
                                req.flash('warning', e);
                                res.redirect(user.slug);
                            });
                        };

                        fetchRepos();

                    } else {
                        req.flash('warning', 'No se encontro cuenta de github asociada');
                        res.redirect(user.slug);
                    }
                } else {
                    req.flash('warning', err);
                    res.redirect('/');
                }
            });
        } else {
            res.redirect('/');
        }

        

    }