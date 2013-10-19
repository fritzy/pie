var EventEmitter = require('events').EventEmitter;

function Events(pie) {
    this.pie = pie;
}

Events.prototype = Object.create(EventEmitter.prototype);

(function () {

    this.send = function (type, user, domain, channel, event) {
        this.pie.db.channel(user, domain).db.write(channel, 'event', event, function (err) {
            this.emit(type, user + '@' + domain + channel, event);
            this.process(type, user, domain, channel, event);
        }.bind(this));
    };

    this.sendToUser (user, event) {
    };

    this.process = function (type, user, domain, channel, event) {
    };

}).call(Events.prototype);
