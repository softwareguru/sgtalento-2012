Gettext = require 'node-gettext'
fs = require 'fs'

exports.setupHelpers = (app) ->

  langDir = "#{__dirname}/../messages"
  allowed = ['en', 'es']
  defaultLocale = 'en'

  gt = new Gettext()

  gt.addTextdomain(lang, fs.readFileSync("#{langDir}/#{lang}.mo")) for lang in allowed

  gt.textdomain(defaultLocale)

  currentLocaleFunction = (req, res) ->
    currentLocale = defaultLocale
    if req.locales
      for locale in req.locales
        locale = locale.substring 0, locale.indexOf('-') if '-' in locale
        if locale in allowed
          currentLocale = locale
          break
    currentLocale

  exports.translate = translate = (req, res) ->
    currentLocale = currentLocaleFunction req, res
    
    (s) ->
      gt.dgettext currentLocale, s

  app.dynamicHelpers {
    _: translate
    currentLocale: currentLocaleFunction
  }

