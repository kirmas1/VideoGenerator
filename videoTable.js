//File: videoTable.js

var AWS = require('aws-sdk');
AWS.config.loadFromPath('./aws.config.json');

var DynaDoc = require('dynadoc').setup(AWS);

//The Joi library exposed for convience.
var Joi = DynaDoc.getJoi();

//Using Joi you can create a schema
var videoSchema = Joi.object().keys({
    clientName: Joi.string(),
    videoName: Joi.string(),
    metadata: Joi.object().keys({
        origin: Joi.number(),
        phrase: Joi.string(),
        url: Joi.string(),
        timeCreated: Joi.date(),
        ffmpegProcessDuration: Joi.number(),
        link: Joi.string(),
        state: Joi.number(),
        inProgress: Joi.boolean()
    }),
    "info": Joi.object().keys({
        tempFolder: Joi.string(),
        audio: Joi.object().keys({
            enable: Joi.boolean(),
            file_path: Joi.string()
        }),
        slidesInfo: Joi.array()
    })
});

//This creates a new DynaDoc Client that contains a model (15 and 13 are default table read and write throughput)
var videoTable = DynaDoc.createClient("Videos", videoSchema, {
    "ReadCapacityUnits": 15,
    "WriteCapacityUnits": 13
});

/*
For any schema, you must specify which key is the primary key and if there is a range key (leave out if no rang key).
Note: each ensure method returns the client object (builder methdology). These calls are synchronous and chainable.
*/
videoTable.primaryIndex("clientName", "videoName");

//This tells DynaDoc that the item GlobalSecondaryHash is a new Global Index.
//         IndexName (As it will appear in DynamoDB), Index Hash Name (from schema), Range Name, read, write,
//.globalIndex(
//    "GlobalIndex-index",
//    "GlobalSecondaryHash", {
//        "RangeValue": "GlobalSecondaryRange",
//        "ReadCapacityUnits": 5,
//        "WriteCapacityUnits": 7
//    }
//);

//Create a local index (Always share primary Hash Key):
//Params: IndexName, The Key Value to use for the range key in the model above.
//videoTable.localIndex("LocalIndexRange-index", "LocalSecondaryIndex");

/*
Create the schema in the table. The param is a boolean to ignore and not create a new table if it already exists.
This is an async call (DynamoDB returns instantly). DynaDoc does not hold a lock or anything. It is currently
your responsibility to ensure that the table is active (not in the creating state) before making other
calls to the DynamoDB table. DynaDoc provides a isTableActive() method that will return the status of
the table as a boolean (True if active, false otherwise).
*/
videoTable.createTable(true).then(function (res) {
    /*
    Call was successfull. It could take a minute or two for your table to be ready...
    DynaDoc does not handle this. However, once the tables are created, from the schema
    then they will not be created again and you can instantly use DynaDoc like normal! :)
    IE. You will have to find a clever way to wait for the table to be created the first time.
    */
    console.log("Table has begun creation.");
}); //Returns a promise with response from DynamoDB

/*
Now anywhere this file is required, it will represent the DynaDoc client for this table.
With all the DyModel features enabled.
*/
module.exports = videoTable;
