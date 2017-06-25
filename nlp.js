var util = require('util');
var textrank = require('textrank-node');
var compromise = require('compromise')
var scraper = require('./scraper');
var winston = require('winston');

module.exports = {
    analizeNLPhrase: analizeNLPhrase,
    summerize: summerize
}

//This ugly shit should be taken from db
var model_make_list = ['BMW', 'Audi', 'Porsche', 'Lamborghini', 'Dodge', 'McLaren', 'Mercedes-Benz', 'Bentley', 'Nissan', 'Chevrolet'];
var model_year_list = ['2016', '2017'];
var model_name_list = ['7 Series', 'M4', 'TTS', 'A8', '918 Spyder', 'Aventador', 'Challenger', 'Charger', '650S Coupe', '650S Spider', 'S-Class', 'SL-Class', 'Flying Spur', 'Huracan', 'GT-R', 'Camaro', 'Panamera'];

var model_make_and_name_con = model_make_list.concat(model_name_list);


function summerize(text, n) {

    var summarizer = new textrank();
    return summarizer.summarize(text, n);

}

/**************************************************
 *   Filtering Custom (car) Or General flow.
 *  Returning analizeCarPhrase Or analizeGeneralPhrase
 *
 **************************************************/
function analizeNLPhrase(phrase) {

    winston.info(`nlp::analizeNLPhrase:: phrase is: ${phrase}`);

    var ph_units = phrase.split(' ');
    winston.info(`nlp::analizeNLPhrase:: ph_units is: ${ph_units}`);

    var result = 3;

    var filteredPhraseUnits = ph_units.filter((ele) => {
        if (model_make_and_name_con.indexOf(ele) === -1)
            return false;
        return true;
    });

    if (filteredPhraseUnits.length > 0) result = 0;

    switch (result) {

        case 0: //car
            return analizeCarPhrase(phrase);
            break;
        case 3:
            return analizeGeneralPhrase(phrase);
        default:
            return {};
            break;
    }
}

/*
Deprecated
*/
function getTopic(phrase) {

    var ph_units = phrase.split(' ');
    winston.info(`nlp::analizeNLPhrase:: ph_units is: ${ph_units}`);

    var result = 3;
    if (ph_units.filter((ele) => {
            if (model_make_and_name_con.indexOf(ele) === -1)
                return false;
            return true;
        }).length > 0)
        result = 0;

    return result; // 0 - Cars, // 3 anything else
}


/*
This functions should get nl phrase (probably enter by end user), or URL and return Promise as follow: 
{
    id: 3 = Phrase 
        4 - URL
    searchablePhrases: [] = list of extracted entities.
}
*/
function analizeGeneralPhrase(phrase) {

    return new Promise((resolve, reject) => {

        var result = {
            id: 3,
            searchablePhrases: []
        }

        Promise.resolve()
            .then(() => {
                if (phrase.startsWith('http') || phrase.startsWith('www') || phrase.indexOf('.co') !== -1) {
                    result.id = 4;
                    return scraper.getHeadLine(phrase);
                }
                    
                else return Promise.resolve(phrase)

            })
            .then((resp)=>{
            
                result.searchablePhrases = compromise(resp.toLowerCase()).topics().data().map((ele) => {return ele.normal}); //list Of Named Entities. Gets people,places and organizations.
            
                if ( result.searchablePhrases.length === 0 )
                    result.searchablePhrases = compromise(resp.toLowerCase()).nouns().data().map((ele) => {return ele.singular});
                
                resolve(result);
                
            })
    })

}

function analizeCarPhrase(text) {

    var car = {},
        text_units = text.split(' ');

    car.model_make = trimAndReturnModelMake(text_units);

    car.model_year = trimAndReturnModelYear(text_units);

    car.model_name = trimAndReturnModelName(text_units);

    if (car.model_make && car.model_name && car.model_year)
        car.id = 0;
    else if (car.model_make && car.model_name)
        car.id = 1;
    else if (car.model_make)
        car.id = 2;
    winston.info(`nlp::analizeCarPhrase:: car returned is: ${util.inspect(car)}`)
    return car;
}

function trimAndReturnModelMake(arr) {

    winston.info(`nlp::trimAndReturnModelMake:: arr is: ${arr}`);
    var ans = '';
    for (var i = 0; i < arr.length; i++) {
        (function f(i) {
            if (0 <= model_make_list.indexOf(arr[i])) {

                ans = arr[i];
                arr.splice(i, 1);

                winston.info(`nlp::trimAndReturnModelMake:: found ans = : ${ans}, i = ${i}`);
            }
        }(i));
    }

    return ans;
}

function trimAndReturnModelYear(arr) {

    //TO DO Find better algo 
    winston.info(`nlp::trimAndReturnModelYear:: arr is: ${arr}`);
    var ans = '';
    for (var i = 0; i < arr.length; i++) {
        (function f(i) {
            if (0 <= model_year_list.indexOf(arr[i])) {
                ans = arr[i];
                arr.splice(i, 1);
                winston.info(`nlp::trimAndReturnModelYear:: found ans = : ${ans}`);
            }
        }(i));
    }

    return ans;
}

function trimAndReturnModelName(arr) {

    winston.info(`nlp::trimAndReturnModelName:: arr is: ${arr}`)
        //Find better algo 
    var ans = '';
    for (var i = 0; i < arr.length; i++) {
        (function f(i) {
            if (0 <= model_name_list.indexOf(arr[i])) {
                ans = arr[i];
                arr.splice(i, 1);
                winston.info(`nlp::trimAndReturnModelName:: found ans = : ${ans}`);
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
                winston.info(`nlp::trimAndReturnModelName:: found ans = : ${ans}`);
                return ans;
            }
        }(j));
    }

    return ans;
}
