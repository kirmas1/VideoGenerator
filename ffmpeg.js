const execFile = require('child_process').execFile;

var me = function () {

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

        return new Promise((resolve, reject) => {
            let filter = '[0:v]scale=' + image_width * 6 + 'x' + image_height * 6 + ',format=yuv420p,setsar=1:1,zoompan=z=\'min(zoom+0.001,1.5)\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':d=' + 25 * duration + ',trim=duration=' + duration + '[v]';

            execFile('ffmpeg', ['-framerate', 25, '-loop', 1, '-i', path_to_image, '-filter_complex', filter, '-map', '[v]', '-y', path_to_output], (error, stdout, stderr) => {
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
            execFile('ffmpeg', ['-i', path_to_video, '-ss', last_frame, '-vframes', 1, path_to_output], (error, stdout, stderr) => {
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
            execFile('ffmpeg', ['-loop', 1, '-i', path_to_image, '-vf', 'format=yuv420p,setsar=1:1', '-t', duration, path_to_output], (error, stdout, stderr) => {
                if (error)
                    reject(error);
                else
                    resolve(path_to_output);
            });
        })
    }

    var createBlend = function (path_to_first_image, path_to_second_image, duration, path_to_output) {
        return new Promise((resolve, reject) => {
            execFile('ffmpeg', ['-i', path_to_second_image, '-i', path_to_first_image, '-filter_complex', `blend=all_expr='A*(if(gte(T,${duration}),1,T/${duration}))+B*(1-(if(gte(T,${duration}),1,T/${duration})))'`, path_to_output], (error, stdout, stderr) => {
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
            exec('ffmpeg -loop 1 -i \workshop\\' + newFolderName + '\\' + ele.fileName + ' -vf "' + createDrawString(ele.caption, duration) + ',format=yuv420p' + '" ' + '-t ' + duration + " \workshop\\" + newFolderName + "\\" + '11111test.mp4', (err, stdout, stderr) => {
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
     *Draw the text on the video without any effects
     *Options can include: start_time, duration, font_file, font_size, fontcolor, box (1/0), box_color, box_opacity, x, y *positions.
     */
    var drawTextNoEffects = function (path_to_video, path_to_output, options) {
        //TODO: set undefined options
        return new Promise((resolve, reject) => {
            execFile('ffmpeg', ['-i', path_to_video, '-vf', `drawtext=fontsize=${options.font_size}:fontcolor=${options.font_color}@1:box=${options.box}:boxcolor=${options.box_color}@${options.box_opacity}:boxborderw=10:fontfile=${options.font_file}:textfile=${options.text_file}:x=${options.x}:y=${options.y}`, path_to_output], (err, stdout, stderr) => {
                if (err) {
                    console.log(err);
                }
                console.log(stdout);
            }).on('exit', (code, signal) => {
                resolve(0);
            });

        });
    }

    var drawTextSlidingFromLeftToRight = function (path_to_video, path_to_output, options) {
        //TODO: set undefined options
        return new Promise((resolve, reject) => {
            execFile('ffmpeg', ['-i', path_to_video, '-vf', `drawtext=fontsize=${options.font_size}:fontcolor=${options.font_color}@1:box=${options.box}:boxcolor=${options.box_color}@${options.box_opacity}:boxborderw=10:fontfile=${options.font_file}:textfile=${options.text_file}:y=h-4*line_h:x=if(gt(800*(t-${options.start_time})-text_w\\,0)\\,0\\,800*(t-${options.start_time})-text_w)`, path_to_output], (err, stdout, stderr) => {
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
    var drawTextFadeInOutEffect = function (video_path, output_path, options) {
        //x=(w-text_w)/2:y=(h-text_h)/2
        if (options.x == 'center') options.x = '(w-text_w)/2';
        if (options.y == 'center') options.y = '(h-text_h)/2';
            return new Promise((res, rej) => {
                execFile('ffmpeg', ['-i', video_path, '-vf', `drawtext=x=${options.x}:y=${options.y}:textfile=${options.text_file}:fontsize=${options.font_size}:fontfile=${options.font_file}:fontcolor_expr=000000%{eif\\\\: clip(255*(1*between(t\\, ${options.fade_in_start_time} + ${options.fade_in_duration}\\, ${options.fade_out_end_time} - ${options.fade_out_duration}) + ((t - ${options.fade_in_start_time})/${options.fade_in_duration})*between(t\\, ${options.fade_in_start_time}\\, ${options.fade_in_start_time} + ${options.fade_in_duration}) + (-(t - ${options.fade_out_end_time})/${options.fade_out_duration})*between(t\\, ${options.fade_out_end_time} - ${options.fade_out_duration}\\, ${options.fade_out_end_time}) )\\, 0\\, 255) \\\\: x\\\\: 2 }`, output_path], (err, stdout, stderr) => {
                    if (err) {
                        console.log(err);
                    }
                    console.log(stdout);
                }).on('exit', (code, signal) => {
                    res(0);
                });
            });
        }
    
    return {
        createZoomInEffectVideo: createZoomInEffectVideo,
        captureLastFrame: captureLastFrame,
        createVideoFromImage: createVideoFromImage,
        createBlend: createBlend,
        drawTextNoEffects: drawTextNoEffects,
        typeTextOnVideo: typeTextOnVideo,
        drawTextSlidingFromLeftToRight: drawTextSlidingFromLeftToRight,
        drawTextFadeInOutEffect: drawTextFadeInOutEffect
    }
}

module.exports = me();
