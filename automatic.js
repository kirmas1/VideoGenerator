var fs = require('fs');
var shortid = require('shortid');
var db = require('./cars-db');
var Car = require('./car');
var ffmpeg = require('./ffmpeg');
var util = require('util');
var tts = require('./tts');
var configuration = require('./configuration');
var mp3Duration = require('mp3-duration');


function generate(phrase) {

    console.log(`automatic::generate::creating fake car topic`);
    //TO DO
    var topic = {
        model_make: 'BMW',
        model_name: 'M4',
        model_year: 2017
    };

    return new Promise((resolve, reject) => {

        Promise.resolve()
            .then(res => {
                return prepare(topic)
            })
            .then(res => {
                return ffmpeg.createCustom(res.d, res.nf)
            })
            .then(res => {
                resolve(res);
            })
    })
}
/*
This function should be responsible to get topic as input and set the ground for ffmpeg.generateCustom
*/
function prepare(topic) {
    console.log(`automatic::prepare::`);
    var new_folder = createNewWorkShopFolder();

    var workshop = configuration.OS == 'linux' ? `./workshop/${new_folder}` : `workshop/${new_folder}`;

    console.log(`automatic::prepare::workshop= ${workshop}`);

    return new Promise((resolve, reject) => {

        Promise.resolve()

        .then(res => {
            console.log(`automatic::prepare::calling create car`);
            return createCar(topic)
        })

        .then((car) => {
            console.log(`automatic::prepare::calling getCarImages`);
            return getCarImages(car, workshop);

        })

        .then((car) => {
            console.log(`automatic::prepare::calling generateTTsAndSetCaptions`);
            return generateTTsAndSetCaptions(car, workshop);

        })

        .then((car) => {
            console.log(`automatic::prepare::calling createDataObject`);
            return createDataObject(car, workshop); //for ffmpeg

        })

        .then((details_for_ffmpeg) => {
                console.log(`automatic::prepare::resolve`);
                resolve({
                    d: details_for_ffmpeg,
                    nf: new_folder
                });

            })
            .catch((err) => {
                console.log(err);
                reject(err);
            });
    });
}

function getCarImages(car, workshop) {
    console.log('automatic:: getCarImages:: car is: ' + util.inspect(car));
    return new Promise((resolve, reject) => {
        db.getCarPictures(car, {
                total_count: 2,
                interior_count: 0,
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
                                car.allTexts[index].len = -1;
                            }
                            car.allTexts[index].len = duration;
                            res(0);
                        });
                    });

                });

                Promise.all(_map)
                    .then(response => resolve(car));
            })
            .catch((err) => console.log(`automatic::generateTTsAndSetCaptions::tts.synyhesize thorw error: ${err}`));
    });
}

/*
This function should be called when all the images and text and ready. So it can create details object for ffmpeg.createCustom
*/
function createDataObject(car, workshop) {
    console.log('automatic:: createDataObject:: car is: ' + util.inspect(car));
    return new Promise((res, rej) => {
        var slide0 = {
            type: 0,
            fileName: '0.jpg',
            caption: {
                text: `${car.model_make} ${car.model_name} ${car.model_year}`,
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
                font: 'Arial',
                fontsize: 50,
                bold: false,
                italic: false,
                effect: 1,
                //effect: Math.floor(Math.random() * (3)), //random of 0,1,2
                startTime: 0,
                duration: 4
            },
            tts: true,
            tts_file: `${workshop}/0.mp3`,
            zoom: {
                enabled: true,
                style: 0
            },
            duration: Math.floor(car.allTexts[0].len + 2)
        };

        var slide3 = {
            type: 0,
            fileName: '3.jpg',
            caption: {
                text: car.allTexts[2].text,
                font: 'Arial',
                fontsize: 50,
                bold: true,
                italic: false,
                effect: 1,
                startTime: 0,
                duration: 7
            },
            tts: true,
            tts_file: `${workshop}/2.mp3`,
            zoom: {
                enabled: true,
                style: 0
            },
            duration: Math.floor(car.allTexts[2].len + 2)
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
            duration: 2,
            effect: {
                type: Math.floor(Math.random() * (2)), //random of 0,1
                uncover: Math.floor(Math.random() * (3)) //random of 0,1,2
            }
        };
        
        console.log('automatic:: createDataObject:: resolving: ' + util.inspect({
            videoName: 'Unknown',
            slidesInfo: [slide0, transition0, slide1]
        }));
        
        res({
            videoName: 'Unknown',
            slidesInfo: [slide0, transition0, slide1]
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
    prepare: prepare,
    generate: generate
}
