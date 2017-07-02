var fs = require('fs');
var shortid = require('shortid');
var carsDB = require('./cars-db');
var Car = require('./car');
var ffmpeg = require('./ffmpeg');
var util = require('util');
var tts = require('./tts');
var configuration = require('./configuration');
var mp3Duration = require('mp3-duration');
var nlp = require('./nlp');
var scraper = require('./scraper');
var winston = require('winston');
var db = require('./db');

var performanceLogger = new(winston.Logger)({
    transports: [
      new(winston.transports.File)({
            filename: configuration.PERFORMANCE_LOG_PATH,
            maxsize: 1000,
            json: false,
            prettyPrint: true
        })
    ]
});

function generate(video) {

    var timeLogger_generate = performanceLogger.startTimer();

    winston.info(`automatic::generate::video = ${util.inspect(video)}`);

    video.info.tempFolder = createNewWorkShopFolder();
    video.metadata.state = 0;
    video.metadata.inProgress = true;
    db.Video.update(video);

    return new Promise((resolve, reject) => {

        Promise.resolve()
            .then(res =>

                nlp.analizeNLPhrase(video.metadata.phrase))

        .then(topic => {
                /***************************************
                 *
                 *  topic.id: 0 - car, model make+name+year //Custom
                 *            1 - car, model make+name      //Phrase
                 *            2 - car, model make  (manufacture) //Phrase
                 *            3 - anything else //Phrase
                 *            4 - URL
                 *
                 *  topic.searchablePhrases: [] //only for URL
                 ****************************************/
                if (topic.id === 0) {
                    video.metadata.origin = 1;
                    video.metadata.determinedTopic = video.metadata.phrase;
                    
                    return customCarScenario(topic, video, timeLogger_generate);

                } else if (topic.id === 1 || topic.id === 2 || topic.id === 3) {

                    /******************************************************
                     *
                     *    --------->   Phrase   <--------------
                     *
                     ******************************************************/
                    video.metadata.origin = 1;
                    video.metadata.determinedTopic = video.metadata.phrase; //Taking the full phrase as the topic of the clip. if misspell getSentences will fix.

                    //                    video.metadata.determinedTopic = topic.searchablePhrases[0];

                    return new Promise((resolve, reject) => {

                        var sentences;

                        winston.info(`automatic::generate:: topic.id ${topic.id}`);

                        scraper
                            .getSentences2(video.metadata.determinedTopic, configuration.VIDEO.SENTENCE_COUNT)

                        .then((result) => {

                                sentences = result.data;
                                video.metadata.determinedTopic = result.determinedTopic;
                                winston.info(`automatic::generate::after getSentences sentences are: ${util.inspect(sentences)}`);
                                
                                if (result.status === 2) {
                                    video.metadata.state = 2;
                                    video.metadata.inProgress = false;
                                    video.metadata.err_msg.push('No Sentences Found');
                                    db.Video.update(video);
                                    resolve(video);
                                } else 
                                return scraper.scrapeImages(video.metadata.determinedTopic, sentences.length, video.info.tempFolder, sentences.map((obj, index) => index));
                            })
                            .then((files) => {

                                return createInfo_General(files, sentences, video);
                            })
                            .then((video) => {
                                timeLogger_generate.done("automatic.generate");

                                return ffmpeg.createCustom(video);

                            })
                            .then((video) => {

                                db.Video.update(video);
                                resolve(video);
                            })
                            .catch((err) => {
                                winston.info(err);
                                reject(err);
                            });
                    });
                } else {

                    /******************************************************
                     *
                     *    --------->   URL   <--------------
                     *
                     ******************************************************/

                    video.metadata.origin = 2;
                    video.metadata.determinedTopic = topic.searchablePhrases[0];
                    video.metadata.url = video.metadata.phrase;

                    return new Promise((resolve, reject) => {

                        var sentences;

                        winston.info(`automatic::generate:: topic.id ${topic.id}`);

                        scraper
                            .getSentences3(video.metadata.url, video.metadata.determinedTopic, configuration.VIDEO.SENTENCE_COUNT)

                        .then((result) => {

                                sentences = result.data;
                                video.metadata.determinedTopic = result.determinedTopic;
                                winston.info(`automatic::generate::after getSentences sentences are: ${util.inspect(sentences)}`);

                                return scraper.scrapeImages(video.metadata.determinedTopic, sentences.length, video.info.tempFolder, sentences.map((obj, index) => index));

                            })
                            .then((files) => {
                                console.log('\n\n automatic::scrapeImages response is:' + util.inspect(files) + '\n\n')

                                return createInfo_General(files, sentences, video);
                            })
                            .then((video) => {
                                timeLogger_generate.done("automatic.generate");

                                return ffmpeg.createCustom(video);

                            })
                            .then((video) => {

                                db.Video.update(video);
                                resolve(video)
                            })
                            .catch((err) => {
                                winston.info(err);
                                reject(err);
                            });
                    });
                }


            })
            .then((res) => resolve(res));
    })
}
/*
topic includes {
    model_make:
    model_name:
    model_year:
    id
}

video is videoObject.
*/
function customCarScenario(topic, video, timeLogger_generate) {

    return new Promise((resolve, reject) => {

        Promise.resolve()
            .then(res => {
                winston.info(`automatic::customCarScenario::calling create car`);
                return createCar(topic);
            })
            .then((car) => {
                winston.info(`automatic::customCarScenario::calling getCarImages`);
                return getCarImages(car, video.info.tempFolder);

            })
            .then((car) => {
                winston.info(`automatic::customCarScenario::calling generateTTsAndSetCaptions`);
                return generateTTsAndSetCaptions(car, video.info.tempFolder);

            })
            .then((car) => {
                winston.info(`automatic::customCarScenario::calling createDataObjectFromCar`);
            
                return completeVideoObjectFromCar(car, video); //for ffmpeg

            })
            .then((video) => {
                timeLogger_generate.done("automatic.generate");

                return ffmpeg.createCustom(video);

            })
            .then((video) => {

                db.Video.update(video);
                resolve(video);
            })
            .catch((err) => {
                winston.info(err);
                reject(err);
            });
    });

}

