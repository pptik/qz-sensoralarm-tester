var i2c = require('i2c-bus');
var async = require('async');
var GYRO_CALIBRATION_TRESHOLD = 4;

var ITG3200_IDENTITY = 0x68;
var ITG3200_IDENTITY_MASK = 0x7E;
var ITG3200_MEMORY_ADDRESS = 0x1D;
var ITG3200_BUFFER_SIZE = 6;
var ITG3200_RESET_ADDRESS = 0x3E;
var ITG3200_RESET_VALUE = 0x80;
var ITG3200_LOW_PASS_FILTER_ADDR = 0x16;
var ITG3200_LOW_PASS_FILTER_VALUE = 0x1D;
// 10Hz low pass filter
var ITG3200_OSCILLATOR_ADDR = 0x3E;
var ITG3200_OSCILLATOR_VALUE = 0x01;
// use X gyro oscillator
var ITG3200_SCALE_TO_RADIANS = 823.626831;
// 14.375 LSBs per °/sec, / Pi / 180
var ITG3200_TEMPERATURE_ADDRESS = 0x1B;

var gyroTempBias = [0.0, 0.0, 0.0];

function radians(degrees) {
	return degrees * Math.PI / 180;
};

function ITG3200(callback) {
	this.FINDZERO = 49;
	this.gyroRate = [0.0, 0.0, 0.0];
	this.gyroZero = [0, 0, 0];
	this.gyroSample = [0, 0, 0];
	this.gyroScaleFactor = 0.0;
	this.gyroHeading = 0.0;
	this.gyroLastMesuredTime = 0;
	this.gyroSampleCount = 0;

	this.wire = i2c.openSync(1);
	this.gyroScaleFactor = radians(1.0 / 14.375);
	var self = this;
	async.waterfall([
	function(cb) {
		self.wire.writeByte(ITG3200_IDENTITY, ITG3200_RESET_ADDRESS, ITG3200_RESET_VALUE, function(err) {
			cb(err);
		});
	},
	function(cb) {
		self.wire.writeByte(ITG3200_IDENTITY, ITG3200_LOW_PASS_FILTER_ADDR, ITG3200_LOW_PASS_FILTER_VALUE, function(err) {
			cb(err);
		});
	},
	function(cb) {
		self.wire.writeByte(ITG3200_IDENTITY, ITG3200_RESET_ADDRESS, ITG3200_OSCILLATOR_VALUE, function(err) {
			cb(err);
		});
	}], function(err) {
		if (!err) {
			setTimeout(function() {
				callback(null);
			}, 1000);

		} else {
			callback(err);
		}
	});
};

ITG3200.prototype.calibrateGyro = function(callback) {
	var findZeros;
	var self = this;
	function getSample(count, axis, cb) {
		if (count < self.FINDZERO) {
			self.wire.readI2cBlock(ITG3200_IDENTITY, (axis * 2) + ITG3200_MEMORY_ADDRESS, 2, Buffer.alloc(2), function(err, byte, res) {
				if (!err) {
					findZeros[count] = res.readInt16BE(0);
					setTimeout(function() {
						getSample(++count, axis, cb);
					}, 10);
				} else {
					console.log(err);
				}
			});
		} else {
			cb();
		}
	}

	function findZero(axis) {
		if (axis < 3) {
			findZeros = new Array(self.FINDZERO);
			getSample(0, axis, function() {
				findZeros.sort();
				var diff = Math.abs(findZeros[0] - findZeros[findZeros.length - 1]);
				var tmp = findZeros[Math.round(findZeros.length / 2)];
				if (diff <= GYRO_CALIBRATION_TRESHOLD) {
					self.gyroZero[axis] = tmp;
					findZero(++axis);
				} else {
					callback(false);
					return;
				}

			});
		} else {
			callback(true);
		}
	}

	findZero(0);

}

ITG3200.prototype.measureGyro = function(callback) {
	var self = this;
	this.wire.readI2cBlock(ITG3200_IDENTITY, ITG3200_MEMORY_ADDRESS, ITG3200_BUFFER_SIZE, Buffer.alloc(6), function(err, byte, res) {
		if (!err) {
			var gyroADC = new Array(3);
			gyroADC[XAXIS] = res.readInt16BE(XAXIS * 2) - self.gyroZero[XAXIS];
			gyroADC[YAXIS] = self.gyroZero[YAXIS] - res.readInt16BE(YAXIS * 2);
			gyroADC[ZAXIS] = self.gyroZero[ZAXIS] - res.readInt16BE(ZAXIS * 2);

			for (var axis = XAXIS; axis <= ZAXIS; axis++) {
				self.gyroRate[axis] = gyroADC[axis] * self.gyroScaleFactor;
			}

			var currentTime = parseInt(process.hrtime()[1] / 1000);
			var delta = ((currentTime - self.gyroLastMesuredTime) / 1000000.0);
			if (self.gyroRate[ZAXIS] > radians(1.0) || self.gyroRate[ZAXIS] < radians(-1.0)) {
				self.gyroHeading += self.gyroRate[ZAXIS] * delta;
			}
			self.gyroLastMesuredTime = currentTime;
			callback(null);
		} else {
			callback(err);
		}
	});

}

ITG3200.prototype.measureGyroSum = function(callback) {
	var self = this;
	this.wire.readI2cBlock(ITG3200_IDENTITY, ITG3200_MEMORY_ADDRESS, ITG3200_BUFFER_SIZE, Buffer.alloc(6), function(err, byte, res) {
		if (!err) {
			for (var axis = XAXIS; axis <= ZAXIS; axis++) {
				self.gyroSample[axis] += res.readInt16BE(axis * 2)
			}
			self.gyroSampleCount++;
			callback(null);
		} else {
			callback(err);
		}
	});

}

ITG3200.prototype.evaluateGyroRate = function() {
	var gyroADC = new Array(3);
	gyroADC[XAXIS] = (this.gyroSample[XAXIS] / this.gyroSampleCount) - this.gyroZero[XAXIS];
	gyroADC[YAXIS] = this.gyroZero[YAXIS] - (this.gyroSample[YAXIS] / this.gyroSampleCount);
	gyroADC[ZAXIS] = this.gyroZero[ZAXIS] - (this.gyroSample[ZAXIS] / this.gyroSampleCount);

	this.gyroSample[XAXIS] = 0;
	this.gyroSample[YAXIS] = 0;
	this.gyroSample[ZAXIS] = 0;
	this.gyroSampleCount = 0;

	for (var axis = 0; axis <= global.ZAXIS; axis++) {
		this.gyroRate[axis] = gyroADC[axis] * this.gyroScaleFactor;
	}

	var currentTime = process.hrtime()[1] * 1000;
	if (this.gyroRate[ZAXIS] > radians(1.0) || this.gyroRate[ZAXIS] < radians(-1.0)) {
		this.gyroHeading += this.gyroRate[ZAXIS] * ((currentTime - this.gyroLastMesuredTime) / 1000000.0);
	}
	this.gyroLastMesuredTime = currentTime;
}

module.exports = ITG3200;
