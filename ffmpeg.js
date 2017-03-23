const execFile = require('child_process').execFile;
//const exec = require('child_process').exec;


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
                }    
                else {
                    resolve(path_to_output);
                }         
            });
        })
    }


    return {
        createZoomInEffectVideo: createZoomInEffectVideo,
        captureLastFrame: captureLastFrame,
        createVideoFromImage: createVideoFromImage,
        createBlend: createBlend
    }
}



module.exports = me();
