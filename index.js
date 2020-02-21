var amqp = require('amqplib/callback_api');
var amqpURL = `amqp://${process.env.AMQP_USERNAME}:${process.env.AMQP_PASSWORD}@${process.env.AMQP_HOSTNAME}/${process.env.AMQP_VHOST}`;

var player = require('play-sound')(opts = {})
var Gpio = require('onoff').Gpio;
var express = require('express');
var app = express()
var server = require('http').createServer(app);
var path = require('path');
const io = require('socket.io').listen(server);

const imu = require(__dirname + '/src/IMU/imu.js');
const IMU = new imu();

var LED1 = new Gpio(17, 'out');
var LED2 = new Gpio(27, 'out');
var LED3 = new Gpio(22, 'out')

var ifError = false;
var connection;

var gempaBlinking = false;
var tsunamiBlinking = false;
var gempaBlinkInterval;
var tsunamiBlinkInterval;
var errorBlinkInterval;
var resetBlink = false;

function startAmqp() {
    connection = amqp.connect({
        protocol: 'amqp',
        hostname: process.env.AMQP_HOSTNAME,
        port: 5672,
        username: process.env.AMQP_USERNAME,
        password: process.env.AMQP_PASSWORD,
        heartbeat: 5,
        vhost: process.env.AMQP_VHOST
    }, function(err, conn) {
        if (!err) { 
            ifError = false;
            clearInterval(errorBlinkInterval);
            LED2.writeSync(1);
            LED1.writeSync(0);

            var alarmGempa = undefined;
            var alarmTsunami = undefined;
            
            var playAlarmGempa = false;
            var playAlarmTsunami = false;
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
            var data;

            //Config Trigger Here
            const triggerGempa = 10;
            const triggerTsunami = 20;
            
            
            conn.on("error", function(e) {
                if (!ifError) {
                    LED2.writeSync(0); LED3.writeSync(0);
                    clearInterval(tsunamiBlinkInterval); clearInterval(gempaBlinkInterval);
                    errorBlinkInterval = setInterval(() => LED1.writeSync(Number(!LED1.readSync())), 500);
                }
                
                ifError = true;
                setTimeout(startAmqp, 100);
            });
            
            conn.createChannel(function(err, ch) {
                var q = 'DeteksiGempa';
                
                try {
                    ch.assertQueue(q, {durable: false}, function(err, status) {
                        if (!err) {
                            if (status.messageCount > 50) {
                                LED1.writeSync(0); LED2.writeSync(0); LED3.writeSync(1);
                            }
                        }
                    });                    
                } 
                catch (err) {}

                function deteksi_gempa() {
                    IMU.readAll(qmc5883l_raw=true)
                    .then(function(imuData) {
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
                        
                        if (imuData.accel_x > 2.5 || imuData.accel_x < -2.5) {
                            getaran++;
                        }
                        if (imuData.accel_y > 2.5 || imuData.accel_y < -2.5) {
                            getaran++;
                        }
                
                        if (getaran >= triggerGempa && getaran < triggerTsunami) {
                            if (!playAlarmGempa && !playAlarmTsunami) {
                                playAlarmGempa = true;
                                alarmGempa = player.play(__dirname + '/src/play_audio/media/alarmGempa.wav', function(err){
                                    if (err) return;
                                    playAlarmGempa = false;
                                });
                            }
                
                            tsunamiBlinking = false;
                            clearInterval(tsunamiBlinkInterval);
                            LED2.writeSync(0);
                            LED3.writeSync(0);
                            if (!gempaBlinking && !tsunamiBlinking && !ifError) gempaBlinkInterval = setInterval(() => LED1.writeSync(Number(!LED1.readSync())), 250);
                            gempaBlinking = true;
                            resetBlink = true;
                        }
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
                
                            gempaBlinking = false;
                            clearInterval(gempaBlinkInterval); 
                            LED2.writeSync(0);
                            LED3.writeSync(LED1.readSync());
                            if (!tsunamiBlinking && !ifError) {
                                tsunamiBlinkInterval = setInterval(() => {
                                    LED1.writeSync(Number(!LED1.readSync()))
                                    LED3.writeSync(Number(!LED3.readSync()))
                                }, 250);
                            } 
                            tsunamiBlinking = true;
                            resetBlink = true;
                        }
                        else {
                            if (!gempaBlinking && !tsunamiBlinking) {
                                try {
                                    ch.assertQueue(q, {durable: false}, function(err, status) {
                                        if (!err) {
                                            if (status.messageCount > 50) {
                                                if (!gempaBlinking && !tsunamiBlinking) {
                                                    LED1.writeSync(0); LED2.writeSync(0); LED3.writeSync(1); 
                                                }
                                            }
                                            else if (!gempaBlinking && !tsunamiBlinking) {
                                                LED1.writeSync(0); LED2.writeSync(1); LED3.writeSync(0);
                                            }
                                        }
                                    });                                   
                                } 
                                catch (err) {}
                            }
                            else if (gempaBlinking || tsunamiBlinking) {
                                if (resetBlink) {
                                    resetBlink = false;
                                    setTimeout(() => {
                                        clearInterval(tsunamiBlinkInterval);
                                        clearInterval(gempaBlinkInterval);
                                        gempaBlinking = false;
                                        tsunamiBlinking = false;
                                    }, 2500);
                                }
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
                            triggerGempa: triggerGempa,
                            triggerTsunami: triggerTsunami
                        };

                        var dataAmqp = [
                            accel_x,
                            accel_y,
                            accel_z,
                            magneto_x,
                            magneto_y,
                            magneto_z,
                            roll,
                            pitch,
                            yaw,
                            altitudeArray[altitudeArray.length - 1],
                            getaranArray[getaranArray.length - 1]
                        ];
                
                        io.sockets.emit('data', {
                            labels: dataIndex, 
                            data: data
                        });
                        
                        try {
                            ch.sendToQueue(q, Buffer.from(dataAmqp));
                        }
                        catch (err) {}
                        setTimeout(deteksi_gempa, 100);
                    })
                }
                deteksi_gempa();
            });

            io.sockets.on('connection', function(socket) {
                return;
            });
        }
        else {
            if (!ifError) {
                LED2.writeSync(0); LED3.writeSync(0);
                clearInterval(tsunamiBlinkInterval); clearInterval(gempaBlinkInterval);
                errorBlinkInterval = setInterval(() => LED1.writeSync(Number(!LED1.readSync())), 500);
            }
            
            ifError = true;
            setTimeout(startAmqp, 100);
        }
    });
}

setTimeout(startAmqp, 1000);

app.get('/', function(req, res) {
    res.sendFile(path.resolve(__dirname + '/index.html'));
});

server.listen(process.env.PORT || 1337);
console.log('Server running at http://127.0.0.1:1337/');