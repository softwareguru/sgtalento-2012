nodemailer = require("nodemailer")
conf = require("./conf")
send = (recipient, subject, messageTxt) ->
  success = true
  smtpTransport = nodemailer.createTransport("SMTP",
    service: "Gmail"
    auth:
      user: conf.mailer.user
      pass: conf.mailer.password
  )
  mailOptions =
    from: conf.mailer.sender
    to: recipient
    subject: subject
    text: messageTxt

  smtpTransport.sendMail mailOptions, (error, response) ->
    if error
      console.log error
    else
      console.log "Email sent to: " + recipient + ". Result: " + response.message
    smtpTransport.close()

  success

exports.send = send
