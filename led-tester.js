const { Gpio } = require('onoff');

const led1 = new Gpio(17, 'out');
const led2 = new Gpio(27, 'out');
const led3 = new Gpio(22, 'out');

// writeSync 1=on 0=off
led1.writeSync(1);
// led2.writeSync(1);
// led3.writeSync(1);
