var compass = require('nodejs-qmc5883l');

var SAMPLE_RATE = 30;

var min = {
    x: Infinity,
    y: Infinity,
    z: Infinity
};
var max = {
    x: -Infinity,
    y: -Infinity,
    z: -Infinity
};
var count = 0;
var MAX_NUM = 1000;

compass.initialize();

console.log('This script will calculate the offset & scale matrixes for correcting magnetometer output.');
console.log('Rotate the magnetometer around all 3 axes, until the min and max values don\'t change anymore.');
console.log('    x        y        z      min x    min y    min z    max x    max y    max z');

setInterval(function () {
    if (count++ > MAX_NUM) {
        wrapUp();
    }

    var vals = compass.readRawData();

            min.x = Math.min(min.x, vals.x);
            min.y = Math.min(min.y, vals.y);
            min.z = Math.min(min.z, vals.z);

            max.x = Math.max(max.x, vals.x);
            max.y = Math.max(max.y, vals.y);
            max.z = Math.max(max.z, vals.z);

            process.stdout.write(p(vals.x) + p(vals.y) + p(vals.z) + p(min.x) + p(min.y) + p(min.z) + p(max.x) + p(max.y) + p(max.z) + '\r');

}, SAMPLE_RATE);

function p(num) {
    var str = num.toFixed(3);
    while (str.length <= 7) {
        str = ' ' + str;
    }
    return str + ' ';
}

var offset = {};
var scale = {};
function calcCalibration() {
    offset = {
        x: (min.x + max.x) / 2,
        y: (min.y + max.y) / 2,
        z: (min.z + max.z) / 2
    };
    var vmax = {
        x: max.x - ((min.x + max.x) / 2),
        y: max.y - ((min.y + max.y) / 2),
        z: max.z - ((min.z + max.z) / 2)
    };
    var vmin = {
        x: min.x - ((min.x + min.x) / 2),
        y: min.y - ((min.y + min.y) / 2),
        z: min.z - ((min.z + min.z) / 2)
    };
    var avg = {
        x: (vmax.x - vmin.x) / 2,
        y: (vmax.y - vmin.y) / 2,
        z: (vmax.z - vmin.z) / 2
    };
    var avg_radius = (avg.x + avg.y + avg.z) / 2;
    scale = {
        x: avg_radius / avg.x,
        y: avg_radius / avg.y,
        z: avg_radius / avg.z
    };
}

function wrapUp(err) {

    if (err) {
        console.error(err);
    } else {
        console.log('\n\nCalibrated values:');
        calcCalibration();
        console.log({
            offset: offset,
            scale: scale
        });
    }

    var exit = process.exit;
    exit(0);
}