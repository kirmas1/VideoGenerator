var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var exec = require('child_process').exec;
var util = require('util');
var formidable = require('formidable');
var shortid = require('shortid');
var execFile = require('child_process').execFile;
var ffmpeg = require('./ffmpeg');
var os = require("os");
var url = require('url');
var automatic = require('./automatic');
var config = require('./configuration');
var winston = require('winston');

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

app.get('/autogen', function (req, res) {

    function createNewWorkShopFolder() {
        var newFolderName = shortid.generate();

        if (fs.existsSync('./workshop/' + newFolderName)) {
            //create new newFolderName..
        } else {
            fs.mkdirSync('./workshop/' + newFolderName);
        }

        return newFolderName;
    }
    
    function updateClient(message) {
        winston.info('server::autogen::updateClient:: message = ' + util.inspect(message));
        io.sockets.emit('update', message);
    }
    
    //'videos\\final_' + newFolderName + '.mp4'

    var url_parts = url.parse(req.url, true);
    winston.info('app.get::url_parts.query.q is ' + url_parts.query.q);

    var new_folder = createNewWorkShopFolder();
    
    automatic.generate(url_parts.query.q, new_folder)
        .then((res) => updateClient({link: res,
                                    id: 123456,
                                    state: 1}));

    res.end(new_folder);

    //    var url_parts = url.parse(req.url,true);
    //    winston.info('app.get::url_parts.query.q is ' + url_parts.query.q);
    //        
    //    //res.end(url_parts.query.q);
    //    
    //    automatic.generate(url_parts.query.q)
    //        .then((result) => {
    //        
    //        winston.info(`server.js::app.get(/autogen):: result is: ${util.inspect(result)}`);
    //        
    //        res.end(result);
    //    });

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
