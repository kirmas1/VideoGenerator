var textrank = require('textrank-node');
var osmosis = require('osmosis');
const request = require('request');
const fs = require('fs');
const util = require('util');
var winston = require('winston');
var config = require('./configuration');

/*
summerize the first p of wikipedia and returns array of the n most important sentences
*/
function getSentences(topic, n) {

    return new Promise((resolve, reject) => {

        var result = [];
        winston.info(`scraper::getSentences:: topic is: ${topic} \n n is ${n}`);

        osmosis
            .get('https://en.wikipedia.org/wiki/Main_Page')
            .submit(".//*[@id='searchButton']", {
                search: topic
            })
            .set({
                'followLinkInCaseOfMissMatch': [".//*[@id='mw-content-text']/div[2]/ul/li[1]/div[1]/a"],
                'first_ps': [`//p[position() < ${config.WIKI_P_COUNT + 1} and parent::div]`] //index starting from 1 (Xpath..)
            })
            .data(function (data) {

                function removeRoundBrackets(str) {

                    function cutTheBullshit(str) {

                        var i = 0;
                        var counter = 0;
                        var firstIndex = -1;

                        while (i < str.length) {

                            if (str.charAt(i) === '(') {

                                counter++;
                                if (counter === 1) firstIndex = i;
                            }

                            if (str.charAt(i) === ')') {
                                if (counter === 1)
                                    return str.substr(0, firstIndex) + str.substr(i + 1);
                                else if (counter > 1) {
                                    counter--;
                                }
                            }

                            i++;
                        }
                    }

                    while (str.indexOf('(') !== -1)
                        str = cutTheBullshit(str);
                    return str;

                };

                function removeSquareBrackets(str) {

                    function cutTheBullshit(str) {

                        var i = 0;
                        var counter = 0;
                        var firstIndex = -1;

                        while (i < str.length) {

                            if (str.charAt(i) === '[') {

                                counter++;
                                if (counter === 1) firstIndex = i;
                            }

                            if (str.charAt(i) === ']') {
                                if (counter === 1)
                                    return str.substr(0, firstIndex) + str.substr(i + 1);
                                else if (counter > 1) {
                                    counter--;
                                }
                            }

                            i++;
                        }
                    }

                    while (str.indexOf('[') !== -1) {
                        console.log('str:' + '\n' + str);
                        str = cutTheBullshit(str);
                    }

                    return str;

                };

                if (data.first_ps[0].indexOf('does not exist') !== -1) {

                    if (data.followLinkInCaseOfMissMatch.length === 0) {
                        winston.info(`scraper::getSentences:: Didnt found anything on wiki and no alternatives from wiki`);
                        reject(1);
                    }

                    winston.info(`scraper::getSentences:: Didnt found anything on wiki trying first suggestion of wiki`);

                    osmosis
                        .follow(".//*[@id='mw-content-text']/div[2]/ul/li[1]/div[1]/a")
                        .set({
                            'first_ps': [`//p[position() < ${config.WIKI_P_COUNT + 1} and parent::div]`]
                        })
                        .data(function (data) {
                            console.log(`scraper::getSentences:: data after retry = ${data.first_ps}`);
                        })
                }


                var filtered_p_s = data.first_ps.filter(function (word) {
                    return word.length > 0;
                })

                var summarizer = new textrank();
                var firstPIndex = 0;

                while (true) {
                    if (filtered_p_s[firstPIndex].toLowerCase().indexOf(topic.toLowerCase()) >= 0)
                        break;
                    if (filtered_p_s.length - 1 === firstPIndex) {
                        firstPIndex = 0;
                        break;
                    }
                    firstPIndex++;
                }
                var firstP = removeRoundBrackets(removeSquareBrackets(filtered_p_s[firstPIndex]));

                var sentences = summarizer.splitToSentences(firstP).filter(function (word) {
                    return word.length > 10;
                });

                var similarityGraph = summarizer.getSimilarityGraph(sentences);
                var textRank = summarizer.getTextRank(similarityGraph).probabilityNodes;
                var selectedIndex = summarizer.getSelectedIndex(textRank, n);

                function sortNumber(a, b) {
                    return a - b;
                }

                selectedIndex.sort(sortNumber);
                for (i in selectedIndex) {
                    result.push(sentences[i]);
                }

                winston.info(`scraper::getSentences:: result is:: ${util.inspect(result)}`);
                resolve(result);
            })
    });
}

