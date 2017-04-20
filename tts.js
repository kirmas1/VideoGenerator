var AWS = require('aws-sdk');
const Fs = require('fs')


var polly = new AWS.Polly({
    signatureVersion: 'v4',
    region: 'us-east-1'
});


var me = function () {
    /*
    pollySyn take one item and sends it to Polly for synthesizing it and return a promise.
    */
    var pollySyn = function (item) {

            var params = {
                'Text': item.text,
                'OutputFormat': 'mp3',
//                'OutputFormat': 'json',
//                'SpeechMarkTypes': ["sentence", "word"],
                'VoiceId': item.voiceId || 'Kimberly'
            };
            
            return new Promise((resolve, reject) => {
                polly.synthesizeSpeech(params, (err, data) => {
                    if (err) {
                        reject(err.code);
                    } else if (data) {
                        if (data.AudioStream instanceof Buffer) {
                            Fs.writeFile(item.path, data.AudioStream, function (err) {
                                if (err) {
                                    reject(err);
                                }
                                resolve("The file was saved!");
                            })
                        }
                    }
                });
            });
        }
        /*
            synthesize function.
            Input: options object in this form
                {
                    items: [list of items]
                }
                Each item should be 
                    {
                        text: "text to synthesize",
                        voiceId: voiceId || null
                        path: path to file to be generated
                    }
            Output: object in this formation
            {
                results: [list of results to] 
            }
                Each result should be
                    {
                        code: 0 / 1 (success/failure),
                        message: null / "err message"
                    }
        */
    var synthesize = function (options) {

        var p = options.items.map((ele, index) => {
            return pollySyn(ele);
        });

        return Promise.all(p);
    }

    return {
        synthesize: synthesize
    }
}

module.exports = me();
