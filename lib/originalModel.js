var mongoose = require('mongoose');
var conf = require('conf');

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var db = mongoose.createConnection(conf.originalMongo);

var School = new Schema({
    name: { type: String, unique: true },
    md5: String
});

var Company = new Schema({
    name: { type: String, unique: true },
    md5: String
});

var Education = new Schema({
    title: String,
    summary: String,
    start: Date,
    end: Date,
    school: String
});

var Job = new Schema({
    title: String,
    summary: String,
    start: Date,
    end: Date,
    company: String
});

var Skill = new Schema({
    name: String,
    auto: { type: Boolean, default: false },
    level: Number
});

var DominantSkill = new Schema({
    name: String,
    level: Number
});

var ServiceLink = new Schema({
    type : String,
    id : String,
    data : {}
});

var Publication = new Schema({
    title: String,
    url: String
});

var User = new Schema({
    slug  : { type: String, unique: true },
    email : { type: String, unique: true },
    registered : Boolean,
    title: String,
    name: String,
    lastNames: String,
    place: String,
    url: [String],
    phone: String,
    summary: String,
    filled: Boolean,
    services : [ServiceLink],
    skills: [Skill],
    jobs: [Job],
    educations: [Education],
    affiliations: [String],
    publications: [Publication],
    created : Date,
    compartirDatos : Boolean
});

db.model('User', User);
db.model('DominantSkill', DominantSkill);
db.model('Company', Company);
db.model('School', School);

//Add exports
exports.User = db.model('User');
exports.DominantSkill = db.model('DominantSkill');
exports.Company = db.model('Company');
exports.School = db.model('School');

