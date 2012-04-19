(function() {

  exports.port = process.env.PORT || 3000;

  exports.secret = process.env.npm_package_config_secret || 'holamundobonito';

  exports.originalMongo = 'mongodb://heroku_app827822:l77qqrd1jl1m7rtqq0lki7t3de@dbh35.mongolab.com:27357/heroku_app827822';

  exports.github = {
    id: process.env.npm_package_config_github_client_id || '11932f2b6d05d2a5fa18',
    secret: process.env.npm_package_config_github_client_secret || '2603d1bc663b74d6732500c1e9ad05b0f4013593'
  };

  exports.facebook = {
    id: process.env.npm_package_config_facebook_client_id || '111565172259433',
    secret: process.env.npm_package_config_facebook_client_secret || '85f7e0a0cc804886180b887c1f04a3c1',
    myHostname: 'http://local.host:3000'
  };

  exports.linkedin = {
    key: process.env.npm_package_config_linkedin_consumer_key || 'pv6AWspODUeHIPNZfA531OYcFyB1v23u3y-KIADJdpyw54BXh-ciiQnduWf6FNRH',
    secret: process.env.npm_package_config_linkedin_consumer_secret || 'Pdx7DCoJRdAk0ai3joXsslZvK1DPCQwsLn-T17Opkae22ZYDP5R7gmAoFes9TNHy'
  };

  exports.twitter = {
    key: process.env.npm_package_config_twitter_consumer_key || 'JLCGyLzuOK1BjnKPKGyQ',
    secret: process.env.npm_package_config_twitter_consumer_secret || 'GNqKfPqtzOcsCtFbGTMqinoATHvBcy1nzCTimeA9M0'
  };

  exports.mongo_url = process.env.npm_package_config_mongo_url || 'mongodb://sgtalento:esegetalent0@localhost:27017/sgtalento_dev';

  exports.elasticsearch = {
    host: process.env.npm_package_config_elasticsearch_host || 'vps2.sg.com.mx',
    port: process.env.npm_package_config_elasticsearch_port || '9200'
  };

  exports.mailer = {
    sender: "SG Talento <soporte.talento@sg.com.mx>",
    user: "soporte.talento@sg.com.mx",
    password: "temistocles"
  };

}).call(this);
