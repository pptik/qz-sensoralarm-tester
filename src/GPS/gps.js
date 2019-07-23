var gpsd = require('../../node_modules/node-gpsd/lib/gpsd');

var daemon = new gpsd.Daemon({
  program: '/usr/sbin/gpsd',
  device: '/dev/ttyS0',
  verbose: true
});

daemon.start(function() {
  var listener = new gpsd.Listener();

  listener.on('TPV', function (tpv) {
    console.log(tpv);
  });

  listener.connect(function() {
    listener.watch();
  });
});
