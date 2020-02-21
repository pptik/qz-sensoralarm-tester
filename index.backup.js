var player = require('play-sound')(opts = {})
var Gpio = require('onoff').Gpio;
var express = require('express');
var app = express()
var server = require('http').createServer(app);
var path = require('path');
const io = require('socket.io').listen(server);

const imu = require(__dirname + '/src/IMU/imu.js');
const IMU = new imu();
/*
require('dotenv').config();
const fs = require('fs');
var protobuf = require('protocol-buffers')
var mqtt = require('mqtt');  
*/

var LED1 = new Gpio(17, 'out');
var LED2 = new Gpio(27, 'out');
var LED3 = new Gpio(22, 'out')
LED2.writeSync(1);

//var messages = protobuf(fs.readFileSync(process.env.PROTOFILE))

/*
options={
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean:true
};

var client = mqtt.connect(process.env.MQTT_HOST,options)

//testing
var jwtTest = "507f1f77bcf86cd799439011";

var protoMsg = {
    station_id: jwtTest,
    // signature: jwtTest,
    latitude: 0,
    longitude: 0,
    start_time: 0,
    duration: 0,
    location_sampling_rate: 0,
    motion_sampling_rate: 0,
    latitude: [0, 0,0, 0],
    longitude: [0, 0,0, 0],
    altitude: [0,0,0,0,0],
    gravity_x: [0,0,0,0,0],
    gravity_y: [0,0,0,0,0],
    gravity_z: [0,0,0,0,0],
    geomagnetic_x: [0,0,0,0,0],
    geomagnetic_y: [0,0,0,0,0],
    geomagnetic_z: [0,0,0,0,0],
    raw_accel_x: [0,0,0,0,0],
    raw_accel_y: [0,0,0,0,0],
    raw_accel_z: [0,0,0,0,0],
    linear_accel_x: [0,0,0,0,0],
    linear_accel_y: [0,0,0,0,0],
    linear_accel_z: [0,0,0,0,0],
    rotation_rate_x: [0,0,0,0,0],
    rotation_rate_y: [0,0,0,0,0],
    rotation_rate_z: [0,0,0,0,0],
    inclination_matrix_5: [0,0,0,0,0],
    inclination_matrix_6: [0,0,0,0,0],
    inclination_matrix_9: [0,0,0,0,0],
    inclination_matrix_10: [0,0,0,0,0],
    rotation_matrix_0: [0,0,0,0,0],
    rotation_matrix_1: [0,0,0,0,0],
    rotation_matrix_2: [0,0,0,0,0],
    rotation_matrix_4: [0,0,0,0,0],
    rotation_matrix_5: [0,0,0,0,0],
    rotation_matrix_6: [0,0,0,0,0],
    rotation_matrix_8: [0,0,0,0,0],
    rotation_matrix_9: [0,0,0,0,0],
    rotation_matrix_10: [0,0,0,0,0],
};

var buf = messages.ContinuousStream.encode(porotoMsg);
*/

app.get('/', function(req, res) {
    res.sendFile(path.resolve(__dirname + '/index.html'));
});

var alarmGempa = undefined;
var alarmTsunami = undefined;

var playAlarmGempa = false;
var playAlarmTsunami = false;
// var skalaRichter = []
// var percepatan = []
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
var gempaBlinking = false;
var tsunamiBlinking = false;

//Config Trigger Here
const triggerGempa = 10;
const triggerTsunami = 20;

var data;

/*
client.on('connect', (con) => {  
    console.log(con);
    const topic = process.env.TOPIC;
    client.subscribe(topic, {qos: 1}, (err, con2) => {
        setInterval(function() {
            client.publish(topic, buf);
            console.log('Message Sent');
        
        }, 5000);
    });   
})
*/

