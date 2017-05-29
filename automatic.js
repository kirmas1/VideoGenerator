var fs = require('fs');
var shortid = require('shortid');
var db = require('./cars-db');
var Car = require('./car');
var ffmpeg = require('./ffmpeg');
var util = require('util');
var tts = require('./tts');
var configuration = require('./configuration');
var mp3Duration = require('mp3-duration');
var nlp = require('./nlp');
var scraper = require('./scraper');

function generate(phrase) {

    console.log(`automatic::generate::start`);

    var new_folder = createNewWorkShopFolder();
    var ffmpeg_details;
    var workshop = configuration.OS == 'linux' ? `./workshop/${new_folder}` : `workshop/${new_folder}`;


    return new Promise((resolve, reject) => {

        Promise.resolve()
            .then(res => {

                console.log(`automatic::generate:: call nlp.analizeNLPhrase(phrase)`);

                return nlp.analizeNLPhrase(phrase);
            })
            .then(topic => {

                console.log(`automatic::generate:: nlp.analizeNLPhrase(phrase) return value: ${util.inspect(topic)}`);

                /***************************************
                 *
                 * topic.id: 0 - car, model make+name+year
                 *           1 - car, model make+name
                 *           2 - car, model make  (manufacture)
                 *           3 - anything else
                 ****************************************/
                if (topic.id === 0) {
                    return new Promise((resolve, reject) => {

                        Promise.resolve()
                            .then(res => {
                                console.log(`automatic::generate::calling create car`);
                                return createCar(topic)
                            })
                            .then((car) => {
                                console.log(`automatic::generate::calling getCarImages`);
                                return getCarImages(car, workshop);

                            })
                            .then((car) => {
                                console.log(`automatic::generate::calling generateTTsAndSetCaptions`);
                                return generateTTsAndSetCaptions(car, workshop);

                            })
                            .then((car) => {
                                console.log(`automatic::generate::calling createDataObjectFromCar`);
                                return createDataObjectFromCar(car, workshop); //for ffmpeg

                            })
                            .then((details_for_ffmpeg) => {
                                ffmpeg_details = details_for_ffmpeg;
                                resolve(0);

                            })
                            .catch((err) => {
                                console.log(err);
                                reject(err);
                            });
                    });
                } else if (topic.id === 1) {
                    //car.model_make && car.model_name
                } else if (topic.id === 2 || topic.id === 3) {
                    //car.model_make
                    return new Promise((resolve, reject) => {

                        var sentences;

                        console.log(`automatic::generate:: topic.id === 2`);
                        scraper
                            .getSentences(phrase, 5)
                            .then((result) => {

                                sentences = result;
                                console.log(`automatic::generate::after getSentences sentences are: ${util.inspect(sentences)}`);

                                return scraper.scrapeImages(phrase, sentences.length, workshop, sentences.map((obj, index) => index))
                            })
                            .then(() => {
                                return createDataObjectGeneral(sentences, workshop);
                            })
                            .then((details_for_ffmpeg) => {
                                ffmpeg_details = details_for_ffmpeg;
                                resolve(0);

                            })
                            .catch((err) => {
                                console.log(err);
                                reject(err);
                            });
                    });
                } else {
                    resolve(`cant prepare for this kind of topic. topic.id=${topic.id}`);
                }
            })
            .then(res => {
                if (res === -1) return 'under constructions';

                console.log(`automatic::generate:: prepare(topic) return value: ${res}`);
                console.log(`automatic::generate:: new_folder value: ${new_folder}`);
                console.log(`automatic::generate:: ffmpeg_details value: ${util.inspect(ffmpeg_details)}`);

                return ffmpeg.createCustom(ffmpeg_details, new_folder);
            })
            .then(res => {
                resolve(res);
            })
    })
}

/*
Get car images from S3
*/
function getCarImages(car, workshop) {
    console.log('automatic:: getCarImages:: car is: ' + util.inspect(car));
    return new Promise((resolve, reject) => {
        db.getCarPictures(car, {
                total_count: 5,
                interior_count: 3,
                exterior_count: 2,
                engine_count: 0,
                path: workshop
            })
            .then(() => resolve(car))
            .catch((err) => reject(err));
    });
}

