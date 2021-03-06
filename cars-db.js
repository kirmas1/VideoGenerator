var AWS = require('aws-sdk');
var fs = require('fs');
var s3 = new AWS.S3();
var carsPicturesBucket = 'car-pictures-data';
var carsKeyPrefix = 'SelectedModels';
const util = require('util');
var winston = require('winston');

var Client = require('mariasql');

module.exports = (function () {

    var c = new Client({
        host: 'carspecsdb.cb2xddqsnpgk.us-west-2.rds.amazonaws.com',
        user: 'admin',
        password: 'sasa8647'
    });

    var getCarSpecs = function (car) {

        winston.info('cars-db::getCarSpecs:: car is: ' + util.inspect(car));

        var prep = c.prepare('SELECT * FROM cars_specs.cars_specs WHERE \
                    model_make_id = :model_make_id AND \
                    model_name = :model_name AND \
                    model_year = :model_year');

        return new Promise((resolve, reject) => {
            c.query(prep({
                model_make_id: car.model_make,
                model_name: car.model_name,
                model_year: car.model_year
            }), function (err, rows) {
                if (err) {
                    winston.info(`cars-db::getCarSpecs::query err is: ${err}`);
                    reject(err);
                }
                winston.info(`cars-db::getCarSpecs::query rows[0] is: ${rows[0]}`);
                resolve(rows[0]);
            });
            //c.end();
        });
    }

    /*
        car = {
            model_make: 'Audi',
            model_name: 'RS8',
            model_trim: null,
            model_year: 2017,
            specs: {}
        }
        options - should include how many pictures to get and from which category (interior, engine ..)
        and most important the path to download the images to.
    
        options {
            total_count: number
            interior_count: number
            exterior_count: number
            engine_count: number
        }
        */
    var getCarPictures = function (car, options) {
        
        winston.info('cars-db:: db.getCarPictures');
        
        return new Promise((resolve, reject) => {

            var model_name = car.model_name.replace(' ', '+');
            var model_make = car.model_make.replace(' ', '+');
            var params = {
                Bucket: 'car-pictures-data',
                Prefix: `${carsKeyPrefix}/${model_make}+${model_name}+${car.model_year}`
            }

            s3.listObjects(params, function (err, data) {
                
                winston.info('cars-db:: getCarPictures:: s3.listObjects:: data returned: ' + util.inspect(data));
                
                if (err) {
                    winston.info(err, err.stack); // an error occurred
                    reject(1);
                } else if (data.Contents.length === 0) {
                    winston.info('------cars-db:: getCarPictures:: Error----------');
                    winston.info('cars-db:: getCarPictures:: data.Contents.length === 0');
                    winston.info('cars-db:: getCarPictures:: params: ');
                    winston.info(params);
                    reject(1);
                } else {

                    winston.info('cars-db:: getCarPictures:: getting images');

                    var total = data.Contents.length;
                    var ext_links = [];
                    var int_links = [];
                    var engine_links = [];


                    //Sort the result from the bucket
                    for (var i = 0; i < total; i++) {
                        if (data.Contents[i].Key.indexOf("interior") !== -1)
                            int_links.push(data.Contents[i].Key);
                        else if (data.Contents[i].Key.indexOf("engine") !== -1)
                            engine_links.push(data.Contents[i].Key);
                        else
                            ext_links.push(data.Contents[i].Key);
                    }
                    winston.info(`cars-db:: getCarPictures:: ext_links size: ${ext_links.length}\n`);
                    winston.info(`cars-db:: getCarPictures:: ext_links are:${ext_links}\n`);
                    winston.info(`cars-db:: getCarPictures:: int_links size: ${int_links.length}\n`);
                    winston.info(`cars-db:: getCarPictures:: int_links are:${int_links}\n`);
                    winston.info(`cars-db:: getCarPictures:: engine_links size: ${engine_links.length}\n`);
                    winston.info(`cars-db:: getCarPictures:: engine_links are:${engine_links}\n`);

                    //lets pick random links for each category
                    var randomLinks = [];

                    var counter = 0;
                    while (counter < options.exterior_count) {

                        var randomnumber = Math.floor(Math.random() * ext_links.length);

                        if (randomLinks.indexOf(ext_links[randomnumber]) > -1) continue;
                        randomLinks.push(ext_links[randomnumber]);
                        counter++;
                    }
                    counter = 0;
                    while (counter < options.interior_count) {
                        var randomnumber0 = Math.floor(Math.random() * int_links.length);
                        winston.info(`cars-db:: getCarPictures::secondWhile, randomnumber0: ${randomnumber0}\n`);
                        if (randomLinks.indexOf(int_links[randomnumber0]) > -1) continue;
                        randomLinks.push(int_links[randomnumber0]);
                        counter++;
                    }
                    counter = 0;
                    while (counter < options.engine_count && engine_links.length > 0) {

                        var randomnumber1 = Math.floor(Math.random() * engine_links.length);
                        winston.info(`cars-db:: getCarPictures::thirdWhile, randomnumber1: ${randomnumber1}\n`);
                        if (randomLinks.indexOf(engine_links[randomnumber1]) > -1) continue;
                        randomLinks.push(engine_links[randomnumber1]);
                        counter++;
                    }

                    //last check

                    if (randomLinks.length < options.total_count) {
                        
                        var allImagesLinks = ext_links.concat(int_links).concat(engine_links);

                        //TODO - change true to check there are enough images left
                        while (randomLinks.length < options.total_count && (true)) {

                            var randomnumber1 = Math.floor(Math.random() * allImagesLinks.length);
                            winston.info(`cars-db:: getCarPictures::last check, randomnumber1: ${randomnumber1}\n`);
                            if (randomLinks.indexOf(allImagesLinks[randomnumber1]) > -1) continue;
                            randomLinks.push(allImagesLinks[randomnumber1]);
                            counter++;
                        }
                    }

                    winston.info('cars-db:: getCarPictures:: Before Shuffle, randomLinks are: ' + util.inspect(randomLinks));

                    //Lets shuffle (excluding first one )
                    for (var i = randomLinks.length - 1; i > 0; i--) {
                        var j = Math.floor(Math.random() * i + 1);
                        var temp = randomLinks[i];
                        randomLinks[i] = randomLinks[j];
                        randomLinks[j] = temp;
                    }

                    winston.info('cars-db:: getCarPictures:: After Shuffle, randomLinks are: ' + util.inspect(randomLinks));

                    var downloads = randomLinks.map((_link, index) => {
                        return new Promise((res, rej) => {
                            var params = {
                                Bucket: carsPicturesBucket,
                                Key: _link
                            };
                            winston.info('cars-db:: getCarPictures:: creating writeStream to: ' + `${options.path}/${index}.jpg`);

                            var file = fs.createWriteStream(`${options.path}/${index}.jpg`);
                            s3.getObject(params)
                                .createReadStream()
                                .pipe(file)
                                .on('finish', () => {
                                    res(0);
                                });
                        });
                    });

                    Promise.all(downloads)
                        .then(() => {
                            winston.info('cars-db:: getCarPictures:: downloads finished ok');
                            resolve(0)
                        })
                        .catch((err) => {
                            winston.info('cars-db:: getCarPictures:: downloads err: ' + err);
                            reject(-1)
                        });

                } //end of last else
            }); //end of s3.listObjects

        }); //end of return new Promise
    }

    return {
        /*
        car = {
                model_make: 'Audi',
                model_name: 'RS8',
                model_trim: null,
                model_year: 2017
            }
        */
        getCarSpecs: getCarSpecs,
        getCarPictures: getCarPictures
    }

}())
