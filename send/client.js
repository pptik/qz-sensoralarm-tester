require('dotenv').config();
const path = require('path');
const fs = require('fs');
var protobuf = require('protocol-buffers')
var mqtt = require('mqtt');  

var messages = protobuf(fs.readFileSync(process.env.PROTOFILE))

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

var buf = messages.ContinuousStream.encode({
    station_id: jwtTest,
    // signature: jwtTest,
    latitude: 18123.81,
    longitude: 78234876,
    start_time: 1,
    duration: 4,
    location_sampling_rate: 50,
    motion_sampling_rate: 10,
    latitude: [10, 20,55, 7],
    longitude: [10, 20,55, 7],
    altitude: [0,0,0,0,0],
    gravity_x: [1,2,3,4,5],
    gravity_y: [1,2,3,4,5],
    gravity_z: [1,2,3,4,5],
    geomagnetic_x: [1,2,3,4,5],
    geomagnetic_y: [1,2,3,4,5],
    geomagnetic_z: [1,2,3,4,5],
    raw_accel_x: [1,2,3,4,5],
    raw_accel_y: [1,2,3,4,5],
    raw_accel_z: [1,2,3,4,5],
    linear_accel_x: [1,2,3,4,5],
    linear_accel_y: [1,2,3,4,5],
    linear_accel_z: [1,2,3,4,5],
    rotation_rate_x: [1,2,3,4,5],
    rotation_rate_y: [1,2,3,4,5],
    rotation_rate_z: [1,2,3,4,5],
    inclination_matrix_5: [1,2,3,4,5],
    inclination_matrix_6: [1,2,3,4,5],
    inclination_matrix_9: [1,2,3,4,5],
    inclination_matrix_10: [1,2,3,4,5],
    rotation_matrix_0: [1,2,3,4,5],
    rotation_matrix_1: [1,2,3,4,5],
    rotation_matrix_2: [1,2,3,4,5],
    rotation_matrix_4: [1,2,3,4,5],
    rotation_matrix_5: [1,2,3,4,5],
    rotation_matrix_6: [1,2,3,4,5],
    rotation_matrix_8: [1,2,3,4,5],
    rotation_matrix_9: [1,2,3,4,5],
    rotation_matrix_10: [1,2,3,4,5],
});

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