/*
function customCarScenario(topic) {

    return new Promise((resolve, reject) => {

        Promise.resolve()
            .then(res => {
                winston.info(`automatic::generate::calling create car`);
                return createCar(topic)
            })
            .then((car) => {
                winston.info(`automatic::generate::calling getCarImages`);
                return getCarImages(car, video.info.tempFolder);

            })
            .then((car) => {
                winston.info(`automatic::generate::calling generateTTsAndSetCaptions`);
                return generateTTsAndSetCaptions(car, video.info.tempFolder);

            })
            .then((car) => {
                winston.info(`automatic::generate::calling createDataObjectFromCar`);
                return createDataObjectFromCar(car, video.info.tempFolder); //for ffmpeg

            })
            .then((details_for_ffmpeg) => {
                ffmpeg_details = details_for_ffmpeg;
                resolve(0);

            })
            .catch((err) => {
                winston.info(err);
                reject(err);
            });
    });

}
*/

/*
Get car images from S3
*/
function getCarImages(car, workshop) {
    winston.info('automatic:: getCarImages:: car is: ' + util.inspect(car));
    return new Promise((resolve, reject) => {
        carsDB.getCarPictures(car, {
                total_count: 5,
                interior_count: 2,
                exterior_count: 3,
                engine_count: 0,
                path: workshop
            })
            .then(() => resolve(car))
            .catch((err) => reject(err));
    });
}

function generateTTsAndSetCaptions(car, workshop) {

    winston.info('automatic::generateTTsAndSetCaptions::');

    var allTexts = car.generateAllTexts();

    winston.info(`automatic::generateTTsAndSetCaptions::allTexts: ${util.inspect(allTexts)}`);

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
                                winston.info(`automatic::generateTTsAndSetCaptions::mp3Duration thorw error: ${err}`);
                            }
                            car.allTexts[index].tts_file_len = duration;
                            res(0);
                        });
                    });

                });

                Promise.all(_map).then(response => resolve(car));
            }) //end of then
            .catch((err) => winston.info(`automatic::generateTTsAndSetCaptions::tts.synyhesize thorw error: ${err}`));
    }); //end of Promise
}


