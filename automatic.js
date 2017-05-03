var fs = require('fs');
var shortid = require('shortid');
var db = require('./cars-db');
var Car = require('./car');
var ffmpeg = require('./ffmpeg');
var util = require('util');



/*
This function should be responsible to get topic as input and set the ground for ffmpeg.generateCustom
*/
function prepare(topic) {

    var new_folder = createNewWorkShopFolder();

    return new Promise((resolve, reject) => {
        createCar(topic)
            .then((car) => {
                console.log('automatic:: prepare:: Car object is ready, trying to get images');
                console.log('automatic:: prepare:: car is: ' + util.inspect(car));
                return new Promise((resolve, reject) => {
                    db.getCarPictures(car, {
                            total_count: 4,
                            interior_count: 1,
                            exterior_count: 3,
                            engine_count: 0,
                            path: `./workshop/${new_folder}/`
                        })
                        .then(() => resolve(car))
                        .catch((err) => reject(err));
                });
            })
            .then((car) => {
                return createDataObject(car); //for ffmpeg
            })
            .then((details_for_ffmpeg) => {
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

/*
This function should be called when all the images and text and ready. So it can create details object for ffmpeg.createCustom
*/
function createDataObject(car) {
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
                duration: 4,
                x: 'center',
                y: '(h-text_h)/3'
            },
            zoom: {
                enabled: false,
                style: 0
            },
            duration: 6
        };
        var slide1 = {
            type: 0,
            fileName: '1.jpg',
            caption: {
                text: car.generateFirstSentence(),
                font: 'Arial',
                fontsize: 50,
                bold: false,
                italic: false,
                effect: 1,
                //effect: Math.floor(Math.random() * (3)), //random of 0,1,2
                startTime: 0,
                duration: 3
            },
            zoom: {
                enabled: true,
                style: 0
            },
            duration: 5
        };
        var slide2 = {
            type: 0,
            fileName: '2.jpg',
            caption: {
                text: car.generateSecondSentence(),
                font: 'Arial',
                fontsize: 50,
                bold: true,
                italic: false,
                effect: 1, //random of 0,1,2
                startTime: 0,
                duration: 4
            },
            zoom: {
                enabled: true,
                style: 0
            },
            duration: 6
        };
        var slide3 = {
            type: 0,
            fileName: '3.jpg',
            caption: {
                text: car.generateThirdSentence(),
                font: 'Arial',
                fontsize: 50,
                bold: true,
                italic: false,
                effect: 1,
                //                effect: Math.floor(Math.random() * (3)), //random of 0,1,2
                startTime: 0,
                duration: 4
            },
            zoom: {
                enabled: true,
                style: 0
            },
            duration: 6
        };
        var transition0 = {
            type: 1,
            duration: 2,
            effect: {
                type: Math.floor(Math.random() * (2)), //random of 0,1
                uncover: Math.floor(Math.random() * (3)) //random of 0,1,2
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

        res({
            videoName: 'Unknown',
            slidesInfo: [slide0, transition0, slide1, transition1, slide2, transition2, slide3]
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
    prepare: prepare
}
