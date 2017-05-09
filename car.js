var synonym = require('./synonyms.js');
var getSynonym = synonym.getSynonym;
var db = require('./cars-db');
var util = require('util');

/*
car = {
            model_make: 'Audi',
            model_name: 'RS8',
            model_trim: null,
            model_year: 2017
        }
*/

function Car(model_make, model_name, model_year) {
    this.model_make = model_make;
    this.model_name = model_name;
    this.model_year = model_year;
    this.allTexts = [];
    console.log('Car Ctor');
    return new Promise((resolve, reject) => {

        db.getCarSpecs(this).then((specs) => {
            this.specs = specs;
            console.log('car::Car:: db.getCarSpecs success with vaule: ' + util.inspect(specs));
            resolve(this);
        });
    })
}

Car.prototype.isStartingWithVowel = function (word) {
    function isVowel(c) {
        return ['a', 'e', 'i', 'o', 'u'].indexOf(c.toLowerCase()) !== -1
    }
    return isVowel(word.charAt(0));
}

Car.prototype.generateFirstSentence = function () {
    var a_an_model_drive = 'A';

    if (this.isStartingWithVowel(this.specs.model_drive)) a_an_model_drive = 'An';

    this.allTexts.push({text:`${a_an_model_drive} ${this.specs.model_drive} ${this.specs.model_transmission_type} ${this.specs.model_body}`});
}

Car.prototype.generateSecondSentence = function () {
    var a_an_synonym1 = 'a';
    var a_an_synonym3 = 'a';

    //    var synonym1  = 'Huge';
    //    var synonym2 = 'creating';
    //    var synonym3 = 'grand';
    //    var synonym4 = 'around';

    var synonym1 = getSynonym(1, this.specs.model_engine_cc);
    var synonym2 = getSynonym(2);
    var synonym3 = getSynonym(3, this.specs.model_engine_power_ps);
    var synonym4 = getSynonym(4);

    if (this.isStartingWithVowel(synonym1)) a_an_synonym1 = 'an';
    if (this.isStartingWithVowel(synonym3)) a_an_synonym3 = 'an';

    this.allTexts.push({text:`With ${a_an_synonym1} ${synonym1} ${this.specs.model_engine_cc} cc engine,
${synonym2} ${a_an_synonym3} ${synonym3} ${this.specs.model_engine_power_ps} HP,
${synonym4} ${this.specs.model_engine_torque_nm} NM of torque`});
}

Car.prototype.generateThirdSentence = function () {

    //    var synonym5 = 'An avergae fuel consumption of';
    var synonym5 = getSynonym(5);

    this.allTexts.push({text:`${synonym5}
${Math.floor(100 / this.specs.model_lkm_mixed)} KM per Liter
- Or ${Math.floor(100 / this.specs.model_lkm_mixed * 2.35214583)} Miles Per gallon`});
}

Car.prototype.generateAllTexts = function () {
    this.generateFirstSentence();
    this.generateSecondSentence();
    this.generateThirdSentence();
    return this.allTexts;
}

module.exports = Car;
