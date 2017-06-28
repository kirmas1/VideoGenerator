var winston = require('winston');
var ffmpeg = require('./ffmpeg');
var util = require('util');
var db = require('./db');

function generate(video) {

    winston.info(`manualVideoGenrator::generate::video = ${util.inspect(video)}`);
    return new Promise((resolve, reject) => {

        ffmpeg.createCustom(video)
            .then((resp) => {
                db.Video.update(video);
                resolve(video);
            })
            .catch((err) => {
                winston.info(err);
                reject(err);
            });
    });

}

module.exports = {
    generate: generate
}
