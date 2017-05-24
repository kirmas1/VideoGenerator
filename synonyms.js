/*
synonym_id - By the Excel Sheet! 
1 -
2 - 
3 -
4 - 
5 -
*/


var a_small = ['small', 'Nice', 'Decent', 'Respectable'];
var a_medium = ['medium', 'average', 'mean', 'Mediate'];
var a_big = ['big', 'mammoth', 'enormous', 'walloping', 'titanic', 'whopping', 'humongous', 'colossal', 'elephantine', 'epic', 'monstrous', 'larger-than-life', 'tremendous', 'immense', 'gigantic'];

var a_huge = ['huge', 'astronomical', 'outsized', 'giant', 'outsize', 'oversize', 'extensive', 'puffy', 'blown-up', 'king-sized', 'large', 'monumental', 'extended', 'bigger', 'hulky', 'oversized', 'massive', 'large-scale', 'prodigious', 'massive', 'hulking', 'enlarged', 'overlarge', 'capacious', 'heroic', 'sizable', 'life-sized', 'Brobdingnagian', 'jumbo'];

var b = ['producing', 'generating', 'acheiving', 'creating'];
var c_good = ['Good', 'smashing', 'respectable', 'hot', 'solid'];
var c_reasonable = ['reasonable', 'Nice', 'Decent', 'Respectable'];
var c_amazing = ['Amazing', 'fantastic', 'marvellous', 'grand', 'terrific', 'rattling', 'extraordinary', 'tremendous', 'impressive', 'awesome', 'superb', 'Whopping'];

var d = ['almost', 'about', 'around', 'some', 'roughly', 'just about', 'more or less', 'close to', 'approximately'];

var e = ['An avergae fuel consumption of', 'Consuming in average', 'With a fuel consumption of', 'Fuel consumption rates:'];

var f = ['built for speed', 'may not be built for speed, but compensates in fuel consumption', 'agile and fast reacting', 'faster than imagination'];

var g1 = ['built for speed', 'made to break the speed limit', 'might just get you in trouble with the law', 'will scare you at top speeds', 'can come up to speeds of a small plane', 'faster than imagination', 'as fast as a fighter jet', 'so fast it will blow your mind'];

var g2 = ['agile and fast reacting', 'strong, quick and reactive.', 'sportive, elegant and quick'];

var g3 = ['may not be built for speed, but compensates in fuel consumption', 'a more compact , economic choice', 'the economic vehicle of choise'];

var h = ['As expected of', 'As you would expect of', 'As anticipated of', 'Not surprising for'];

module.exports = {

    //synonym_id should be: 1, 2, 3 ...
    getSynonym(synonym_id, options) {
        switch (synonym_id) {
            case 1:
                if (options < 1400) {
                    return a_small[Math.floor(Math.random() * a_small.length)];
                } else if (options >= 1400 && options < 2800) {
                    return a_medium[Math.floor(Math.random() * a_medium.length)];
                } else if (options >= 2800 && options < 3800) {
                    return a_big[Math.floor(Math.random() * a_big.length)];
                } else {
                    return a_huge[Math.floor(Math.random() * a_huge.length)];
                }
                break;
            case 2:
                return b[Math.floor(Math.random() * b.length)];
                break;
            case 3:
                if (options < 150) {
                    return c_reasonable[Math.floor(Math.random() * c_reasonable.length)];
                } else if (options >= 150 && options < 350) {
                    return c_good[Math.floor(Math.random() * c_good.length)];
                } else {
                    return c_amazing[Math.floor(Math.random() * c_amazing.length)];
                }
                break;
            case 4:
                return d[Math.floor(Math.random() * d.length)];
                break;
            case 5:
                return e[Math.floor(Math.random() * e.length)];
                break;
            case 6:
                switch (options) {
                    case 1:
                        return g1[Math.floor(Math.random() * g1.length)];
                        break;
                    case 2:
                        return g2[Math.floor(Math.random() * g2.length)];
                        break;
                    case 3:
                        return g3[Math.floor(Math.random() * g3.length)];
                        break;
                }
                break;
            case 7:
                return h[Math.floor(Math.random() * h.length)];
                break;
        }
    }
}
