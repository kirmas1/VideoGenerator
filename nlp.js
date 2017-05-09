var util = require('util');

module.exports = {
    analizeNLPhrase: analizeNLPhrase
}

//This ugly shit should be taken from db
var model_make_list = ['BMW', 'Audi', 'Porsche', 'Lamborghini', 'Dodge', 'McLaren', 'Mercedes-Benz', 'Bentley', 'Nissan', 'Chevrolet'];
var model_year_list = ['2016', '2017'];
var model_name_list = ['7 Series', 'M4', 'TTS', 'A8', '918 Spyder', 'Aventador', 'Challenger', 'Charger', '650S Coupe', '650S Spider', 'S-Class', 'SL-Class', 'Flying Spur', 'Huracan', 'GT-R', 'Camaro', 'Panamera'];


/**************************************************
 *   Get a natural text and return the appropriate object
 *
 **************************************************/
function analizeNLPhrase(phrase) {

    console.log(`nlp::analizeNLPhrase:: phrase is: ${phrase}`);

    switch (getTopic(phrase)) {

        case 0: //car
            return analizeCarPhrase(phrase);
            break;
        default:
            return {};
            break;
    }
}

function getTopic(phrase) {

    var ph_units = phrase.split(' ');
    console.log(`nlp::analizeNLPhrase:: ph_units is: ${ph_units}`);

    return 0; // 0 - Cars
}

function analizeCarPhrase(text) {

    var car = {},
        text_units = text.split(' ');

    car.model_make = trimAndReturnModelMake(text_units);

    car.model_year = trimAndReturnModelYear(text_units);

    car.model_name = trimAndReturnModelName(text_units);
    
    if (car.model_make && car.model_name && car.model_year)
        car.id = 0;
    console.log(`nlp::analizeCarPhrase:: car returned is: ${util.inspect(car)}`)
    return car;
}

function trimAndReturnModelMake(arr) {

    console.log(`nlp::trimAndReturnModelMake:: arr is: ${arr}`);
    var ans = '';
    for (var i = 0; i < arr.length; i++) {
        (function f(i) {
            if (0 <= model_make_list.indexOf(arr[i])) {

                ans = arr[i];
                arr.splice(i, 1);

                console.log(`nlp::trimAndReturnModelMake:: found ans = : ${ans}, i = ${i}`);
            }
        }(i));
    }

    return ans;
}

function trimAndReturnModelYear(arr) {

    //TO DO Find better algo 
    console.log(`nlp::trimAndReturnModelYear:: arr is: ${arr}`);
    var ans = '';
    for (var i = 0; i < arr.length; i++) {
        (function f(i) {
            if (0 <= model_year_list.indexOf(arr[i])) {
                ans = arr[i];
                arr.splice(i, 1);
                console.log(`nlp::trimAndReturnModelYear:: found ans = : ${ans}`);
            }
        }(i));
    }

    return ans;
}

function trimAndReturnModelName(arr) {

    console.log(`nlp::trimAndReturnModelName:: arr is: ${arr}`)
        //Find better algo 
    var ans = '';
    for (var i = 0; i < arr.length; i++) {
        (function f(i) {
            if (0 <= model_name_list.indexOf(arr[i])) {
                ans = arr[i];
                arr.splice(i, 1);
                console.log(`nlp::trimAndReturnModelName:: found ans = : ${ans}`);
                return ans;
            }
        }(i));
    }
    //check for 2 words combination
    for (var j = 0; j < arr.length - 1; j++) {
        (function f(j) {
            if (0 <= model_name_list.indexOf(arr[j] + ' ' + arr[j + 1])) {
                ans = arr[j] + ' ' + arr[j + 1];
                arr.splice(i, 2);
                console.log(`nlp::trimAndReturnModelName:: found ans = : ${ans}`);
                return ans;
            }
        }(j));
    }

    return ans;
}
