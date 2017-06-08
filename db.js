var winston = require('winston');
var util = require('util');

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

var videoList = [{
    timeCreated: formatDate(new Date()),
    date: formatDate(new Date()),
    videoName: 'fakeName0',
    link: 'fakeFolder0',
    id: 0,
    details: {},
    inProgress: false,
    state: 1 // -1 - Init, 0 - InProgress, 1 - Ready, 2 - Failed
    }];

module.exports = {
    res: {
        getAll: function () {
            console.log('db::getAll')
            return videoList;
        },
        save: function (item) {
            
            winston.info(`db::save:: item is: ${item}`);
            item.id = videoList.length;
            videoList.push(item);
            
            winston.info(`db::save:: videoListAfterPushigItem is: ${util.inspect(videoList)}`);
            
            return item;
        },
        update: function (item ) {
//            var index = videoList.findIndex(function(ele){
//                return ele.link === item.link;
//            });
            
            winston.info(`db::update:: item.id is: ${item.id}`);
            
            videoList[item.id].state = item.state;
            videoList[item.id].link = item.link;
            videoList[item.id].inProgress = item.inProgress;
            
            return 0;
            
        }

    }
}
