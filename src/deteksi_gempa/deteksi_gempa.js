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

const imu = require(__dirname + '/../IMU/imu.js');
const IMU = new imu();

server.listen(process.env.PORT || 1337);
console.log('Server running at http://127.0.0.1:1337/');

app.get('/', function(req, res) {
    res.sendFile(path.resolve(__dirname + '/../../index.html'));
});

var accel_x = [];
var accel_y = [];
var accel_z = [];  
var roll = [];
var pitch = [];
var yaw = [];
var getaran = 0;
var getaranArray = [];
var dataIndex = [];
var count = 0;
var ledBlinking = false;

//Config Trigger Here
const trigger = 10;

function deteksiGempa() {
    IMU.readAll()
    .then(function(imuData) {
        count++;
        accel_x.push(imuData.accel_x)
        accel_y.push(imuData.accel_y)
        accel_z.push(imuData.accel_z)
        roll.push(imuData.roll)
        pitch.push(imuData.pitch)
        yaw.push(imuData.yaw)

        if (imuData.accel_x > 2.5 || imuData.accel_x < -2.5) {
            getaran++;
        }
        if (imuData.accel_y > 2.5 || imuData.accel_y < -2.5) {
            getaran++;
        }

        if (getaran >= trigger) {
            player.play(__dirname + '/../play_audio/media/alarm.mp3', function(err){
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

        if (accel_x.length > 50) {
            accel_x = accel_x.slice(1, accel_x.length);
            accel_y = accel_y.slice(1, accel_y.length);
            accel_z = accel_z.slice(1, accel_z.length);
            roll = roll.slice(1, roll.length);
            pitch = pitch.slice(1, pitch.length);
            yaw = yaw.slice(1, yaw.length);
            getaranArray = getaranArray.slice(1, getaranArray.length);
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
                roll: roll,
                pitch: pitch,
                yaw: yaw,
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
