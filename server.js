var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var util = require('util');
var formidable = require('formidable');
var shortid = require('shortid');
var ffmpeg = require('./ffmpeg');
var os = require("os");
var url = require('url');
var automatic = require('./automatic');
var config = require('./configuration');
var winston = require('winston');
var db = require('./db');
var manualVideoGenerator = require('./manualVideoGenerator');

var performanceLogger = new(winston.Logger)({
    transports: [
      new(winston.transports.File)({
            filename: config.PERFORMANCE_LOG_PATH,
            maxsize: 1000,
            json: false,
            prettyPrint: true
        })
    ]
});

winston.add(winston.transports.File, {
    filename: config.LOG_PATH,
    maxsize: 10000000,
    json: false,
    prettyPrint: true
});

app.use(express.static(path.join(__dirname, 'public')));

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync('./public/uploads/' + req.id)) {
            fs.mkdirSync('./public/uploads/' + req.id);
        }
        cb(null, './public/uploads/' + req.id)
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

var upload = multer({
    storage: storage
})

app.post('/manualgen', function (req, res) {

    winston.info('server::manualgen');

    var form = new formidable.IncomingForm();

    var newFolderName = shortid.generate();

    var video;

    if (fs.existsSync('./workshop/' + newFolderName)) {
        //create new newFolderName..
    } else {
        fs.mkdirSync('./workshop/' + newFolderName);
    }

    form.uploadDir = './workshop/' + newFolderName;

    form.on('file', function (name, file) {
        winston.info('+++----+++');
        winston.info('file.path is: ' + file.path);
        winston.info('file.name is: ' + file.name);
        winston.info('+++----+++');
        fs.rename(file.path, form.uploadDir + "/" + file.name);
    });

    form.on('field', function (name, value) {
        video = JSON.parse(value);
    });

    form.parse(req);

    form.on('end', function () {

        video.info.tempFolder = newFolderName;
        
        db.Video.newVideo(video)
            .then((newVideo) => {

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(newVideo));

                manualVideoGenerator.generate(newVideo)
                    .then((res) => updateClient2(res));
            });

    });

    function updateClient2(message) {
        winston.info('server::autogen::updateClientandDB:: message = ' + util.inspect(message));

        io.sockets.emit('update', message);
    }
})

/*
Deprecated. use manualgen instead
*/
app.post('/test', function (req, res) {
    winston.info('-----mmmmm------server');
    var form = new formidable.IncomingForm();
    var newFolderName = shortid.generate();
    var data;
    if (fs.existsSync('./workshop/' + newFolderName)) {
        //create new newFolderName..
    } else {
        fs.mkdirSync('./workshop/' + newFolderName);
    }

    form.uploadDir = './workshop/' + newFolderName;

    form.on('file', function (name, file) {
        winston.info('+++----+++');
        winston.info('file.path is: ' + file.path);
        winston.info('file.name is: ' + file.name);
        winston.info('+++----+++');
        fs.rename(file.path, form.uploadDir + "/" + file.name);
    });
    form.on('field', function (name, value) {
        data = JSON.parse(value);
    });

    form.parse(req);

    form.on('end', function () {
        //start process the files
        winston.info("end uploading");
        ffmpeg.createCustom(data, newFolderName).then((result) => {
            res.end(result);
        });


    });
})

app.get('/res/videos/all', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    db.Video.getAll()
        .then((list) => {
            res.end(JSON.stringify(list));
        })
})

app.get('/autogen', function (req, res) {

    var timeLogger_autogen = performanceLogger.startTimer();

    var phrase = url.parse(req.url, true).query.q;

    winston.info('app.get::phrase is ' + phrase);

    db.Video.newByPhrase(phrase)
        .then((newVideo) => {

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(newVideo));

            timeLogger_autogen.done("server::autogen:: ack");

            automatic.generate(newVideo)
                .then((res) => updateClient(res));
        });

    function updateClient(message) {
        winston.info('server::autogen::updateClientandDB:: message = ' + util.inspect(message));

        io.sockets.emit('update', message);
    }

    var formatDate = function (date) {
        var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
        ];

        var day = date.getDate();
        var monthIndex = date.getMonth();
        var year = date.getFullYear();

        return day + ' ' + monthNames[monthIndex] + ' ' + year;
    }


})

app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

var server = server.listen(3000, function () {
    winston.info('Server listening on port 3000');
});

io.on('connection', function (socket) {

    winston.info(`server::io.on:: connection`);
    socket.emit('connection approved', 'ok');

    socket.on('req_query', function (data) {

        winston.info(`server::io.on my other event:: data = ${data}`);
        req.end(data);
    });
});
