/**
 * Entities model
 * Originally developed by iamedu
 * Last refactored by pedrogk
 */
var mongoose = require('mongoose');
var mongooseTypes = require('mongoose-types');
var conf = require('./conf');

mongoose.connect(conf.mongo_url);
mongooseTypes.loadTypes(mongoose);

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Email = mongoose.SchemaTypes.Email;
var Url = mongoose.SchemaTypes.Url;

ServiceLink = new Schema({
    type: String,
    id: String,
    data: {}
});

User = new Schema({
    name: String,
    slug: {
        type: String,
        unique: true
    },
    password: {
        type: String
    },
    email: {
        type: String,
        unique: true
    },
    registered: Boolean,
    filled: Boolean,
    role: {
        type: String
    },
    services: [ServiceLink],
    profile: [UserProfile],
    created: Date,
    indexed: Boolean
});

UserProfile = new Schema({
    title: String,
    name: String,
    lastNames: String,
    place: String,
    url: [String],
    phone: String,
    summary: String,
    skills: [Skill],
    jobs: [Job],
    educations: [School],
    affiliations: [String],
    publications: [Publication],
    shareData: Boolean
});

School = new Schema({
    name: {
        type: String,
        unique: true
    },
    md5: String
});

Company = new Schema({
    name: {
        type: String,
        unique: true
    },
    md5: String
});

Education = new Schema({
    title: String,
    summary: String,
    start: Date,
    end: Date,
    school: String
});

Job = new Schema({
    title: String,
    summary: String,
    start: Date,
    end: Date,
    company: String
});

Skill = new Schema({
    name: String,
    auto: {
        type: Boolean,
        "default": false
    },
    level: Number
});

Publication = new Schema({
    title: String,
    url: String
});

DominantSkill = new Schema({
    name: String,
    level: Number
});

User2 = new Schema({
    slug: {
        type: String,
        unique: true
    },
    email: {
        type: String,
        unique: true
    },
    registered: Boolean,
    title: String,
    name: String,
    lastNames: String,
    place: String,
    url: [String],
    phone: String,
    summary: String,
    filled: Boolean,
    services: [ServiceLink],
    skills: [Skill],
    jobs: [Job],
    educations: [Education],
    affiliations: [String],
    publications: [Publication],
    created: Date,
    compartirDatos: Boolean
});

mongoose.model('User', User);
mongoose.model('UserProfile', UserProfile);
mongoose.model('DominantSkill', DominantSkill);
mongoose.model('Company', Company);
mongoose.model('Publication', Publication);
mongoose.model('School', School);
mongoose.model('Skill', Skill);
mongoose.model('User2', User2);

exports.User = mongoose.model('User');
exports.UserProfile = mongoose.model('UserProfile');
exports.DominantSkill = mongoose.model('DominantSkill');
exports.Company = mongoose.model('Company');
exports.Publication = mongoose.model('Publication');
exports.School = mongoose.model('School');
exports.User2 = mongoose.model('User2');
