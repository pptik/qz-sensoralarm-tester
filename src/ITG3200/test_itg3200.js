global.XAXIS = 0;
global.YAXIS = 1;
global.ZAXIS = 2;

var ITG3200 = require('./itg3200.js');

function degrees(radians) {

	return radians * 180 / Math.PI;

};

var gyro = new ITG3200(function(err) {
	if (!err)
		calibrate()
});

function calibrate() {
	gyro.calibrateGyro(function(calibrated) {
		if (calibrated) {
			readValues();
		} else {
			console.log("error while calibrating, gyro moved");
		}
	});
}

function readValues() {
	setInterval(function() {
		gyro.measureGyro(function(err) {
			if (!err) {
				console.log("Roll: " + degrees(gyro.gyroRate[XAXIS]) + " Pitch: " + degrees(gyro.gyroRate[YAXIS]) + " Yaw: " + degrees(gyro.gyroRate[ZAXIS]) + " Heading: " + degrees(gyro.gyroHeading));
			} else {
				console.log(err);
			}
		});
	}, 10);
}