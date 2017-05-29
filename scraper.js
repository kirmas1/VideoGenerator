var textrank = require('textrank-node');
var osmosis = require('osmosis');
const request = require('request');
const fs = require('fs');
const util = require('util');

/*
summerize the first p of wikipedia and returns array of the n most important sentences
*/
function getSentences(topic, n) {

    return new Promise((resolve, reject) => {
        
        var result = [];
        console.log(`scraper::getSentences:: topic is: ${topic} \n n is ${n}`);

        osmosis
            .get(`https://en.wikipedia.org/wiki/${topic}`)
            .set({
                'all_p': ['p']
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
                                    return str.substr(0, firstIndex - 1) + str.substr(i + 1);
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

                if (data.all_p.length === 0)
                    console.log(`scraper::getSentences:: Didnt found anything on wiki`);

                var filtered_p_s = data.all_p.filter(function (word) {
                    return word.length > 0;
                })

                var summarizer = new textrank();
                var firstPIndex = 0;

                while (true) {
                    if (filtered_p_s[firstPIndex].toLowerCase().indexOf(topic.toLowerCase()) >= 0)
                        break;
                    if (filtered_p_s.length - 1 === firstPIndex) {
                        console.log(`scraper::getSentences::Topic didnt match any P in wiki. `);
                        firstPIndex = 0;
                        break;
                    }
                    firstPIndex++;
                }
                console.log(`scraper::getSentences:: firstPIndex:: ${firstPIndex}`);
                var firstP = removeRoundBrackets(filtered_p_s[firstPIndex].replace(/ *\[[^)]*\] */g, ""));


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

                console.log(`scraper::getSentences:: result is:: ${util.inspect(result)}`);
                resolve(result);
            })
    });
}

/*
Download images from the internet using BingAPI to get the resources. 
*/
function scrapeImages(topic, n, path, fileNames) {
    
    return new Promise((resolve, reject) => {

        request({
            uri: `https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=${topic}&count=${n}`,
            method: "GET",
            headers: {
                'Ocp-Apim-Subscription-Key': '584ae6a3e97f413490148afa8fe95491'
            },

        }, function (err, res, body) {

            if (res && res.statusCode !== 200) {
                err = new Error(body);
            } else {
                // Parse body, if body
                body = typeof body === 'string' ? JSON.parse(body) : body;
            }

            var downloadImagesPromise = body.value.map((ele, index) => {
                return downloadFile(ele.contentUrl, `${path}/${fileNames[index]}.${ele.encodingFormat}`);
            })

            Promise.all(downloadImagesPromise).then(res=>resolve(res));
        })
    });

}

function downloadFile(uri, filename) {

    return new Promise((resolve, reject) => {
        request.head(uri, function (err, res, body) {
            console.log('content-type:', res.headers['content-type']);
            console.log('content-length:', res.headers['content-length']);

            request(uri)
                .pipe(fs.createWriteStream(filename))
                .on('close', () => {
                    console.log(`scraper::downloadFile:: close pipe`);
                    resolve(filename.substr( filename.lastIndexOf('/')+1 ));
                });
        });
    });
};

module.exports = {
    getSentences: getSentences,
    scrapeImages: scrapeImages
}
