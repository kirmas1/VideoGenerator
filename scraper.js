var textrank = require('textrank-node');
var summarizer = new textrank();
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
Get n most important sentences from wiki first P of the Topic.
Using textRank. return Promise.

Return a Promise of object as following: 
{
    status: int, // 0 = Phrase exist on wiki and data contains the sentences.
                    1 = Phrase not exist on wiki but wiki suggest misspell, and data contains the sentences of wiki suggestion
                    2 = Phrase not exist at all. data is null
    data: []
}

*/
function getSentences2(topic, n) {

    var result = {
        status: null,
        data: []
    };
    winston.info(`scraper::getSentences2:: topic is: ${topic} \n n is ${n} \n`);

    return new Promise((resolve, reject) => {

        scrapeWiki(topic)
            .then((resp) => {
                winston.info(`scraper::getSentences2::scrapeWiki resp = ${util.inspect(resp)}`);
                result.status = resp.status;
                result.determinedTopic = resp.determinedTopic;
                if (result.status === 2) resolve(result);
                else {
                    summerize(resp.data, n).then((sentences) => {
                        result.data = sentences;
                        resolve(result);
                    })
                }
            })
    })

}

/*
Get sentences for URL scenario.
Return a Promise of object as following: 
{
    status: int, // 0 = Phrase exist on wiki and data contains the sentences.
                    1 = Phrase not exist on wiki but wiki suggest misspell, and data contains the sentences of wiki suggestion
                    2 = Phrase not exist at all. data is null
    data: []
}

*/
function getSentences3(url, topic, n) {

    var result = {
        status: null,
        data: []
    };
    winston.info(`scraper::getSentences3:: topic is: ${topic} \n n is ${n} \n`);

    return new Promise((resolve, reject) => {

        getHeadLine(url)
            .then((resp) => {

                result.data.push(resp);
                return scrapeWiki(topic);

            })
            .then((resp) => {

                result.determinedTopic = resp.determinedTopic;
                result.status = resp.status;

                if (result.status === 2) resolve(result);
                else {
                    summerize(resp.data, n - 1).then((sentences) => {
                        result.data = result.data.concat(sentences)
                        resolve(result);
                    })
                }
            })
    })

}

/*
Return Promise contains array of n most important sentences of the text.

First remove brackest then use textRank.
 */
function summerize(text, n) {

    return new Promise((resolve, reject) => {

        var result = [];
        var clearedText = removeRoundBrackets(removeSquareBrackets(text));

        //
        var sentences = summarizer.splitToSentences(clearedText).filter(function (word) {
            return word.length > 10;
        });

        var similarityGraph = summarizer.getSimilarityGraph(sentences);
        var probabilityNodes = summarizer.getTextRank(similarityGraph).probabilityNodes;
        var selectedIndex = summarizer.getSelectedIndex(probabilityNodes, n);

        function sortNumber(a, b) {
            return a - b;
        }

        selectedIndex.sort(sortNumber);
        for (i in selectedIndex) {
            result.push(sentences[i]);
        }

        resolve(result);
    });
}

/*
Get pharse and search for it in wikipedia. 
Return a Promise of object as following: 
{
    status: int, // 0 = Phrase exist on wiki and data contains first P.
                    1 = Phrase not exist on wiki but wiki suggest misspell, and data contains first P of wiki suggestion
                    2 = Phrase not exist at all. data is null
    data: string,
    determinedTopic: string
}

Basically go for wiki main page and search the phrase then ..
*/
function scrapeWiki(phrase) {

    var suggest = null;
    
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
                    'followLinkInCaseOfMissMatch1': [".//*[@id='mw-content-text']/div/ul/li[1]/div[1]/a"],
                    'first_ps': [`//p[position() < 3 and parent::div and ./b]`] //index starting from 1 (Xpath..)
                })
                .then(function (context, data, next, done) {
                    if (data.first_ps.length === 0) {
                        if (data.followLinkInCaseOfMissMatch.length === 0 && data.followLinkInCaseOfMissMatch1.length === 0)
                            result.status = 2;
                        else if (data.followLinkInCaseOfMissMatch.length === 0) {
                            result.status = 1;
                            suggest = ".//*[@id='mw-content-text']/div/ul/li[1]/div[1]/a";
                            
                        } else {
                            result.status = 1;
                            suggest = ".//*[@id='mw-content-text']/div[2]/ul/li[1]/div[1]/a";
                        }
                            
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
        
        winston.info(`b option::suggest = ${suggest}`)
        return new Promise((resolve, reject) => {
            var result = {
                data: null,
                determinedTopic: null
            };

            osmosis
                .get('https://en.wikipedia.org/wiki/Main_Page')
                .submit(".//*[@id='searchButton']", {
                    search: phrase
                })
                .set({
                    wikiSuggest: [suggest]
                })
                .data(function (d) {
                    result.determinedTopic = d.wikiSuggest || d.wikiSuggest1;
                })
                .follow(suggest)
                .set({

                    'first_ps': [`//p[position() < 3 and parent::div and ./b]`] //index starting from 1 (Xpath..)
                })
                .then(function (context, data, next, done) {
                    //TODO check for errors
                    result.data = data.first_ps[0]
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
            data: null,
            determinedTopic: phrase
        }

        a(phrase)
            .then((result) => {

                if (result.status === 0) {

                    finalResult.status = 0;
                    finalResult.data = result.data;
                    resolve(finalResult);

                } else if (result.status === 1) {
                    winston.log(`scrapeWiki:: Going for option b`);
                    b(phrase)
                        .then((result) => {
                            finalResult.status = 1;
                            finalResult.data = result.data;
                            finalResult.determinedTopic = result.determinedTopic;
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
Return: 
[{
    fileName: String,
    fileURL: String
}, ...]
*/
function scrapeImages(topic, n, path, fileNames) {

    return new Promise((resolve, reject) => {

        request({
            uri: `https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=${topic}&count=${n*5}`,
            method: "GET",
            headers: {
                'Ocp-Apim-Subscription-Key': '6a0a073bf2d2407aab3d825ed3a6c517',
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

/*
Download the file and return Promise contains:
{
    fileName: String,
    fileURL: String (uri)
}
*/
function downloadFile(uri, path) {

    return new Promise((resolve, reject) => {
        //        request.head(uri, function (err, res, body) {
        //            winston.info('----------------------------------------------');
        //            winston.info('content-type:', res.headers['content-type']);
        //            winston.info('content-length:', res.headers['content-length']);
        winston.info('scraper::downloadFile::uri:', uri);
        //            winston.info('----------------------------------------------');
        //
        request(uri)
            .pipe(fs.createWriteStream(path))
            .on('close', () => {
                winston.info(`scraper::downloadFile:: close pipe`);
                resolve({
                    fileName: path.substr(path.lastIndexOf('/') + 1),
                    fileURL: uri
                })
            });
    });
};

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
        str = cutTheBullshit(str);
    }

    return str;

};

/*
Return Promise with the title of the url 
*/
function getHeadLine(url) {

    return new Promise((resolve, reject) => {
        osmosis
            .get(url)
            .set({
                title: '//head/title'
            })
            .data(function (data) {
                console.log(`scraper::getHeadLine:: data.title = ${data.title}`);
                resolve(data.title);
            })
    });
}

module.exports = {
    getSentences: getSentences,
    getSentences2: getSentences2,
    getSentences3: getSentences3,
    scrapeImages: scrapeImages,
    scrapeWiki: scrapeWiki,
    getHeadLine: getHeadLine
}
