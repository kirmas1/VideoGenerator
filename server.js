var express = require('express');
var app = express();
var multer = require('multer');
var path = require('path');
var fs = require('fs');
const exec = require('child_process').exec;
const util = require('util');
var formidable = require('formidable');
var shortid = require('shortid');
var sizeOf = require('image-size');
const execFile = require('child_process').execFile;
var os = require("os");

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
        fs.rename(file.path, form.uploadDir + "/" + file.name);
    });
    form.on('field', function (name, value) {
        data = JSON.parse(value);
    });

    form.parse(req);

    form.on('end', function () {
        //start process the files
        console.log("end uploading");

        var three_four = 0,
            nine_sixteen = 0;
        var chosen_dimesions_for_clip = {}; // 0 = three_four, 1 = nine_sixteen

        var add_dimesions_requests = data.map(function (ele) {
            return new Promise(function (resolve) {
                sizeOf(form.uploadDir + '/' + ele.fileName, function (err, dimensions) {
                    if (err) throw err;
                    ele.width = dimensions.width;
                    ele.height = dimensions.height;
                    if (dimensions.width / 4 == dimensions.height / 3) {
                        three_four++;
                        ele.dimesions = 0;
                    } else if (dimensions.width / 16 == dimensions.height / 9) {
                        nine_sixteen++;
                        ele.dimesions = 1;
                    } else {
                        ele.dimesions = -1;
                    }
                    // scale to 1280x720
                    ele.scale = Math.max(Math.ceil(ele.width / 1280), Math.ceil(ele.height / 720));
                    resolve(0);
                })
            });
        })

        var scalePromise = function () {
            return new Promise((resolvee, reject) => {
                var scale_requests = data.map(function (ele, index) {
                    return new Promise(function (resolve) {

                        let filter = 'scale=\'if(gt(a,16/9),1280,-1)\':\'if(gt(a,16/9),-1,720)\'';
                        let child = execFile('ffmpeg', ['-i', '\workshop\\' + newFolderName + '\\' + ele.fileName, '-vf', filter, '\workshop\\' + newFolderName + '\\' + index + ele.fileName], (error, stdout, stderr) => {
                            if (error) {
                                throw error;
                            }
                            ele.fileName = index + ele.fileName;
                            resolve(0);
                        });
                    });
                })

                Promise.all(scale_requests).then(() => {
                    resolvee(0);
                });
            })
        }

        var padPromise = function () {

            return new Promise((resolvee, reject) => {
                var pad_requests = data.map(function (ele, index) {
                    return new Promise(function (resolve) {

                        let filter = 'pad=1280:720:(ow-iw)/2:(oh-ih)/2';
                        let child = execFile('ffmpeg', ['-i', '\workshop\\' + newFolderName + '\\' + ele.fileName, '-vf', filter, '\workshop\\' + newFolderName + '\\' + index + ele.fileName], (error, stdout, stderr) => {
                            if (error) {
                                throw error;
                            }
                            ele.fileName = index + ele.fileName;
                            resolve(0);
                        });
                    });
                })

                Promise.all(pad_requests).then(() => {
                    resolvee(0);
                });
            })
        }

        var createTwoSecClipsRequstPromise = function () {
            return new Promise((resolvee, reject) => {
                var a = data.map((ele) => {
                    return new Promise((resolve, reject) => {

                        exec("ffmpeg -loop 1 -i \workshop\\" + newFolderName + "\\" + ele.fileName + " -vf \"format=yuv420p,setsar=1:1\" -t 2 " + "\workshop\\" + newFolderName + "\\" + "twosec_" + ele.fileName.substr(0, ele.fileName.lastIndexOf('.')) + ".mp4", (err, stdout, stderr) => {
                            if (err) {
                                console.log(err);
                            }
                            console.log(stdout);

                        }).on('exit', (code, signal) => {
                            console.log('---------createTwoSecClipsRequstPromise-- ' + 'exit with code: ' + code + '----------------------');
                            resolve(0);
                        });
                        //                        if (ele.width == chosen_dimesions_for_clip.w && ele.height == chosen_dimesions_for_clip.h) {
                        //                            //perfect match
                        //                            console.log('perfect match');
                        //                            exec("ffmpeg -loop 1 -i \workshop\\" + newFolderName + "\\" + ele.fileName + " -vf format=yuv420p -t 2 " + "\workshop\\" + newFolderName + "\\" + "twosec_" + ele.fileName.substr(0, ele.fileName.lastIndexOf('.')) + ".mp4", (err, stdout, stderr) => {
                        //                                if (err) {
                        //                                    console.log(err);
                        //                                }
                        //                                console.log(stdout);
                        //
                        //                            }).on('exit', (code, signal) => {
                        //                                console.log('---------createTwoSecClipsRequstPromise-- ' + 'exit with code: ' + code + '----------------------');
                        //                                resolve(0);
                        //                            });
                        //                        } else if (ele.width > chosen_dimesions_for_clip.w) {
                        //                            //scale down and pad
                        //                            console.log('scale down and pad: ' + 'ele.w: ' + ele.width + ' ele.h: ' + ele.height);
                        //                        } else {
                        //                            //pad
                        //                            console.log('pad: ' + 'ele.w: ' + ele.width + ' ele.h: ' + ele.height);
                        //                        }
                        //                        //resolve('yay');
                    })
                });

                Promise.all(a).then(() => {
                    resolvee(0);

                });
            })
        }

        var createTransitionsPromise = function () {

            return new Promise((resolvee, reject) => {

                var c = data.map((ele, index, data) => {
                    return new Promise((resolve, reject) => {
                        if (index == data.length - 1) {
                            resolve('yay');
                        } else {
                            exec("ffmpeg -i \workshop\\" + newFolderName + "\\twosec_" + data[index + 1].fileName.substr(0, data[index + 1].fileName.lastIndexOf('.')) +
                                ".mp4 " + "-i \workshop\\" + newFolderName + "\\fulltext_" + data[index].fileName.substr(0, data[index].fileName.lastIndexOf('.')) + ".mp4 -filter_complex blend=all_expr='A*(if(gte(T,2),1,T/2))+B*(1-(if(gte(T,2),1,T/2)))' \workshop\\" + newFolderName + "\\blend_" + index + ".mp4", (err, stdout, stderr) => {
                                    if (err) {
                                        console.log(err);
                                    }
                                    console.log(stdout);

                                }).on('exit', (code, signal) => {
                                console.log('-----------createTransitionsPromise ' + 'exit with code: ' + code + '----------------------');
                                resolve(0);
                            });
                        }
                    });
                });

                Promise.all(c).then(resolvee(0));
            })
        }

        var createDrawString = function (str, duration) {
            var res = '';
            var counter1 = 1;
            var counter2 = 1.2
            for (var i = 0; i < str.length; i++) {
                if (i == str.length - 1) counter2 = duration;
                res += "drawtext=fontsize=35:fontfile=workshop/OpenSans-Regular.ttf:text='" + str.substr(0, i + 1) + "':x=100:y=(h-3*text_h):enable=between(t\\," + counter1 + "\\," + counter2 + "),";
                counter1 += 0.2;
                counter2 += 0.2;
                counter1 = Math.round(counter1 * 100) / 100;
                counter2 = Math.round(counter2 * 100) / 100;
            }
            return res.slice(0, -1);
        }

        var createTypingTextClipsPromise = function () {
            return new Promise((resolvee, reject) => {
                var d = data.map((ele, index, data) => {
                    return new Promise((resolve, reject) => {
                        var duration = Math.ceil(ele.caption.length * 0.15 + 2);
                        exec('ffmpeg -loop 1 -i \workshop\\' + newFolderName + '\\' + ele.fileName + ' -vf "' + createDrawString(ele.caption, duration) + ',format=yuv420p' + '" ' + '-t ' + duration + " \workshop\\" + newFolderName + "\\" + 'typed_' + index + '.mp4', (err, stdout, stderr) => {
                            if (err) {
                                console.log(err);
                            }
                            console.log(stdout);

                        }).on('exit', (code, signal) => {
                            console.log('-----------createTypingTextClipsPromise exit with code: ' + code + '----------------------');
                            resolve(0);
                        });

                    })
                });
                Promise.all(d).then(() => {
                    resolvee(0)
                });
            })
        }

        var createFullTextClipsPromise = function () {
            return new Promise((resolvee, reject) => {
                var b = data.map((ele, index, data) => {
                    return new Promise((resolve, reject) => {
                        if (index == data.length - 1)
                            resolve('yay');
                        else {
                            (function () {
                                var id = setInterval(frame, 1500);

                                function frame() {
                                    console.log("interval: " + Date.now());
                                    if (fs.existsSync('./workshop/' + newFolderName + "/twosec_" + ele.fileName.substr(0, ele.fileName.lastIndexOf('.')) + ".mp4")) {
                                        clearInterval(id);
                                        exec("ffmpeg -i \workshop\\" + newFolderName + "\\" + "twosec_" + ele.fileName.substr(0, ele.fileName.lastIndexOf('.')) + ".mp4" + " -vf \"drawtext=fontsize=35:fontfile=workshop/OpenSans-Regular.ttf:text=" + "'" + ele.caption + "'" + ":x=100:y=(h-3*text_h),format=yuv420p\" " + "\workshop\\" + newFolderName + "\\" + "fulltext_" + ele.fileName.substr(0, ele.fileName.lastIndexOf('.')) + ".mp4", (err, stdout, stderr) => {
                                            if (err) {
                                                console.log(err);
                                            }
                                            console.log(stdout);

                                        }).on('exit', (code, signal) => {
                                            console.log('-----------createFullTextClipsPromise ' + 'exit with code: ' + code + '----------------------');
                                            resolve(0);
                                        });
                                    }
                                }
                            }())
                        }
                    })
                });
                Promise.all(b).then(() => {
                    resolvee(0)
                });
            })
        }

        var writeConcatTextFilePromise = function () {
            return new Promise((resolve, reject) => {
                var file_content = '';
                for (var i = 0; i < data.length; i++) {
                    if (i == data.length - 1) {
                        file_content += "file " + "'\workshop\\" + newFolderName + "\\typed_" + i + ".mp4'";
                    } else {
                        file_content += "file " + "'\workshop\\" + newFolderName + "\\typed_" + i + ".mp4'" + os.EOL + "file " + "'\workshop\\" + newFolderName + "\\blend_" + i + ".mp4'" + os.EOL;
                    }
                }
                fs.writeFile('./workshop/' + newFolderName + '/files_to_concat.txt', file_content, (err) => {
                    console.log('finish writing txt file');
                    resolve(0);
                })
            });
        }

        var concatAllPromise = function () {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    const child = execFile('ffmpeg', ['-f', "concat", '-safe', '0', '-i', 'workshop\\' + newFolderName + '\\files_to_concat.txt', '-c', 'copy', 'workshop\\' + newFolderName + '\\final_' + newFolderName + '.mp4'], (error, stdout, stderr) => {
                        if (error) {
                            throw error;
                        }
                        resolve(0);
                    });
                }, 2000);

                //                exec("ffmpeg -f concat -safe 0 -i workshop\\" + newFolderName + "\\files_to_concat.txt -c copy workshop\\" + newFolderName + "\\final_" + newFolderName + ".mp4", (err, stdout, stderr) => {
                //                    if (err) {
                //                        console.log(err);
                //                    }
                //                    console.log(stdout);
                //
                //                }).on('exit', (code, signal) => {
                //                    resolve(0);
                //                })
            });
        }

        var moveFinalFileToPublic = function () {
            return new Promise((resolve, reject) => {
                readable = fs.createReadStream("\workshop\\" + newFolderName + "\\final_" + newFolderName + ".mp4");
                readable.on('end', () => {
                    resolve(0);
                });
                readable.pipe(fs.createWriteStream("\public\\videos\\final_" + newFolderName + ".mp4"));
            })
        }
        
        Promise.all(add_dimesions_requests).then(() => {
            if (nine_sixteen >= three_four) {
                chosen_dimesions_for_clip.r = 1;
                chosen_dimesions_for_clip.w = 1280;
                chosen_dimesions_for_clip.h = 720;
            } else {
                chosen_dimesions_for_clip.r = 0;
                chosen_dimesions_for_clip.w = 960;
                chosen_dimesions_for_clip.h = 720;
            }
            return scalePromise();
        }).then(() => {
            console.log('Done Scaling');
            return padPromise();
        }).then(() => {
            console.log('Done Padding');
            return createTwoSecClipsRequstPromise();
        }).then(() => {
            console.log('Done create 2 sec clips');
            return createFullTextClipsPromise();
        }).then(() => {
            console.log('Done creating full text 2 sec clips');
            return createTransitionsPromise();
        }).then(() => {
            console.log('Done creating transition clips');
            return createTypingTextClipsPromise();
        }).then(() => {
            console.log('Done with typing clips');
            return writeConcatTextFilePromise();
        }).then(() => {
            console.log('Done writing the concat file');
            return concatAllPromise();
        }).then(() => {
            console.log('Done concat the files');
            moveFinalFileToPublic();
        }).then(() => {
            console.log('File moved to public');
            res.end('final_' + newFolderName + '.mp4');
        })

    });

})


/*
Creating a folder under /uploads to contain to files. The folder name will be the current date
to do so we'll add id to the req and pass it to multer to save the files. than we need to start proccess the video !!!
*/
app.post('/generate', function (req, res, next) {
        req.id = Date.now();
        next();
    }, upload.array('images', 12),
    function (req, res) {
        res.end("/uploads/" + req.id);
    })


//    exec("ffmpeg -loop 1 -i \workshop\\img1.jpg -vf format=yuv420p -t 2 \workshop\\video.mp4", function(error, stdout, stderr) {
//        if (error) {
//            console.error("exec error is:" +  error);
//            return;
//        }
//        //fs.createReadStream('\workshop\\video.mp4').pipe(fs.createWriteStream('\workshop\\videoo.mp4'));
//        res.send("Sababa");
//    });



app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});


var server = app.listen(3000, function () {
    console.log('Server listening on port 3000');
});