function generateTTsAndSetCaptions(car, workshop) {

    console.log('automatic::generateTTsAndSetCaptions::');

    var allTexts = car.generateAllTexts();

    console.log(`automatic::generateTTsAndSetCaptions::allTexts: ${util.inspect(allTexts)}`);

    var tts_options = allTexts.map((item, index) => {
        return {
            text: item.text,
            voiceId: null,
            path: `${workshop}/${index}.mp3`
        };
    });

    return new Promise((resolve, reject) => {

        tts.synthesize({
                items: tts_options
            })
            .then(response => {

                var _map = tts_options.map((ele, index) => {

                    return new Promise((res, rej) => {

                        mp3Duration(ele.path, function (err, duration) {
                            if (err) {
                                car.allTexts[index].tts_file_len = -1;
                                console.log(`automatic::generateTTsAndSetCaptions::mp3Duration thorw error: ${err}`);
                            }
                            car.allTexts[index].tts_file_len = duration;
                            res(0);
                        });
                    });

                });

                Promise.all(_map).then(response => resolve(car));
            }) //end of then
            .catch((err) => console.log(`automatic::generateTTsAndSetCaptions::tts.synyhesize thorw error: ${err}`));
    }); //end of Promise
}


function createDataObjectGeneral(sentences, workshop) {

    console.log(`automatic::createDataObjectGeneral:: sentences are: ${util.inspect(sentences)}`);
    return new Promise((resolve, reject) => {

        var slidesInfo = [];

        var slides = sentences.map((sentence, index) => {

            return {
                type: 0,
                fileName: `${index}.jpeg`,
                caption: {
                    text: sentence,
                    font: 'OpenSans',
                    fontsize: 72,
                    bold: true,
                    italic: false,
                    effect: 4,
                    //effect: Math.floor(Math.random() * (3)), //random of 0,1,2
                    startTime: 0,
                    duration: 4 //Doesn't matter when tts is true! Or when effect=1 (Sliding from left)
                },
                tts: {
                    enable: false
                },
                zoom: {
                    enabled: true,
                    style: 2
                },
                duration: Math.floor(8)
            };
        })

        var transitions = sentences.map((ele, index) => {

            return {
                type: 1,
                duration: 2,
                effect: {
                    type: 1,
                    uncover: 1
                }
            };
        })

        slides.forEach((ele, index) => {

            if (index === slides.length - 1)
                slidesInfo.push(ele);
            else {
                slidesInfo.push(ele);
                slidesInfo.push(transitions[index]);
            }

        });

        resolve({
            videoName: 'Unknown',
            audio: {
                enable: true,
                file_path: 'assets/bg_music_0.mp3'
            },
            slidesInfo: slidesInfo
        });
    });
}

