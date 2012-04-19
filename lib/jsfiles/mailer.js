var nodemailer = require('nodemailer');
var conf = require('./conf');

var send = function (recipient, subject, messageTxt) {
    var success = true;

    var smtpTransport = nodemailer.createTransport("SMTP",{
        service: "Gmail",
        auth: {
            user: conf.mailer.user,
            pass: conf.mailer.password
        }
    });

// setup e-mail data with unicode symbols
    var mailOptions = {
        from: conf.mailer.sender, // sender address
        to: recipient, // list of receivers
        subject: subject, // Subject line
        text: messageTxt // plaintext body
    }

// send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        } else {
            console.log("Email sent to: "+recipient+". Result: "+response.message);
        }
        smtpTransport.close(); // shut down the connection pool, no more messages
    });

    return success;
};

exports.send = send;
