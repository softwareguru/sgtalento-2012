exports.port = process.env.PORT || 3000
exports.secret = process.env.npm_package_config_secret || 'misecreto'

exports.github =
  id: process.env.npm_package_config_github_client_id
  secret: process.env.npm_package_config_github_client_secret

exports.facebook =
  id: process.env.npm_package_config_facebook_client_id
  secret: process.env.npm_package_config_facebook_client_secret
  myHostname: 'http://talento.sg.com.mx'

exports.linkedin =
  key: process.env.npm_package_config_linkedin_consumer_key
  secret: process.env.npm_package_config_linkedin_consumer_secret

exports.twitter =
  key: process.env.npm_package_config_twitter_consumer_key 
  secret: process.env.npm_package_config_twitter_consumer_secret 

exports.mongo_url = process.env.npm_package_config_mongo_url 

exports.elasticsearch =
  host: process.env.npm_package_config_elasticsearch_host 
  port: process.env.npm_package_config_elasticsearch_port 

exports.mailer =
  sender: "SG Talento <soporte.talento@sg.com.mx>"
  user: "soporte.talento@sg.com.mx"
  password: "elpassword"

