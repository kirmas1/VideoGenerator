var winston = require('winston');
var util = require('util');
var videoTable = require('./videoTable');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./aws.config.json');
var dynamodb = new AWS.DynamoDB();

var formatDate = function (date) {
    var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
        ];

    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return day + ' ' + monthNames[monthIndex] + ' ' + year;
}

module.exports = {
    res: {
        video: {
            newByPhrase: function (input_phrase) {

                return new Promise((resolve, reject) => {
                    winston.log(`db::newByPhrase:: phrase = ${input_phrase}`);

                    videoTable.putItem({
                        clientName: 'Sagi',
                        videoName: input_phrase,
                        metadata: {
                            origin: 1,
                            phrase: input_phrase,
                            url: null,
                            timeCreated: (new Date()).toString(), //The request
                            ffmpegProcessDuration: null,
                            link: null,
                            state: -1,
                            inProgress: false
                        },
                        info: {
                            tempFolder: null,
                            audio: {
                                enable: true,
                                file_path: 'assets/bg_music_0.mp3'
                            },
                            slidesInfo: []
                        }
                    }, {
                        ReturnValues: "ALL_OLD"
                    }, function (err, data) {
                        if (err) {
                            winston.info(`db.res.video.putItem err = ${err}, err.stack = ${err.stack}`);
                            reject(err);
                        } else {
                            resolve(data.Items)
                        };
                    });
                });
            },
            getAll: function () {
                return new Promise((resolve, reject) => {

                    console.log('db::getAll');

                    var params = {
                        ExpressionAttributeNames: {
                            "#clientName": "clientName"
                        },
                        ExpressionAttributeValues: {
                            ":a": {
                                S: "Sagi"
                            }
                        },
                        FilterExpression: "#clientName = :a",
                        TableName: "Videos"
                    };

                    dynamodb.scan(params, function (err, data) {
                        if (err) {
                            winston.info(`db.res.video.getAll err = ${err}, err.stack = ${err.stack}`);
                            reject(err);
                        } else {
                            resolve(data.Items)
                        };
                    });
                })
            },
            update: function (item) {
                winston.info(`db::update::`);

                //videoList[item.id] = item;

                videoTable.updateItem({
                    TableName: 'Videos',
                    Key: {
                        clientName: item.clientName,
                        videoName: item.videoName
                    },
                    UpdateExpression: 'SET #I = :i, #M = :m',
                    ExpressionAttributeNames: {
                        '#I': 'info',
                        '#M': 'metadata'
                    },
                    ExpressionAttributeValues: {
                        ':i': item.info,
                        ':m': item.metadata
                    },
                    ReturnValues: "ALL_NEW"
                });

                return 0;

            }
        }
    }
}
