var ffmpeg = require('./ffmpeg');
const util = require('util');
var execFile = require('child_process').execFile;
var nlp = require('./nlp');
var Car = require('./car');
var Client = require('mariasql');


var c = new Client({
    host: 'carspecsdb.cb2xddqsnpgk.us-west-2.rds.amazonaws.com',
    user: 'admin',
    password: 'sasa8647'
});

var prep = c.prepare('SELECT * FROM cars_specs.cars_specs WHERE \
                    model_make_id = :model_make_id AND \
                    model_name = :model_name AND \
                    model_year = :model_year');

c.query(prep({
    model_make_id: "BMW",
    model_name: car."M4",
    model_year: 2017
}), function (err, rows) {
    if (err) {
        console.log(`cars-db::getCarSpecs::query err is: ${err}`);
    }
    console.log(`cars-db::getCarSpecs::query rows[0] is: ${rows[0]}`);
});

c.end();


//var c = new Car("Bentley", "Flying Spur", "2017").then((res) => {
//    console.log(`testing::new Car:: is: ${util.inspect(res)}`);
//    return 0;
//    
//});

//nlp.analizeNLPhrase('McLaren 650S Coupe 2016');
//ffmpeg.createSlidingCameraEffect('test/img.jpg','test/qqq14.mp4', {
//    duration: 10
//})
//    .then(result => {
//    
//    console.log('done');
//    ffmpeg.rollingTextEffect('test/qqq14.mp4', 'test/qqq_final14.mp4', {
//        font_size: 36,
//        font_color: 'white',
//        font_file: 'fonts/OpenSans/r.ttf',
//        text_file: 'workshop/a/text.txt',
//        block_h: 2,
//        block_displays_t: [3,5],
//        location: 0 
//        
//    })
//});

//ffmpeg.rollingTextEffect('workshop/b/in.mp4', 'workshop/b/out3.mp4', {
//    font_size: 72,
//    font_color: 'white',
//    font_file: 'fonts/OpenSans/bi.ttf',
//    text_file: 'workshop/b/text.txt',
//    block_h: 1,
//    block_displays_t: [2, 2],
//    location: 0
//
//})

//ffmpeg.rollingTextEffect('afda','workshop/a/fontsize72OpenSansi.mp4',{
//        font_size: 72,
//        font_color: 'white',
//        font_file: 'fonts/OpenSans/i.ttf',
//        text_file: 'workshop/a/text.txt'
//}).then((res) => {
//    console.log('Done');
//})
//ffmpeg.rollingTextEffect('afda','workshop/a/fontsize72OpenSansb.mp4',{
//        font_size: 72,
//        font_color: 'white',
//        font_file: 'fonts/OpenSans/b.ttf',
//        text_file: 'workshop/a/text.txt'
//}).then((res) => {
//    console.log('Done');
//})


//best on so far: z=1.1, x=x+3, y=ih/2-ih/zoom/2






//var db = require('./cars-db');
//var Car = require('./car');
//var _car = new Car('Mazda', '3', 2012).then(()=>{
//    console.log('Done');
//});
//
//require('./automatic').prepare({
//    model_name: 'M4',
//    model_make: 'BMW',
//    model_year: '2017'
//}).then((result) => {
//    console.log(util.inspect(result));
//    ffmpeg.createCustom(result.d, result.nf);
//}).catch((err) => {
//    console.log(err);
//});