function deteksiGempa() {
    IMU.readAll(qmc5883l_raw=true)
    .then(function(imuData) {
        // console.log(imuData);
        count++;
        accel_x.push(imuData.accel_x);
        accel_y.push(imuData.accel_y);
        accel_z.push(imuData.accel_z);
        magneto_x.push(imuData.magneto_x);
        magneto_y.push(imuData.magneto_y);
        magneto_z.push(imuData.magneto_z);
        roll.push(imuData.roll);
        pitch.push(imuData.pitch);
        yaw.push(imuData.yaw);
        altitude = imuData.height;

        // percepatan.push(Math.sqrt(Math.pow(imuData.accel_x, 2) + Math.pow(imuData.accel_y, 2)));
        // skalaRichter.push(Math.log(percepatan[percepatan.length -1]) + 1.6 * (Math.log(30)) - 0.015);
        // console.log(skalaRichter[skalaRichter.length - 1])
        
        if (imuData.accel_x > 2.5 || imuData.accel_x < -2.5) {
            getaran++;
        }
        if (imuData.accel_y > 2.5 || imuData.accel_y < -2.5) {
            getaran++;
        }

        // if (skalaRichter[skalaRichter.length - 1] >= triggerGempa & skalaRichter[skalaRichter.length -1] < triggerTsunami) { // Gempa
        if (getaran >= triggerGempa && getaran < triggerTsunami) {
            if (!playAlarmGempa && !playAlarmTsunami) {
                playAlarmGempa = true;
                alarmGempa = player.play(__dirname + '/src/play_audio/media/alarmGempa.wav', function(err){
                    if (err) return;
                    playAlarmGempa = false;
                });
                // alarmGempa.kill();
            }

            if (!gempaBlinking && !tsunamiBlinking) {
                gempaBlinking = true;
                LED2.writeSync(0);
                var blinkInterval = setInterval(blinkLED, 250);
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
                    gempaBlinking = false;
                }
                setTimeout(endBlink, 4000);
            } 
        }
        // else if (skalaRichter[skalaRichter.length - 1] >= triggerTsunami) { // Potensi Tsunami
        else if (getaran >= triggerTsunami) {
            if (playAlarmGempa) {
                alarmGempa.kill();
                playAlarmGempa = false;
                playAlarmTsunami = true;

                alarmTsunami = player.play(__dirname + '/src/play_audio/media/alarmTsunami.wav', function(err){
                    if (err) return;
                    playAlarmTsunami = false;
                });
            }
            else if (!playAlarmTsunami) {
                playAlarmTsunami = true;
                player.play(__dirname + '/src/play_audio/media/alarmTsunami.wav', function(err){
                    if (err) return;
                    playAlarmTsunami = false;
                });
            }

            if (!tsunamiBlinking) {
                tsunamiBlinking = true;
                LED2.writeSync(0);
                var blinkInterval = setInterval(blinkLED, 100);
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
                    tsunamiBlinking = false;
                }
                setTimeout(endBlink, 4000);
            } 
        }
        else {
            if (!gempaBlinking && !tsunamiBlinking && LED2.readSync() === 0) {
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
            // skalaRichter = skalaRichter.slice(1, skalaRichter.length);
            altitudeArray = altitudeArray.slice(1, altitudeArray.length);
        }
        else {
            dataIndex.push(accel_x.length);
        }

        data = {
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
            // sr: skalaRichter,
            triggerGempa: triggerGempa,
            triggerTsunami: triggerTsunami
        };

/*
        protoMsg.altitude.push(altitude)
        protoMsg.raw_accel_x.push(imuData.accel_x)
        protoMsg.raw_accel_y.push(imuData.accel_y)
        protoMsg.raw_accel_z.push(imuData.accel_z)
        protoMsg.geomagnetic_x.push(imuData.magneto_x)
        protoMsg.geomagnetic_y.push(imuData.magneto_y)
        protoMsg.geomagnetic_z.push(imuData.magneto_z)
        protoMsg.rotation_rate_x.push()
        protoMsg.rotation_rate_y.push()
        protoMsg.rotation_rate_z.push()

        if (protoMsg.altitude.length > 5) {
            protoMsg.altitude = protoMsg.altitude.slice(1, 6)
            protoMsg.raw_accel_x = protoMsg.raw_accel_x.slice(1, 6)
            protoMsg.raw_accel_y = protoMsg.raw_accel_y.slice(1, 6)
            protoMsg.raw_accel_z = protoMsg.raw_accel_z.slice(1, 6)
            protoMsg.geomagnetic_x = protoMsg.geomagnetic_x.slice(1, 6)
            protoMsg.geomagnetic_y = protoMsg.geomagnetic_y.slice(1, 6)
            protoMsg.geomagnetic_z = protoMsg.geomagnetic_z.slice(1, 6)
            protoMsg.rotation_rate_x = protoMsg.rotation_rate_x.slice(1, 6)
            protoMsg.rotation_rate_y = protoMsg.rotation_rate_y.slice(1, 6)
            protoMsg.rotation_rate_z = protoMsg.rotation_rate_z.slice(1, 6)
        }

        buf = messages.ContinuousStream.encode(porotoMsg);
*/

        io.sockets.emit('data', {
            labels: dataIndex, 
            data: data
        });

        setTimeout(deteksiGempa, 10)
    })
};

deteksiGempa()

io.sockets.on('connection', function(socket) {
    return;
});

server.listen(process.env.PORT || 1337);
console.log('Server running at http://127.0.0.1:1337/');
