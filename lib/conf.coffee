exports.port = process.env.PORT || 5000
exports.secret = process.env.npm_package_config_secret
exports.originalMongo = 'mongodb://heroku_app827822:l77qqrd1jl1m7rtqq0lki7t3de@dbh35.mongolab.com:27357/heroku_app827822'

exports.github =
  id: process.env.npm_package_config_github_client_id
  secret: process.env.npm_package_config_github_client_secret

exports.facebook =
  id: '111565172259433'
  secret: '85f7e0a0cc804886180b887c1f04a3c1'
  myHostname: 'http://local.host:5000'

exports.linkedin =
  key: process.env.npm_package_config_linkedin_consumer_key
  secret: process.env.npm_package_config_linkedin_consumer_secret

exports.twitter =
  key: process.env.npm_package_config_twitter_consumer_key
  secret: process.env.npm_package_config_twitter_consumer_secret

exports.redis = 
  port: process.env.npm_package_config_redis_port
  host: process.env.npm_package_config_redis_host
  pass: process.env.npm_package_config_redis_pass
  db: process.env.npm_package_config_redis_db

exports.mongo_url = process.env.npm_package_config_mongo_url

exports.elasticsearch =
  host: process.env.npm_package_config_elasticsearch_host
  port: process.env.npm_package_config_elasticsearch_port
