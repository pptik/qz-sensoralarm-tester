var compass = require('nodejs-qmc5883l');

if (compass.initialize()) {
    setInterval(function () {
        console.log(compass.readRawData());
    }, 10);
}