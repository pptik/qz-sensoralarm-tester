var Gpio = require('onoff').Gpio;
var LED1 = new Gpio(17, 'out');
var LED2 = new Gpio(27, 'out');
var LED3 = new Gpio(22, 'out');

var ledOn = 0;

function LED() {
    if (ledOn == 0) {
        LED1.writeSync(1);
    }
    else if (ledOn == 1) {
        LED2.writeSync(1);
    }
    else if (ledOn == 2) {
        LED3.writeSync(1);
    }
    else if (ledOn == 3) {
        LED3.writeSync(0);
    }
    else if (ledOn == 4) {
        LED2.writeSync(0);
    }
    else {
        LED1.writeSync(0);
        ledOn = -1;
    }

    ledOn++;
}

setInterval(LED, 500);