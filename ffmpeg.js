var execFile = require('child_process').execFile;
var fs = require('fs');
var os = require("os");
var util = require('util');
var configuration = require('./configuration');
var ffmpeg = configuration.FFMPEG_PATH;
var shortid = require('shortid');

var path_prefix = configuration.OS == 'linux' ? './' : '';

var me = function () {

    /*
    details is  {
        videoName: 'video name',
        slidesInfo: []
    }
*/
    var createCustom = function (details, newFolderName) {
        
        console.log('Let\'s start create cusstom!');

        var workshop = configuration.OS == 'linux' ? `./workshop/${newFolderName}` : `workshop/${newFolderName}`;

        //slidesInfo include images and transitions, lets split them
        images = [];
        transitions = [];

        for (var i = 0; i < details.slidesInfo.length; i++) {
            if (i % 2 === 0) { // index is even
                images.push(details.slidesInfo[i]);
            } else {
                transitions.push(details.slidesInfo[i]);
            }
        }

        var scalePromise = function () {
            var scale_requests = images.map(function (ele, index) {
                return new Promise(function (resolve) {

                    var filter = 'scale=\'if(gt(a,16/9),1280,-1)\':\'if(gt(a,16/9),-1,720)\'';
                    var child = execFile(ffmpeg, ['-i', workshop + '/' + ele.fileName, '-vf', filter, workshop + '/scaled_' + index + '.jpg'], (error, stdout, stderr) => {
                        if (error) {
                            throw error;
                        }
                        resolve(0);
                    });
                });
            });
            return Promise.all(scale_requests);
        }

        var padPromise = function () {
            var pad_requests = images.map(function (ele, index) {
                return new Promise(function (resolve) {
                    var filter = 'pad=1280:720:(ow-iw)/2:(oh-ih)/2';
                    var child = execFile(ffmpeg, ['-i', workshop + '/scaled_' + index + '.jpg', '-vf', filter, workshop + '/scaled_padded' + index + '.jpg'], (error, stdout, stderr) => {
                        if (error) {
                            throw error;
                        }
                        resolve(0);
                    });
                });
            })
            return Promise.all(pad_requests);
        }

        var createZoomPromise = function () {

            var zoom_requests = images.map(function (ele, index) {
                if (ele.zoom.enabled == true) {
                    if (ele.zoom.style == 0) {
                        return createZoomInEffectVideo(`${workshop}/scaled_padded${index}.jpg`, 1280, 720, ele.duration, `${workshop}/zoomeffect_${index}.mp4`);

                    } else {
                        return createZoomInEffectVideoNearCenter(`${workshop}/scaled_padded${index}.jpg`, 1280, 720, ele.duration, `${workshop}/zoomeffect_${index}.mp4`);
                    }
                } else { //Dont zoom
                    return createVideoFromImage(`${workshop}/scaled_padded${index}.jpg`, ele.duration, `${workshop}/zoomeffect_${index}.mp4`);
                }

            })
            return Promise.all(zoom_requests);
        }

        /*
         */
        var createCaptionFiles = function () {

            var p = images.map((ele, index) => {

                return new Promise((res, rej) => {
                    console.log('ffmpeg::createCaptionFiles::ele.caption.text is: ' + ele.caption.text);
                    switch (ele.caption.effect) {
                        case 1: //sliding from left. The ele.caption.text should be ready with new lines so we need to add white spaces only.
                            var str = '       ' + ele.caption.text.replace(/(?:\r\n|\r|\n)/g, "\n       ");

                            fs.writeFile(`${workshop}/caption_${index}.txt`, str, (err) => {
                                res(0);
                            })
                            break;
                        default:
                            fs.writeFile(`${workshop}/caption_${index}.txt`, ele.caption.text, (err) => {
                                res(0);
                            })
                            break;
                    }

                });

            });
            return Promise.all(p);
        }

        /* This what we have in image Object (from client)
        	caption: {
		   text: 'text',
		   font: 'fontName',
		   fontsize: size(Number),
		   bold: boolean,
		   italic: boolean,
		   effect: 'EffectName,
		   startTime: startTime(Number),
		   duration: duration(Number)
		 }
         
     *Options can include: start_time, duration, font_file, font_size, font_color, box (1/0), box_color, box_opacity, x, y *positions, text_file
        */
        var fontPath = function (font, bold, italic) {

            var style;

            if (bold) {
                if (italic) style = 'bi';
                else style = 'b';
            } else if (italic) style = 'i';
            else style = 'r';

            switch (font) {
                case 'Arial':
                    return `./fonts/Arial/${style}.ttf`;
                    break;
                case 'Calibri':
                    return `./fonts/Calibri/${style}.ttf`;
                    break;
                case 'Cambria':
                    return `./fonts/Cambria/${style}.ttf`;
                    break;
                case 'Comic Sans MS':
                    return `./fonts/ComicSans/${style}.ttf`;
                    break;
                case 'Georgia':
                    return `./fonts/Georgia/${style}.ttf`;
                    break;
                case 'Times New Roman':
                    return `./fonts/TimesNewRoman/${style}.ttf`;
                case 'Open Sans':
                    return `./fonts/OpenSans/${style}.ttf`;
                    break;
            }
        }

        var drawTextPromise = function () {
            var t = images.map((ele, index) => {

                switch (Number(ele.caption.effect)) {
                    case 0:
                        return drawTextNoEffects(`${workshop}/zoomeffect_${index}.mp4`, `${workshop}/zt_${index}.mp4`, {
                            font_file: fontPath(ele.caption.font, ele.caption.bold, ele.caption.italic),
                            font_size: Number(ele.caption.fontsize),
                            font_color: 'white',
                            box: 1,
                            box_color: 'black',
                            box_opacity: 0.7,
                            x: '(w-text_w)/2',
                            y: 'h-4*line_h',
                            text_file: `${workshop}/caption_${index}.txt`
                        });
                        break;
                    case 1:
                        var _options = {
                            font_file: fontPath(ele.caption.font, ele.caption.bold, ele.caption.italic),
                            font_size: Number(ele.caption.fontsize),
                            font_color: 'white',
                            start_time: ele.caption.startTime,
                            box: 1,
                            box_color: 'black',
                            box_opacity: 0.7,
                            text_file: `${workshop}/caption_${index}.txt`
                        };
                        return drawTextSlidingFromLeftToRight(`${workshop}/zoomeffect_${index}.mp4`, `${workshop}/zt_${index}.mp4`, _options);
                        break;
                    case 2:
                        var case_2_options = {
                            font_file: fontPath(ele.caption.font, ele.caption.bold, ele.caption.italic),
                            font_size: Number(ele.caption.fontsize),
                            font_color: 'white',
                            start_time: ele.caption.startTime,
                            box: 1,
                            box_color: 'black',
                            box_opacity: 0.7,
                            text_file: `${workshop}/caption_${index}.txt`,
                            x: ele.caption.x || 'center',
                            y: ele.caption.y || 'center',
                            fade_in_start_time: Number(ele.caption.startTime),
                            fade_in_duration: 1,
                            fade_out_duration: 1,
                            fade_out_end_time: Number(ele.caption.startTime) + 1 + Number(ele.caption.duration) + 1
                        };
                        console.log('options for drawTextFadeInOutEffect' + util.inspect(case_2_options));
                        return drawTextFadeInOutEffect(`${workshop}/zoomeffect_${index}.mp4`, `${workshop}/zt_${index}.mp4`, case_2_options);
                        break;
                    default:
                        return Promise.reslove;
                }
            })
            return Promise.all(t);
        }

        var overLayTtsPromise = function () {
            var tts = images.map((ele, index) => {

                //The first slide should be overlaid for the concat to success!

                if (index === 0 && (ele.tts === false || ele.tts === undefined))
                    return overlaySilentToVideo(`${workshop}/zt_${index}.mp4`, `${workshop}/zts_${index}.mp4`);

                if (ele.tts === false || ele.tts === undefined) return Promise.resolve(0);

                let _options = {
                    startAt: ele.caption.startTime + 1,
                    output: `${workshop}/zts_${index}.mp4`
                }

                return overlayAudioToVideo(`${workshop}/zt_${index}.mp4`, ele.tts_file, _options);
            });
            return Promise.all(tts);
        }

        var createTransition = function () {

            var firstStep = function () {
                console.log('ffmpeg::createTransition:: transition First step starting');
                var p = transitions.map((ele, index) => {
                    return createVideoFromImage(`${workshop}/scaled_padded${index+1}.jpg`, ele.duration, `${workshop}/p${index}.mp4`);
                });
                return Promise.all(p);
            };

            var secondStep = function () {
                console.log('ffmpeg::createTransition:: transition second Step starting');
                var lf = transitions.map((ele, index) => {
                    console.log(`ffmpeg::createTransition::secondStep images[index].duration: ${images[index].duration}`);
                    return captureLastFrame(`${workshop}/zt_${index}.mp4`, images[index].duration, `${workshop}/lf${index}.jpg`);
                });
                return Promise.all(lf);
            };

            var thirdStep = function () {
                console.log('ffmpeg::createTransition:: transition Third step starting');
                var lfv = transitions.map((ele, index) => {
                    return createVideoFromImage(`${workshop}/lf${index}.jpg`, ele.duration, `${workshop}/lfv${index}.mp4`);
                });
                return Promise.all(lfv);
            };

            var fourthStep = function () {
                console.log('transition Fourth step starting');
                var transitionsRequest = transitions.map((ele, index) => {
                    console.log(`Transition ${index} is ${ele.effect.type}`);
                    switch (Number(ele.effect.type)) {
                        case 0:
                            console.log('in case 0');
                            return createBlend(`${workshop}/lfv${index}.mp4`, `${workshop}/p${index}.mp4`, ele.duration, `${workshop}/transition${index}.mp4`);
                            break;
                        case 1:
                            switch (Number(ele.effect.uncover)) {
                                case 0:
                                    return createUncoverLeftTransition(`${workshop}/lfv${index}.mp4`, `${workshop}/p${index}.mp4`, `${workshop}/transition${index}.mp4`);
                                    break;
                                case 1:
                                    return createUncoverRightTransition(`${workshop}/lfv${index}.mp4`, `${workshop}/p${index}.mp4`, `${workshop}/transition${index}.mp4`);
                                    break;
                                case 2:
                                    return createUncoverDownTransition(`${workshop}/lfv${index}.mp4`, `${workshop}/p${index}.mp4`, `${workshop}/transition${index}.mp4`);
                                    break;
                                default:
                                    return Promise.reslove();
                            }
                            break;
                        default:
                            return Promise.resolve();
                    }
                });

                return Promise.all(transitionsRequest);
            };

            return new Promise((resolve, reject) => {
                firstStep()
                    .then(() => {
                        console.log('Finished transtion first step');
                        return secondStep();
                    })
                    .then(() => {
                        console.log('Finished transtion second Step');
                        return thirdStep();
                    })
                    .then(() => {
                        console.log('Finished transtion third Step');
                        return fourthStep();
                    })
                    .then(() => {
                        return resolve(0);
                    })
            });

        }

        var writeConcatTextFilePromise = function () {

            var prefix = configuration.OS == 'win' ? '' : "'./workshop/" + newFolderName + '/';
            return new Promise((resolve, reject) => {
                var file_content = '';
                for (var i = 0; i < images.length; i++) {
                    if (i == images.length - 1) {

                        if (images[i].tts === true || i === 0)
                            file_content += "file " + prefix + "zts_" + i + ".mp4'";
                        else
                            file_content += "file " + prefix + "zt_" + i + ".mp4'";

                    } else {

                        if (images[i].tts === true || i === 0)
                            file_content += "file " + prefix + "zts_" + i + ".mp4'" + os.EOL + "file " + prefix + "transition" + i + ".mp4'" + os.EOL;
                        else
                            file_content += "file " + prefix + "zt_" + i + ".mp4'" + os.EOL + "file " + prefix + "transition" + i + ".mp4'" + os.EOL;
                    }
                }
                fs.writeFile(`${workshop}/files_to_concat.txt`, file_content, (err) => {
                    console.log('ffmpeg::writeConcatTextFilePromise:: finish writing txt file');
                    resolve(0);
                })
            });
        }

        var concatAllPromise = function () {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    var child = execFile(ffmpeg, ['-f', "concat", '-safe', '0', '-i', workshop + '/files_to_concat.txt', '-c', 'copy', workshop + '/final_' + newFolderName + '.mp4'], (error, stdout, stderr) => {
                        if (error) {
                            throw error;
                        }
                        resolve(0);
                    });
                }, 2000);
            });
        }

        var moveFinalFileToPublic = function () {
            return new Promise((resolve, reject) => {
                readable = fs.createReadStream(workshop + "/final_" + newFolderName + ".mp4");
                readable.on('end', () => {
                    resolve(0);
                });
                var public = configuration.OS == 'win' ? '\public' : './public';
                readable.pipe(fs.createWriteStream(`${public}/videos/final_${newFolderName}.mp4`));
            })
        }

        return new Promise((resolve, reject) => {
            scalePromise()
                .then(() => {
                    console.log('Done Scaling');
                    return padPromise();
                })
                .then(() => {
                    console.log('Done Padding');
                    return createZoomPromise();
                })
                .then(() => {
                    console.log('Done createZoomPromise');
                    return createCaptionFiles();
                })
                .then(() => {
                    console.log('Done createCaptionFiles');
                    return drawTextPromise();
                })
                .then(() => {
                    console.log('Done drawTextPromise');
                    return overLayTtsPromise();
                })
                .then(() => {
                    console.log('Done overLayTtsPromise');
                    return createTransition();
                })
                .then(() => {
                    console.log('Done with Transitions clips');
                    return writeConcatTextFilePromise();
                })
                .then(() => {
                    console.log('Done writing the concat file');
                    return concatAllPromise();
                })
                .then(() => {
                    console.log('Done concat the files');
                    moveFinalFileToPublic();
                })
                .then(() => {
                    console.log('File moved to public');
                    resolve('videos\\final_' + newFolderName + '.mp4');
                })
        });

    }

    /*
    Makes a video from an image with the duration and zoomin effect. using 25 frames per second.
    zoom into the center of the image.
    Input: duration - desired for the video in seconds.
           path_to_image
           image_width, image_height
           path_to_output - where you want to save the video. 
    Output: Promise
    */
    var createZoomInEffectVideo = function (path_to_image, image_width, image_height, duration, path_to_output) {
        console.log('createZoomInEffectVideo for: ' + path_to_image);
        return new Promise((resolve, reject) => {
            var filter = '[0:v]scale=' + image_width * 6 + 'x' + image_height * 6 + ',format=yuv420p,setsar=1:1,zoompan=z=\'min(zoom+0.001,1.5)\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':d=' + 25 * duration + ',trim=duration=' + duration + '[v]';

            execFile(ffmpeg, ['-framerate', 25, '-loop', 1, '-i', path_to_image, '-filter_complex', filter, '-map', '[v]', '-y', path_to_output], (error, stdout, stderr) => {
                console.log('finished ' + ' createZoomInEffectVideo for: ' + path_to_image);
                if (error)
                    reject(error);
                else
                    resolve(path_to_output);
            });
        })
    }

    /*
    Makes a video from an image with the duration and sliding effect. using 25 frames per second.    
    Input:
        path_to_image 
        path_to_output - where you want to save the video. 
        options {
            duration - desired for the video in seconds.
           image_width, image_height, zoom_factor
        }
    Output: Promise
    */
    var createSlidingCameraEffect = function (path_to_image, path_to_output, options) {
        console.log('ffmpeg::createSlidingCameraEffect:: path_to_image: ' + path_to_image);

        var zoom_factor = options.zoom_factor || 1.1;
        var scale_factor = 12;
        var image_width = options.image_width || 1280;
        var image_height = options.image_height || 640;
        var duration = options.duration || 10;
        var delta_x = image_width * scale_factor * (1 - 1 / zoom_factor) / (25 * duration);

        return new Promise((resolve, reject) => {

            var filter = `[0:v]scale=${image_width * scale_factor}x${image_height * scale_factor},format=yuv420p,setsar=1:1,zoompan=z=\'${zoom_factor}\':x=\'x+${delta_x}\':y=\'ih/2-(ih/zoom/2)\':d=${25 * duration},trim=duration= ${duration}[v]`;

            execFile(ffmpeg, ['-framerate', 25, '-loop', 1, '-i', path_to_image, '-filter_complex', filter, '-map', '[v]', '-y', path_to_output], (error, stdout, stderr) => {
                console.log('ffmpeg::createSlidingCameraEffect: finished ' + ' createZoomInEffectVideo for: ' + path_to_image);
                if (error) {
                    console.log('ffmpeg::createSlidingCameraEffect: rejecting, error ' + ' : ' + error);
                    reject(error);
                } else
                    resolve(path_to_output);
            });
        })
    }

    /*
        same as createZoomInEffectVideo but to some spot near center of picture
         */
    var createZoomInEffectVideoNearCenter = function (path_to_image, image_width, image_height, duration, path_to_output) {
        console.log('createZoomInEffectVideoNearCenter for: ' + path_to_image);
        return new Promise((resolve, reject) => {
            var filter = '[0:v]scale=' + image_width * 4 + 'x' + image_height * 6 + ',format=yuv420p,setsar=1:1,zoompan=z=\'min(zoom+0.001,1.5)\':x=\'if(gte(zoom,1.5),x,x+1/a)\':y=\'if(gte(zoom,1.5),y,y+1)\':d=' + 25 * duration + ',trim=duration=' + duration + '[v]';

            execFile(ffmpeg, ['-framerate', 25, '-loop', 1, '-i', path_to_image, '-filter_complex', filter, '-map', '[v]', '-y', path_to_output], (error, stdout, stderr) => {
                console.log('finished ' + ' createZoomInEffectVideoNearCenter for: ' + path_to_image);
                if (error)
                    reject(error);
                else
                    resolve(path_to_output);
            });
        })
    }

    /*
    Capture the last frame of the video into an image. Assuming the video is 25 fps.
    Input: video_duration - in seconds. should be lower than 60.
    */
    var captureLastFrame = function (path_to_video, video_duration, path_to_output) {
        var last_frame =
            video_duration > 9 ? '00:00:' : '00:00:0';
        last_frame += +video_duration - 0.04;

        return new Promise((resolve, reject) => {
            //$ ffmpeg -i aaa.mp4 -ss 00:00:07.96 -vframes 1 ab.jpg
            execFile(ffmpeg, ['-i', path_to_video, '-ss', last_frame, '-vframes', 1, path_to_output], (error, stdout, stderr) => {
                if (error)
                    reject(error);
                else
                    resolve(path_to_output);
            });
        })
    }

    /*
    Create video from one image.
    Input: video_duration - in seconds.
    */
    var createVideoFromImage = function (path_to_image, duration, path_to_output) {
        return new Promise((resolve, reject) => {
            execFile(ffmpeg, ['-loop', 1, '-i', path_to_image, '-vf', 'format=yuv420p,setsar=1:1', '-t', duration, path_to_output], (error, stdout, stderr) => {
                if (error)
                    reject(error);
                else
                    resolve(path_to_output);
            });
        })
    }

    var createBlend = function (path_to_first_video, path_to_second_video, duration, path_to_output) {
        console.log('creating Blend');
        return new Promise((resolve, reject) => {
            execFile(ffmpeg, ['-i', path_to_second_video, '-i', path_to_first_video, '-filter_complex', `blend=all_expr='A*(if(gte(T,${duration}),1,T/${duration}))+B*(1-(if(gte(T,${duration}),1,T/${duration})))'`, path_to_output], (error, stdout, stderr) => {
                if (error) {
                    console.log('blending failed :( ' + error);
                    reject(error);
                } else {
                    resolve(path_to_output);
                }
            });
        })
    }

    //Deprecated
    var createDrawString = function (str, duration) {
        var res = '';
        var counter1 = 1;
        var counter2 = 1.2
        for (var i = 0; i < str.length; i++) {
            if (i == str.length - 1) counter2 = duration;
            res += "drawtext=fontsize=35:fontfile=workshop/OpenSans-Regular.ttf:text=\'" + str.substr(0, i + 1) + "\':x=100:y=(h-3*text_h):enable=between(t\\," + counter1 + "\\," + counter2 + '),';
            counter1 += 0.2;
            counter2 += 0.2;
            counter1 = Math.round(counter1 * 100) / 100;
            counter2 = Math.round(counter2 * 100) / 100;
        }
        return res.slice(0, -1);
    }

    /*
     *Type the text on the video
     */
    //Deprecated
    var typeTextOnVideo = function (path_to_video, text, font_size, path_to_font) {
        var newFolderName = 'S1DJe3-ne';
        var ele = {
            fileName: '00640_388',
            caption: 'Sagi'
        }
        return new Promise((resolve, reject) => {
            var duration = Math.ceil(ele.caption.length * 0.15 + 2);
            exec('ffmpeg -loop 1 -i .\workshop\\' + newFolderName + '\\' + ele.fileName + ' -vf "' + createDrawString(ele.caption, duration) + ',format=yuv420p' + '" ' + '-t ' + duration + " .\workshop\\" + newFolderName + "\\" + '11111test.mp4', (err, stdout, stderr) => {
                if (err) {
                    console.log(err);
                }
                console.log(stdout);

            }).on('exit', (code, signal) => {
                console.log('-----------createTypingTextClipsPromise exit with code: ' + code + '----------------------');
                resolve(0);
            });


        });
    }

    /*
    For using rollingTextEffect method you have to provide text file like assets/text.txt 
    
    Currently supporting only 2 styles
    a. font_size=72, block_h = 1 (1 empty line between blocks)
    b. font_size=36, block_h = 2 (2 empty line between blocks)
    
    For supporting more we need to create more black_img.jpg files with different sizes. (Currently the only one has 216 height).
    
    Options must include: {
        font_size: int,
        font_color: int,
        font_file: path/to/file,
        text_file: path/to/textfile,
        block_h: 1 or 2 
        block_displays_t: array of display times per each block (helpful to timming witht text to speach)
        ...
    }
    
    */
    var rollingTextEffect = function (path_to_video, path_to_output, options) {

        var black_img = path_prefix + 'assets/black_img.jpg';
        
        var temp_workshop = `${path_prefix}workshop/$temp_rolling_text_effect_{shortid.generate()}`;
        
        if (fs.existsSync(temp_workshop)) {
            //create new newFolderName..
        } else {
            fs.mkdirSync(temp_workshop);
            
        } 
           
        var black_video = `${temp_workshop}/black_video.mp4`;
        //var black_video = path_prefix + 'assets/black_video.mp4';

        var js = just_sum();

        var total_duration = js + 0.5 * options.block_displays_t.length + 0.5;
        
        console.log(`ffmpeg::rollingTextEffect::total_duration ${total_duration}`);
        
        createVideoFromImage(black_img, total_duration, black_video)
            .then((response) => {

                // Create the effect. 
                return new Promise((res, rej) => {

                    let y = generateY(options.font_size, options.block_displays_t, options.block_h);

                    execFile(ffmpeg, ['-i', black_video, '-vf', `drawtext=fontsize=${options.font_size}:fontcolor=${options.font_color}@1:fontfile=${options.font_file}:textfile=${options.text_file}:y=${y}`, `${temp_workshop}/text_on_transparent.mp4`], (err, stdout, stderr) => {
                        if (err) {
                            console.log(err);
                            rej(err);
                        }
                    }).on('exit', (code, signal) => {

//                        fs.unlink(black_video, (err) => {
//                            if (err) throw err;
//                        });
                        res(`${temp_workshop}/text_on_transparent.mp4`);
                    });
                });

            })
            .then((result) => {

                //overlay over the original
                return new Promise((resolve, reject) => {

                    console.log(`ffmpeg::rollingTextEffect:: last part, resut: ${result}`);

                    execFile(ffmpeg, ['-i', result, '-i', path_to_video, '-filter_complex', '[0]colorkey=color=#000000:similarity=0.1[keyed]; [1][keyed]overlay=x=10:y=H-1.5*h', path_to_output], (err, stdout, stderr) => {
                        if (err) {
                            console.log(err);
                            reject(err);
                        }
                    }).on('exit', (code, signal) => {

//                        fs.unlink(`assets/temp.mp4`, (err) => {
//                            if (err) throw err;
//                        });
                        resolve(0);
                    });
                });
            });


        function generateY(font_size, block_displays_t, block_h) {

            let y = '';
            if (block_h === 2) font_size = font_size * 2;

            for (let i = 0; i <= 2 * block_displays_t.length; i++) {

                if (i === 0)

                    y += `if(between(t\\,0\\,0.5)\\,h-${4*font_size}*t\\,`;

                else if (i % 2 === 0) { //Even

                    if (i === 2 * block_displays_t.length) { //last loop

                        y += `h-${4 * font_size}*(t-${special_sum(i)})`;

                        for (let n = 0; n < i; n++)
                            y += ')';
                    } else
                        y += `if(between(t\\,${i/4 + special_sum(i)}\\,${i/4 + special_sum(i) + 0.5})\\,h-${4 * font_size}*(t-${special_sum(i)})\\,`;

                } else { //Odd

                    y += `if(between(t\\,${(i+1)/4 + special_sum(i)}\\,${(i+1)/4 + special_sum(i+1)})\\,h-${font_size * ( i + 1)}\\,`
                }
            }
            console.log(`ffmpeg::rollingTextEffect::generateY:: y= ${y}\n`);
            return y;

            function special_sum(num) {
                let sum = 0;
                for (let k = 0; k <= num / 2 - 1; k++)
                    sum += block_displays_t[k];
                return sum;
            }
        };

        function just_sum() {
            var _sum = 0;
            for (let i = 0; i < options.block_displays_t.length; i++)
                _sum += options.block_displays_t[i];
            return _sum;
        };
    }

    /*
options: font_color, font_file, text_file
*/
    var drawHeadLine = function (path_to_video, path_to_output, options) {
        return new Promise((resolve, reject) => {
            execFile(ffmpeg, ['-i', path_to_video, '-vf', `drawtext=fontsize=100:fontcolor=${options.font_color}@1:fontfile=${options.font_file}:textfile=${options.text_file}:x=(w-text_w)/2:y=(h-text_h)/3`, path_to_output], (err, stdout, stderr) => {
                if (err) {
                    console.log(err);
                }
            }).on('exit', (code, signal) => {
                resolve(0);
            });

        });
    }

    /*
     *Draw the text on the video without any effects
     *Options can include: start_time, font_file, font_size, font_color, box (1/0), box_color, box_opacity, x, y *positions, text_file
     */
    var drawTextNoEffects = function (path_to_video, path_to_output, options) {
        //TODO: set undefined options
        return new Promise((resolve, reject) => {
            execFile(ffmpeg, ['-i', path_to_video, '-vf', `drawtext=fontsize=${options.font_size}:fontcolor=${options.font_color}@1:box=${options.box}:boxcolor=${options.box_color}@${options.box_opacity}:boxborderw=10:fontfile=${options.font_file}:textfile=${options.text_file}:x=${options.x}:y=${options.y}`, path_to_output], (err, stdout, stderr) => {
                if (err) {
                    console.log(err);
                }
            }).on('exit', (code, signal) => {
                resolve(0);
            });

        });
    }

    var drawTextSlidingFromLeftToRight = function (path_to_video, path_to_output, options) {
        //TODO: set undefined options
        return new Promise((resolve, reject) => {
            console.log('inside drawTextSlidingFromLeftToRight function, options are: ' + util.inspect(options));

            execFile(ffmpeg, ['-i', path_to_video, '-vf', `drawtext=fontsize=${options.font_size}:fontcolor=${options.font_color}@1:box=${options.box}:boxcolor=${options.box_color}@${options.box_opacity}:boxborderw=10:fontfile=${options.font_file}:textfile=${options.text_file}:y=h-4*line_h:x=if(gt(800*(t-${options.start_time})-text_w\\,0)\\,0\\,800*(t-${options.start_time})-text_w)`, path_to_output], (err, stdout, stderr) => {
                if (err) {
                    console.log(err);
                }
                console.log(stdout);
            }).on('exit', (code, signal) => {
                resolve(0);
            });

        });
    }

    /*
    Must specify in the options the 
    fade_in_start_time,
    fade_in_duration,
    fade_out_duration,
    fade_out_end_time
    x, y (can be 'center')
    */

    /*
    fade_in_start_time: ele.caption.startTime,
    fade_in_duration: 1,
    fade_out_duration: 1,
    fade_out_end_time: ele.duration - (ele.caption.startTime + ele.caption.duration)
    
    At this moment drawTextFadeInOutEffect supports only black or white colors.
    */
    var drawTextFadeInOutEffect = function (video_path, output_path, options) {
        //x=(w-text_w)/2:y=(h-text_h)/2
        if (options.x === 'center') options.x = '(w-text_w)/2';
        if (options.y === 'center') options.y = '(h-text_h)/2';
        var color = 'black';
        if (options.font_color === 'white') color = 'ffffff';
        if (options.font_color === 'black') color = '000000';
        return new Promise((res, rej) => {
            var arguments = ['-i', video_path, '-vf', `drawtext=x=${options.x}:y=${options.y}:textfile=${options.text_file}:fontsize=${options.font_size}:fontfile=${options.font_file}:fontcolor_expr=${color}%{eif\\\\: clip(255*(1*between(t\\, ${options.fade_in_start_time} + ${options.fade_in_duration}\\, ${options.fade_out_end_time} - ${options.fade_out_duration}) + ((t - ${options.fade_in_start_time})/${options.fade_in_duration})*between(t\\, ${options.fade_in_start_time}\\, ${options.fade_in_start_time} + ${options.fade_in_duration}) + (-(t - ${options.fade_out_end_time})/${options.fade_out_duration})*between(t\\, ${options.fade_out_end_time} - ${options.fade_out_duration}\\, ${options.fade_out_end_time}) )\\, 0\\, 255) \\\\: x\\\\: 2 }`, output_path];

            console.log(arguments);
            execFile(ffmpeg, ['-i', video_path, '-vf', `drawtext=x=${options.x}:y=${options.y}:textfile=${options.text_file}:fontsize=${options.font_size}:fontfile=${options.font_file}:fontcolor_expr=${color}%{eif\\\\: clip(255*(1*between(t\\, ${options.fade_in_start_time} + ${options.fade_in_duration}\\, ${options.fade_out_end_time} - ${options.fade_out_duration}) + ((t - ${options.fade_in_start_time})/${options.fade_in_duration})*between(t\\, ${options.fade_in_start_time}\\, ${options.fade_in_start_time} + ${options.fade_in_duration}) + (-(t - ${options.fade_out_end_time})/${options.fade_out_duration})*between(t\\, ${options.fade_out_end_time} - ${options.fade_out_duration}\\, ${options.fade_out_end_time}) )\\, 0\\, 255) \\\\: x\\\\: 2 }`, output_path], (err, stdout, stderr) => {
                if (err) {
                    console.log(err);
                }
                console.log(stdout);
            }).on('exit', (code, signal) => {
                res(0);
            });
        });
    }

    /*
    Both inputs should be 2 sec
    Assuming 25 fps
    */
    var createUncoverLeftTransition = function (first_video, second_video, output_video) {
        return new Promise((res, rej) => {
            execFile(ffmpeg, ['-i', second_video, '-i', first_video, '-filter_complex', 'blend=\'all_expr=if(gte(25.6*N*SW+X,W),A,B)\'', output_video], (err, stdout, stdin) => {
                if (err) {
                    console.log(err);
                }
                console.log(stdout);
            }).on('exit', (code, signal) => {
                res(0);
            });
        });
    }

    /*
    Both inputs should be 2 sec
    */
    var createUncoverRightTransition = function (first_video, second_video, output_video) {
        return new Promise((res, rej) => {
            execFile(ffmpeg, ['-i', second_video, '-i', first_video, '-filter_complex', 'blend=\'all_expr=if(lte(X,25.6*N),A,B)\'', output_video], (err, stdout, stdin) => {
                if (err) {
                    console.log(err);
                }
                console.log(stdout);
            }).on('exit', (code, signal) => {
                res(0);
            });
        });
    }

    /*
    Both inputs should be 2 sec
    */
    var createUncoverDownTransition = function (first_video, second_video, output_video) {
        return new Promise((res, rej) => {
            execFile(ffmpeg, ['-i', first_video, '-i', second_video, '-filter_complex', 'blend=\'all_expr=if(gte(Y-14.4*N*SH,0),A,B)\'', output_video], (err, stdout, stdin) => {
                if (err) {
                    console.log(err);
                }
                console.log(stdout);
            }).on('exit', (code, signal) => {
                res(0);
            });
        });
    }

    /*
    Input: path the video file, path to audio file
    options: {
        startAt: number //where to start the overlay
        output: path/to/output
    }
    
    Return Pormise
    */
    /*
    ffmpeg -i input.mp4 -i input.mp3 -f lavfi -t 2 -i anullsrc 
-filter_complex "[2:a][1:a]concat=n=2:v=0:a=1[a0];[a0]apad[a]" -map 0:v -map [a] -shortest -y output.mp4
*/
    var overlayAudioToVideo = function (video, audio, options) {
        return new Promise((resolve, reject) => {
            execFile(ffmpeg, ['-i', video, '-i', audio, '-f', 'lavfi', '-t', options.startAt, '-i', 'anullsrc', '-filter_complex', "[2:a][1:a]concat=n=2:v=0:a=1[a0];[a0]apad[a]", '-map', '0:v', '-map', '[a]', '-shortest', '-y', options.output], (err, stdout, stdin) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                console.log(stdout);
            }).on('exit', (code, signal) => {
                resolve(0);
            });
        });
    }

    var overlaySilentToVideo = function (input, output) {
        return new Promise((resolve, reject) => {
            execFile(ffmpeg, ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=mono:sample_rate=22050', '-i', input, '-shortest', '-c:v', 'copy', output], (err, stdout, stdin) => {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                console.log(stdout);
            }).on('exit', (code, signal) => {
                resolve(0);
            });
        });
    }

    return {
        overlayAudioToVideo: overlayAudioToVideo,
        createZoomInEffectVideo: createZoomInEffectVideo,
        createZoomInEffectVideoNearCenter: createZoomInEffectVideoNearCenter,
        captureLastFrame: captureLastFrame,
        createVideoFromImage: createVideoFromImage,
        drawTextNoEffects: drawTextNoEffects,
        typeTextOnVideo: typeTextOnVideo,
        drawTextSlidingFromLeftToRight: drawTextSlidingFromLeftToRight,
        drawTextFadeInOutEffect: drawTextFadeInOutEffect,
        createBlend: createBlend,
        createUncoverLeftTransition: createUncoverLeftTransition,
        createUncoverRightTransition: createUncoverRightTransition,
        createUncoverDownTransition: createUncoverDownTransition,
        createCustom: createCustom,
        drawHeadLine: drawHeadLine,
        createSlidingCameraEffect: createSlidingCameraEffect, //testing
        rollingTextEffect: rollingTextEffect
    }
}

module.exports = me();
