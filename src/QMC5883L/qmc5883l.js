var compass = require('nodejs-qmc5883l');

// sample offset & scale data that do nothing, generated myself, be sure
// to grab your own using the `node calibrate` function, because
// the magnetic field distortion is different in each place on the Earth

var offset = { x: -700, y: 206.5, z: -72.5 };

var scale = { x: 1.4284525790349418,
  y: 1.6360171510242973,
  z: 1.4520084566596194 }  ;


var precision = 2;

compass.setOffsetMatrix(offset.x, offset.y, offset.z);
compass.setScaleMatrix(scale.x, scale.y, scale.z);

//apply the local declination angle correction
//values for Tarnowskie Gory, Poland: 5 degrees, 1 minute
//taken from: http://magnetic-declination.com/
//formula: declinationAngle = (degrees + (minutes / 60.0)) / (180 / PI);
var declinationAngle = (0.0 + (40 / 60.0)) / (180 / Math.PI);
compass.setDeclinationAngle(declinationAngle);

console.log("Declination angle correction: " + declinationAngle);
console.log("Scale matrix: " + JSON.stringify(scale));
console.log("Offset matrix: " + JSON.stringify(offset));
console.log("Precision (digits after comma): " + precision);

if (compass.initialize()) {
  setInterval(function () {
    console.log("Azimuth: " + compass.readAzimuth().toFixed(precision));
  }, 100);
}
