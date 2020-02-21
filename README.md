# qz-sensoralarm
Sensor and Alarm Module for QuakeZone Earthquake and Tsunami Early Warning System

**Not compatible** with Node.js 12++.

Unfortunately we're stuck with Node 10 for now: https://gitmemory.com/issue/Rantanen/node-opus/81/496259364

## bmp280-sensor

`bmp280-sensor.js` is originally from here:

https://www.npmjs.com/package/bmp280-sensor

but the npm package depended on i2c-bus@1.2.1 and caused build errors in Node 12.x.
Hendy had to embed `bmp280-sensor.js` and make it use i2c-bus@4.x so it at least this component compatible with Node 12.x.

## nodejs-qmc5883l

https://www.npmjs.com/package/nodejs-qmc5883l
