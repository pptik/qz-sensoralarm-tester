module.exports = class MyClass {
    constructor() {
        global.XAXIS = 0;
        global.YAXIS = 1;
        global.ZAXIS = 2;

        //Gyroscope
        const ITG3200 = require(__dirname + '/../ITG3200/itg3200.js');
        const new_this = this;
        this.gyro = new ITG3200(function(err) {
            if (!err) {
                new_this.gyro.calibrateGyro(function(calibrated) {return;});
            }
        });
        
        //Accelerometer
        const ADXL345 = require(__dirname + '/../ADXL345/adxl345.js');
        this.adxl345 = new ADXL345();
        this.adxl345.init()
        .catch(function(err) {
            console.error(`ADXL345 initialization failed: ${err} `)
        });

        //Magnetormeter
        this.compass = require('nodejs-qmc5883l');
        var offset = { 
            x: -700, 
            y: 206.5, 
            z: -72.5 
        };
        var scale = { 
            x: 1.4284525790349418,
            y: 1.6360171510242973,
            z: 1.4520084566596194 
        };
        this.compass.setOffsetMatrix(offset.x, offset.y, offset.z);
        this.compass.setScaleMatrix(scale.x, scale.y, scale.z);
        var declinationAngle = (0.0 + (40 / 60.0)) / (180 / Math.PI);
        this.compass.setDeclinationAngle(declinationAngle);
        if (!this.compass.initialize()) {
            throw new Error();
        }

        //Pressure
        const BMP280 = require('bmp280-sensor');
        const options = {
            i2cBusNumber  : 1,    // defaults to 1
            i2cAddress    : 0x77, // defaults to 0x76
            verbose       : false
        };
        this.bmp280 = new BMP280(options);
        this.bmp280.config({
            powerMode: 3,                // 0 - sleep, 1|2 - one measurement, 3 - continuous
            pressureOversampling: 3,     // 0 - Skipped, 1 - ×1, 2 - ×2, 3 - ×4, 4 - ×8, 5 - ×16
            temperatureOversampling: 1,  // 0 - Skipped, 1 - ×1, 2 - ×2, 3 - ×4, 4 - ×8, 5 - ×16
            iirFilter: 2,                // Coefficient: 0 - off, 1 - 2, 2 - 4, 3 - 8, 4 - 16
            standby: 4                   // 0 - 0.5ms, 1 - 62.5ms, 2 - 125ms, 3 - 250ms, 4 - 500ms, 5 - 1000ms, 6 - 2000ms, 7 - 4000ms
        });
    }
        
    
    readITG3200() {
        function degrees(radians) {
            return radians * 180 / Math.PI;
        };

        const new_this = this;
        return new Promise(function(resolve, reject) {
            new_this.gyro.measureGyro(function(err) {
                if (!err) {
                    resolve({
                        roll: degrees(new_this.gyro.gyroRate[XAXIS]),
                        pitch: degrees(new_this.gyro.gyroRate[YAXIS]),
                        yaw: degrees(new_this.gyro.gyroRate[ZAXIS])
                    });
                } else {
                    reject(err);
                }
            });
        });
    }

    readADXL345(gforce=false) {
        const new_this = this;
        return new Promise (function(resolve, reject) {
            new_this.adxl345.getAcceleration(gforce) // true for g-force units, else false for m/s²
            .then((acceleration) => {
                resolve(acceleration);
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    readQMC5883L(raw=false) {
        const new_this = this;
        if (!raw) {
            return new Promise(function(resolve, reject) {
                var precision = 2;
                resolve({azimuth: new_this.compass.readAzimuth().toFixed(precision)});
            });
        }
        else {
            return new Promise(function(resolve, reject) {
                resolve(new_this.compass.readRawData());
            });
        }
    }

    readBMP280() {
        const new_this = this;
        return new Promise (function(resolve, reject) {
            new_this.bmp280.readSensors()
            .then((data) => {
                var height = 44330 * (1 - Math.pow((data.Pressure / 1013.25), 0.190284));
                data.height = height;
                resolve(data);
            })
            .then(() => {
                new_this.bmp280.close();
            })
            .catch((err) => {
                reject(err);
                new_this.bmp280.close();
            });
        });
    }

    readAll(qmc5883l_raw=false, adxl345_gforce=false) {
        const new_this = this;
        return new Promise(function(resolve, reject) {
            var data = {};
            new_this.readITG3200()
            .then(function(itg3200) {
                data.roll = itg3200.roll;
                data.pitch = itg3200.pitch;
                data.yaw = itg3200.yaw;
                return new_this.readADXL345(adxl345_gforce);
            })
            .then(function(adxl345) {
                data.accel_x = adxl345.x;
                data.accel_y = adxl345.y;
                data.accel_z = adxl345.z;
                return new_this.readQMC5883L(qmc5883l_raw);
            })
            .then(function(qmc5883l) {
                if (qmc5883l_raw) {
                    data.magneto_x = qmc5883l.x;
                    data.magneto_y = qmc5883l.y;
                    data.magneto_z = qmc5883l.z;
                } 
                else {
                    data.azimuth = qmc5883l.azimuth;
                }
                return new_this.readBMP280();
            })
            .then(function(bmp280) {
                data.Temperature = bmp280.Temperature;
                data.Pressure = bmp280.Pressure;
                data.height = bmp280.height;
                resolve(data);
            })
            .catch(function(err) {
                reject(err);
            });
        });
    }
}