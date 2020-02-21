var amqp = require('amqplib/callback_api');
var amqpURL = "amqp://:@cat.rmq.cloudamqp.com/";

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