function createInfo_General(files, sentences, video) {

    winston.info(`automatic::createInfo_General:: sentences are: ${util.inspect(sentences)}`);
    return new Promise((resolve, reject) => {

        var slidesInfo = [];
        var itr = 0;
        var slides = [];
        for (; itr < sentences.length; itr++) {
            slides.push({
                type: 0,
                fileName: files[itr].fileName,
                fileURL: files[itr].fileURL,
                caption: {
                    text: sentences[itr],
                    font: 'Open Sans',
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
                    style: itr
                },
                duration: Math.floor(8)
            })
        }
        //        var slides = sentences.map((sentence, index) => {
        //
        //            return {
        //                type: 0,
        //                fileName: files[index].fileName,
        //                fileURL: files[index].fileURL,
        //                caption: {
        //                    text: sentence,
        //                    font: 'Open Sans',
        //                    fontsize: 72,
        //                    bold: true,
        //                    italic: false,
        //                    effect: 4,
        //                    //effect: Math.floor(Math.random() * (3)), //random of 0,1,2
        //                    startTime: 0,
        //                    duration: 4 //Doesn't matter when tts is true! Or when effect=1 (Sliding from left)
        //                },
        //                tts: {
        //                    enable: false
        //                },
        //                zoom: {
        //                    enabled: true,
        //                    style: 2
        //                },
        //                duration: Math.floor(8)
        //            };
        //        })

        var transitions = [];
        for (itr = 0; itr < sentences.length; itr++) {
            transitions.push({
                type: 1,
                duration: 2,
                effect: {
                    type: 1,
                    uncover: itr + 1
                }
            })
        }
        //        var transitions = sentences.map((ele, index) => {
        //
        //            return {
        //                type: 1,
        //                duration: 2,
        //                effect: {
        //                    type: 1,
        //                    uncover: 1
        //                }
        //            };
        //        })

        slides.forEach((ele, index) => {

            if (index === slides.length - 1)
                slidesInfo.push(ele);
            else {
                slidesInfo.push(ele);
                slidesInfo.push(transitions[index]);
            }

        });

        video.info.slidesInfo = slidesInfo;

        resolve(video);

    });
}


function completeVideoObjectFromCar(car, video) {

    winston.info('automatic:: completeVideoObjectFromCar:: car is: ' + util.inspect(car));

    winston.info('automatic:: completeVideoObjectFromCar:: video is: ' + util.inspect(video));

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
            file_path: `${video.info.tempFolder}/0.mp3`,
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
            file_path: `${video.info.tempFolder}/1.mp3`,
            file_len: car.allTexts[1].tts_file_len,
            startTime: 2
        },
        zoom: {
            enabled: true,
            style: 1
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
            file_path: `${video.info.tempFolder}/2.mp3`,
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
            file_path: `${video.info.tempFolder}/3.mp3`,
            file_len: car.allTexts[2].tts_file_len,
            startTime: 2
        },
        zoom: {
            enabled: true,
            style: 2
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
            type: 1,
            uncover: 2
            //type: Math.floor(Math.random() * (2)), //random of 0,1
            //uncover: Math.floor(Math.random() * (3)) //random of 0,1,2
        }
    };
    var transition2 = {
        type: 1,
        duration: 1,
        effect: {
            type: 0, //random of 0,1
            uncover: null
            //uncover: Math.floor(Math.random() * (3)) //random of 0,1,2
        }
    };
    var transition3 = {
        type: 1,
        duration: 2,
        effect: {
            type:1,
            uncover:0
            //type: Math.floor(Math.random() * (2)), //random of 0,1
            //uncover: Math.floor(Math.random() * (3)) //random of 0,1,2
        }
    };
    
    return new Promise((res, rej) => {

        video.info.slidesInfo = [slide0, transition0, slide1, transition1, slide2, transition2, slide3, transition3, slide4];
        
        res(video);

    });
}

/*
Deprecated!!

This function should be called when all the images and text and ready. So it can create details object for ffmpeg.createCustom
*/
function createDataObjectFromCar(car, workshop) {
    winston.info('automatic:: createDataObjectFromCar:: car is: ' + util.inspect(car));

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
                file_path: `${video.info.tempFolder}/0.mp3`,
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
                file_path: `${video.info.tempFolder}/1.mp3`,
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
                file_path: `${video.info.tempFolder}/2.mp3`,
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
                file_path: `${video.info.tempFolder}/3.mp3`,
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

        winston.info('automatic:: createDataObjectFromCar:: resolving: ' + util.inspect({
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

    var path = configuration.OS == 'linux' ? `./workshop/${newFolderName}` : `workshop/${newFolderName}`;

    if (fs.existsSync(path)) {
        //create new newFolderName..
    } else {
        fs.mkdirSync(path);
    }

    return path;
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