/*
This function should be called when all the images and text and ready. So it can create details object for ffmpeg.createCustom
*/
function createDataObjectFromCar(car, workshop) {
    console.log('automatic:: createDataObjectFromCar:: car is: ' + util.inspect(car));
    return new Promise((res, rej) => {
        var slide0 = {
            type: 0,
            fileName: '0.jpg',
            caption: {
                text: `${car.model_year} ${car.model_make} ${car.model_name}`,
                font: 'Georgia',
                font_color: 'white',
                fontsize: 100,
                bold: false,
                italic: false,
                effect: 2,
                //effect: Math.floor(Math.random() * (3)), //random of 0,1,2
                startTime: 0,
                duration: 3,
                x: 'center',
                y: '(h-text_h)/3'
            },
            tts: {
                enable: false
            },
            zoom: {
                enabled: false,
                style: 0
            },
            duration: 3
        };

        var slide1 = {
            type: 0,
            fileName: '1.jpg',
            caption: {
                text: car.allTexts[0].text,
                font: 'OpenSans',
                fontsize: 72,
                bold: true,
                italic: false,
                effect: 3,
                //effect: Math.floor(Math.random() * (3)), //random of 0,1,2
                startTime: 0,
                duration: 4 //Doesn't matter when tts is true! Or when effect=1 (Sliding from left)
            },
            tts: {
                enable: true,
                file_path: `${workshop}/0.mp3`,
                file_len: car.allTexts[0].tts_file_len,
                startTime: 1
            },

            zoom: {
                enabled: true,
                style: 2
            },
            duration: Math.floor(car.allTexts[0].tts_file_len + 4)
        };

        var slide2 = {
            type: 0,
            fileName: '2.jpg',
            caption: {
                text: car.allTexts[1].text,
                font: 'OpenSans',
                fontsize: 72,
                bold: true,
                italic: false,
                effect: 3,
                //effect: Math.floor(Math.random() * (3)), //random of 0,1,2
                startTime: 0,
                duration: 4
            },
            tts: {
                enable: true,
                file_path: `${workshop}/1.mp3`,
                file_len: car.allTexts[1].tts_file_len,
                startTime: 2
            },
            zoom: {
                enabled: true,
                style: 2
            },
            duration: Math.floor(car.allTexts[1].tts_file_len + 6)
        };

        var slide3 = {
            type: 0,
            fileName: '3.jpg',
            caption: {
                text: car.allTexts[2].text,
                font: 'OpenSans',
                fontsize: 72,
                bold: true,
                italic: false,
                effect: 3,
                startTime: 1,
                duration: 7
            },
            tts: {
                enable: true,
                file_path: `${workshop}/2.mp3`,
                file_len: car.allTexts[2].tts_file_len,
                startTime: 2
            },
            zoom: {
                enabled: true,
                style: 0
            },
            duration: Math.floor(car.allTexts[2].tts_file_len + 4)
        };

        var slide4 = {
            type: 0,
            fileName: '4.jpg',
            caption: {
                text: car.allTexts[3].text,
                font: 'OpenSans',
                fontsize: 72,
                bold: true,
                italic: false,
                effect: 3,
                startTime: 1,
                duration: 7
            },
            tts: {
                enable: true,
                file_path: `${workshop}/3.mp3`,
                file_len: car.allTexts[2].tts_file_len,
                startTime: 2
            },
            zoom: {
                enabled: true,
                style: 0
            },
            duration: Math.floor(car.allTexts[2].tts_file_len + 4)
        };

        var transition0 = {
            type: 1,
            duration: 2,
            effect: {
                type: 1,
                uncover: 1
            }
        };
        var transition1 = {
            type: 1,
            duration: 2,
            effect: {
                type: Math.floor(Math.random() * (2)), //random of 0,1
                uncover: Math.floor(Math.random() * (3)) //random of 0,1,2
            }
        };
        var transition2 = {
            type: 1,
            duration: 1,
            effect: {
                type: 1, //random of 0,1
                uncover: Math.floor(Math.random() * (3)) //random of 0,1,2
            }
        };
        var transition3 = {
            type: 1,
            duration: 2,
            effect: {
                type: Math.floor(Math.random() * (2)), //random of 0,1
                uncover: Math.floor(Math.random() * (3)) //random of 0,1,2
            }
        };

        console.log('automatic:: createDataObjectFromCar:: resolving: ' + util.inspect({
            videoName: 'Unknown',
            audio: {
                enable: true,
                file_path: 'assets/bg_music_0.mp3'
            },
            slidesInfo: [slide0, transition0, slide1, transition1, slide2, transition2, slide3, transition3, slide4]
        }));

        res({
            videoName: 'Unknown',
            audio: {
                enable: true,
                file_path: 'assets/bg_music_0.mp3'
            },
            slidesInfo: [slide0, transition0, slide1, transition1, slide2, transition2, slide3, transition3, slide4]
        });
    });
}


function createNewWorkShopFolder() {
    var newFolderName = shortid.generate();

    if (fs.existsSync('./workshop/' + newFolderName)) {
        //create new newFolderName..
    } else {
        fs.mkdirSync('./workshop/' + newFolderName);
    }

    return newFolderName;
}

function createCar(topic) {
    return new Car(topic.model_make, topic.model_name, topic.model_year);
}


/*
exporting function that do all the job
*/


module.exports = {
    generate: generate
}
