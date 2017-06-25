const request = require('request');
var winston = require('winston');

/*
Input: imageURL
Output: Promise contains
 [{
    "faceId": "49d55c17-e018-4a42-ba7b-8cbbdfae7c6f",
    "faceRectangle": {
      "top": 131,
      "left": 177,
      "width": 162,
      "height": 162
        }
    },...]
*/
function recognizeFaces(sourceImageUrl) {

    var subscriptionKey = "2a39e27b84034a68ae4e5fbefb272b76";

    var uriBase = "https://westus.api.cognitive.microsoft.com/face/v1.0/detect";
    
    //for images that don't have url Returning 0.
    if (!sourceImageUrl) return Promise.resolve([{faceRectangle:{top:0}}]);
    
    return new Promise((resolve, reject) => {

        request({
                uri: uriBase,
                method: "POST",
                headers: {
                    'Ocp-Apim-Subscription-Key': subscriptionKey,
                    'Content-Type': 'application/json'
                },
                postData: {
                    returnFaceId: true,
                    returnFaceLandmarks: true
                },
            body: '{"url": ' + '"' + sourceImageUrl + '"}'

            }, function (err, res, body) {

                if (res && res.statusCode !== 200) {
                    err = new Error(body);
                    winston.info('imageProcessing::recognizeFaces::Error:: \n' + err);
                    resolve([{faceRectangle:{top:0}}]);
                } else {
                    winston.info('imageProcessing::recognizeFaces::body:: \n' + body + '\n');
                    resolve(JSON.parse(body));
                }

            })
    });


};

module.exports = {
    recognizeFaces: recognizeFaces
}