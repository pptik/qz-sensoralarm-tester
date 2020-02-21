var amqp = require('amqplib/callback_api');
var amqpURL = `amqp://${process.env.AMQP_USERNAME}:${process.env.AMQP_PASSWORD}@${process.env.AMQP_HOSTNAME}/${process.env.AMQP_VHOST}`;

amqp.connect(amqpURL, function(err, conn) {
    conn.createChannel(function(err, ch) {
        var q = 'DeteksiGempa';
        var msg = 'Test';
        ch.assertQueue(q, {durable: false});
        console.log(" <- Waiting for messages in %s. To exit press CTRL+C", q);
        ch.consume(q, function(msg) {
            console.log(" <- Received %s", msg.content);
        }, {noAck: true});
    });
});
