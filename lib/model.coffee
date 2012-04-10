mongoose = require 'mongoose'
mongooseTypes = require 'mongoose-types'

conf = require 'conf'
mongoose.connect conf.mongo_url
mongooseTypes.loadTypes mongoose

Schema = mongoose.Schema
ObjectId = Schema.ObjectId

#import types
Email  = mongoose.SchemaTypes.Email
Url    = mongoose.SchemaTypes.Url

ServiceLink = new Schema {
  type: String
  id: String
  data: {}
}

Role = new Schema {
  name: String
  expiration: Date
}

User = new Schema {
  email: { type: String, unique: true }
  slug: { type: String, unique: true }
  password: { type: String }
  registered : Boolean
  filled : Boolean
  role: { type: String }
  roles: [Role]
  services: [ServiceLink]
  profile: [UserProfile]
  created: { type: Date, default : Date.now }
  indexed: Boolean
}

UserProfile = new Schema {
  title: String
#  name: { type: String, default : 'Sin' }
#  lastNames: { type: String, default : 'Nombre' }
  firstName:  { type: String, default : 'Sin' }
  lastName:  { type: String, default : 'Nombre' }
  place: String
  url: [String]
  websites: [WebProperty]
  phone: String
  summary: String
  skills: [Skill]
  jobs: [Job]
  educations: [School]
  educationNew: [Education]
  publications: [Publication]
  engagements:  [Engagement]
  affiliations: [String]
  showProfile: Boolean
  shareData: Boolean
  jobStatus: Boolean
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
    start: Date
    end: Date
    place: String
    school: { type: Schema.ObjectId, ref: School }
    skills: [Skill]
}

Job = new Schema {
    title: String
    summary: String
    start: Date
    end: Date
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


mongoose.model 'User', User
mongoose.model 'UserProfile', UserProfile
# mongoose.model 'DominantSkill', DominantSkill
mongoose.model 'Company', Company
# mongoose.model 'Publication', Publication
mongoose.model 'School', School
# mongoose.model 'Job', Job
# mongoose.model 'Skill', Skill
# mongoose.model 'Education', Education

exports.User = mongoose.model 'User'
exports.UserProfile = mongoose.model 'UserProfile'
exports.Company = mongoose.model 'Company'
# exports.Publication = mongoose.model 'Publication'
exports.School = mongoose.model 'School'
# exports.Job = mongoose.model 'Job'
# exports.Education = mongoose.model 'Education'
# exports.DominantSkill = mongoose.model 'DominantSkill'