/*
Get pharse and search for it in wikipedia. 
Return a Promise of object as following: 
{
    status: int, // 0 = Phrase exist on wiki and data contains first P.
                    1 = Phrase not exist on wiki but wiki suggest misspell, and data contains first P of wiki suggestion
                    2 = Phrase not exist at all. data is null
    data: string
}

Basically go for wiki main page and search the phrase then ..
*/
function scrapeWiki(pharse) {

    function a(phrase) {

        return new Promise((resolve, reject) => {

            var result = {
                status: null, // 0 - ok. 1 - try suggestion. 2 - failed and there is no suggestion
                data: null
            };

            osmosis
                .get('https://en.wikipedia.org/wiki/Main_Page')
                .submit(".//*[@id='searchButton']", {
                    search: phrase
                })
                .set({
                    'followLinkInCaseOfMissMatch': [".//*[@id='mw-content-text']/div[2]/ul/li[1]/div[1]/a"],
                    'first_ps': [`//p[position() < 2 and parent::div]`] //index starting from 1 (Xpath..)
                })
                .then(function (context, data, next, done) {

                    if (data.first_ps[0].indexOf('does not exist') !== -1) {
                        if (data.followLinkInCaseOfMissMatch.length === 0)
                            result.status = 2;
                        else
                            result.status = 1;
                    } else {
                        result.status = 0;
                        result.data = data.first_ps[0];
                    }
                    done();
                })
                .done(function () {
                    resolve(result);
                })
        })
    }

    function b(phrase) {
        return new Promise((resolve, reject) => {
            var result;

            osmosis
                .get('https://en.wikipedia.org/wiki/Main_Page')
                .submit(".//*[@id='searchButton']", {
                    search: phrase
                })
                .follow(".//*[@id='mw-content-text']/div[2]/ul/li[1]/div[1]/a")
                .set({

                    'first_ps': [`//p[position() < 2 and parent::div]`] //index starting from 1 (Xpath..)
                })
                .then(function (context, data, next, done) {
                    //TODO check for errors
                    result = data.first_ps[0]
                    done();
                })
                .done(function () {
                    resolve(result);
                })
        })
    }

    return new Promise((resolve, reject) => {

        var finalResult = {
            status: null,
            data: null
        }

        a(pharse)
            .then((result) => {

                if (result.status === 0) {

                    finalResult.status = 0;
                    finalResult.data = result.data;
                    resolve(finalResult);

                } else if (result.status === 1) {
                    b(pharse)
                        .then((result) => {
                            finalResult.status = 1;
                            finalResult.data = result;
                            resolve(finalResult);
                        })
                } else {
                    finalResult.status = 2;
                    finalResult.data = "The phrase isn't exist on wiki";
                    resolve(finalResult);
                }
                
            })
    })

}

/*
Download images from the internet using BingAPI to get the resources. 
*/
function scrapeImages(topic, n, path, fileNames) {

    return new Promise((resolve, reject) => {

        request({
            uri: `https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=${topic}&count=${n*5}`,
            method: "GET",
            headers: {
                'Ocp-Apim-Subscription-Key': '584ae6a3e97f413490148afa8fe95491',
                'imageType': 'Photo',
                'license': 'Any',
                'size': 'Large'
            },

        }, function (err, res, body) {

            if (res && res.statusCode !== 200) {
                err = new Error(body);
            } else {
                // Parse body, if body
                body = typeof body === 'string' ? JSON.parse(body) : body;
            }
            winston.info(`scraper::scrapeImages:: body.value.length is: ${body.value.length}`);

            sanitize(body.value, n)
                .then((sanitizedBodyValue) => {

                    winston.info(`scraper::scrapeImages:: sanitizedBodyValue.length is:  ${sanitizedBodyValue.length}`);

                    var downloadImagesPromise = sanitizedBodyValue.map((ele, index) => {
                        return downloadFile(ele.contentUrl, `${path}/${fileNames[index]}.${ele.encodingFormat}`);
                    })

                    Promise.all(downloadImagesPromise)
                        .then(res => resolve(res));
                });
        })

        function sanitize(body, n) {

            return new Promise((resolve, reject) => {

                var result = [];

                var fn = function (j, cb) {
                    if (result.length < n && j < body.length - 1) {
                        //                        winston.info(`inside if`);
                        request.head(body[j].contentUrl, function (err, res, bodyy) {
                            res = res || '';
                            if (res.headers['content-type'].startsWith('image/jpeg'))
                                result.push(body[j]);
                            fn(++j, cb);
                        });
                    } else cb(result);

                }

                fn(0, function (r) {
                    resolve(r)
                });
            });
        }
    });
}

function downloadFile(uri, filename) {

    return new Promise((resolve, reject) => {
        //        request.head(uri, function (err, res, body) {
        //            winston.info('----------------------------------------------');
        //            winston.info('content-type:', res.headers['content-type']);
        //            winston.info('content-length:', res.headers['content-length']);
        winston.info('scraper::downloadFile::uri:', uri);
        //            winston.info('----------------------------------------------');
        //
        request(uri)
            .pipe(fs.createWriteStream(filename))
            .on('close', () => {
                winston.info(`scraper::downloadFile:: close pipe`);
                resolve(filename.substr(filename.lastIndexOf('/') + 1));
            });
        //        });
    });
};

module.exports = {
    getSentences: getSentences,
    scrapeImages: scrapeImages,
    scrapeWiki: scrapeWiki
}

