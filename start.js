var forever = require('forever');

var child = forever.start([ 'npm', 'start' ], {
    forever : true,
    max : 1,
    silent : false,
    logFile : '/home/sgtalento/sgtalento/logs/forever.log',
    outFile : '/home/sgtalento/sgtalento/logs/app.log',
    errFile : '/home/sgtalento/sgtalento/logs/err.log'
});

