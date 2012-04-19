mongoose = require 'mongoose'

conf = require './conf'
mongoose.connect conf.mongo_url

Schema = mongoose.Schema
ObjectId = Schema.ObjectId

Role = new Schema {
  name: String
  expiration: Date
}

SocialDataSchema = new Schema {
  _user: { type: Schema.ObjectId, ref: UserSchema }
  type: String
  id: String
  collectionDate : { type: Date, default : Date.now }
  data: {}
}

UserSchema = new Schema {
  email: {type: String, index: { unique: true }}
  password: { type: String }
  roles: [Role]
  alias: {type: String, index: { unique: true, sparse: true }}
  profile: [ProfileSchema]
  socialData: [SocialDataSchema]
  created: { type: Date, default : Date.now }
  debugInfo: String
}

UserSchema.method "isRecruiter", ->
  console.log "Checking if "+@email+" isRecruiter"
  result = false
  @roles.forEach (role) ->
    result = true  if role.name is "RECRUITER"
  result

ProfileSchema = new Schema {
  title: String
  firstName:  { type: String, default : 'Sin' }
  lastName:  { type: String, default : 'Nombre' }
  place: String
  url: [String]
  websites: [WebProperty]
  summary: String
  skills: [Skill]
  jobs: [Job]
  educations: [School]
  publications: [Publication]
  engagements:  [Engagement]
  affiliations: [String]
  contact_email: type: String
  contact_phone: String
  showProfile: Boolean
  shareData: Boolean
  hireable: Boolean
}

WebProperty = new Schema {
  name: String
  url: String
}

School = new Schema {
    name: { type: String, unique: true }
    md5: String
}

Company = new Schema {
    name: { type: String, unique: true }
    md5: String
}

Education = new Schema {
    title: String
    summary: String
    start: String # ToDo: Should be a date but currently db has strings so keeping it until we correct the db
    end: String   # ToDo: Should be a date but currently db has strings so keeping it until we correct the db
    place: String
    school: { type: Schema.ObjectId, ref: School }
    skills: [Skill]
}

Job = new Schema {
    title: String
    summary: String
    start: String # ToDo: Should be a date but currently db has strings so keeping it until we correct the db
    end: String   # ToDo: Should be a date but currently db has strings so keeping it until we correct the db
    place: String
    company: { type: Schema.ObjectId, ref: Company }
    skills: [Skill]
}

Engagement = new Schema {
  title: String
  summary: String
  start: Date
  end: Date
  place: String
  url: String
  skills: [Skill]
}

Skill = new Schema {
    name: String
    auto: { type: Boolean, default: false }
    level: Number
}

Publication = new Schema {
    title: String
    url: String
}

DominantSkill = new Schema {
    name: String
    level: Number
}

ServiceLink = new Schema {
type: String
id: String
data: {}
}

Olduser = new Schema {
name: String
slug: { type: String, unique: true }
password: { type: String }
email: { type: String, unique: true }
registered : Boolean
filled : Boolean
role: { type: String }
services: [ServiceLink]
profile: [UserProfile]
created: Date
indexed: Boolean
migrated: { type : Boolean, default : false }
}

UserProfile = new Schema {
title: String
name: String
lastNames: String
place: String
url: [String]
phone: String
summary: String
skills: [Skill]
jobs: [Job]
educations: [School]
affiliations: [String]
publications: [Publication]
shareData: Boolean
}


mongoose.model 'User', UserSchema
mongoose.model 'Profile', ProfileSchema
mongoose.model 'SocialData', SocialDataSchema
mongoose.model 'Olduser', Olduser
# mongoose.model 'DominantSkill', DominantSkill
mongoose.model 'Company', Company
# mongoose.model 'Publication', Publication
mongoose.model 'School', School
# mongoose.model 'Job', Job
# mongoose.model 'Skill', Skill
# mongoose.model 'Education', Education

exports.User = mongoose.model 'User'
exports.Profile = mongoose.model 'Profile'
exports.Olduser = mongoose.model 'Olduser'
exports.SocialData = mongoose.model 'SocialData'
# exports.Company = mongoose.model 'Company'
# exports.Publication = mongoose.model 'Publication'
# exports.School = mongoose.model 'School'
# exports.Job = mongoose.model 'Job'
# exports.Education = mongoose.model 'Education'
# exports.DominantSkill = mongoose.model 'DominantSkill'
