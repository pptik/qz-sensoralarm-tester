var player = require('play-sound')(opts = {})
var Gpio = require('onoff').Gpio;
var express = require('express');
var app = express()
var server = require('http').createServer(app);
var path = require('path');
const io = require('socket.io').listen(server);

var LED1 = new Gpio(17, 'out');
var LED2 = new Gpio(27, 'out');
var LED3 = new Gpio(22, 'out')
LED2.writeSync(1);

const imu = require(__dirname + '/src/IMU/imu.js');
const IMU = new imu();

server.listen(process.env.PORT || 1337);
console.log('Server running at http://127.0.0.1:1337/');

app.get('/', function(req, res) {
    res.sendFile(path.resolve(__dirname + '/index.html'));
});

var accel_x = [];
var accel_y = [];
var accel_z = [];
var magneto_x = [];
var magneto_y = [];
var magneto_z = [];
var roll = [];
var pitch = [];
var yaw = [];
var getaran = 0;
var getaranArray = [];
var altitude = 0;
var altitudeArray = [];
var dataIndex = [];
var count = 0;
var ledBlinking = false;

//Config Trigger Here
const trigger = 10;

function deteksiGempa() {
    IMU.readAll(qmc5883l_raw=true)
    .then(function(imuData) {
        // console.log(imuData);
        count++;
        accel_x.push(imuData.accel_x)
        accel_y.push(imuData.accel_y)
        accel_z.push(imuData.accel_z)
        magneto_x.push(imuData.magneto_x)
        magneto_y.push(imuData.magneto_y)
        magneto_z.push(imuData.magneto_z)
        roll.push(imuData.roll)
        pitch.push(imuData.pitch)
        yaw.push(imuData.yaw)
        altitude = imuData.height;

        if (imuData.accel_x > 2.5 || imuData.accel_x < -2.5) {
            getaran++;
        }
        if (imuData.accel_y > 2.5 || imuData.accel_y < -2.5) {
            getaran++;
        }

        if (getaran >= trigger) {
            player.play(__dirname + '/src/play_audio/media/alarm.mp3', function(err){
                if (err) return;
            });

            if (!ledBlinking) {
                ledBlinking = true;
                LED2.writeSync(0);
                var blinkInterval = setInterval(blinkLED, 500);
                function blinkLED() {
                    if (LED1.readSync() === 0) {
                        LED1.writeSync(1);
                    } 
                    else {
                        LED1.writeSync(0);
                    }

                }
                function endBlink() {
                    clearInterval(blinkInterval);
                    LED1.writeSync(0);
                    ledBlinking = false;
                }
                setTimeout(endBlink, 4000);
            } 
        }
        else {
            if (!ledBlinking & LED2.readSync() === 0) {
                setTimeout(function() {
                    LED2.writeSync(1);
                }, 1000)
            }
        }

        if (getaran > 20) {
            getaran = 20;
        }

        if (count > 15) {
            if (getaran > 0) {
                getaran--;
            }
            count = 0;
        }

        getaranArray.push(getaran);
        altitudeArray.push(altitude)

        if (accel_x.length > 50) {
            accel_x = accel_x.slice(1, accel_x.length);
            accel_y = accel_y.slice(1, accel_y.length);
            accel_z = accel_z.slice(1, accel_z.length);
            magneto_x = magneto_x.slice(1, magneto_x.length);
            magneto_y = magneto_y.slice(1, magneto_y.length);
            magneto_z = magneto_z.slice(1, magneto_z.length);
            roll = roll.slice(1, roll.length);
            pitch = pitch.slice(1, pitch.length);
            yaw = yaw.slice(1, yaw.length);
            getaranArray = getaranArray.slice(1, getaranArray.length);
            altitudeArray = altitudeArray.slice(1, altitudeArray.length);
        }
        else {
            dataIndex.push(accel_x.length);
        }

        io.sockets.emit('data', {
            labels: dataIndex, 
            data: {
                accel_x: accel_x,
                accel_y: accel_y,
                accel_z: accel_z,
                magneto_x: magneto_x,
                magneto_y: magneto_y,
                magneto_z: magneto_z,
                roll: roll,
                pitch: pitch,
                yaw: yaw,
                altitude: altitudeArray,
                getaran: getaranArray,
                trigger: trigger
            } 
        });

        setTimeout(deteksiGempa, 10)
    })
};

deteksiGempa();

io.sockets.on('connection', function(socket) {
    return;
});
