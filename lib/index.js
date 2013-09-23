var deputy = require('deputydb');
var DBProxy = require('./db');
var PieHTTP = require('./http');
var Subscription = require('./subscription');
var EventEmitter = require('events').EventEmitter;

function PIE(config) {
    this.sessions = {};
    this.config = config;
    this.db = new DBProxy(this);
    this.http = new PieHTTP(this);
    this.subscription = new Subscription(this);
    this.emitter = new EventEmitter();

    this.emitter.on('addItem', function(item) {
        console.log("GOT EVENT [addItem]: ", item);
        this.handleEvent(item);
    }.bind(this));
    this.emitter.on('addFile', function(item) {
        console.log("GOT EVENT [addFile]: ", item);
        this.handleEvent(item);
    }.bind(this));
}

(function() {

    this.handleEvent = function (event) {
        var pie = this;
        this.db.channel(event.user, event.domain).db.getDir(event.channel, function (err, dir) {
            console.log("EVENT DIR", dir);
            if (dir.children.hasOwnProperty('subscriptions')) {
                console.log("has users");
                var users = Object.keys(dir.children.subscriptions);
                console.log(users);
                users.forEach(function (user) {
                    if (pie.sessions.hasOwnProperty(user)) {
                        for (sidx in pie.sessions[user]) {
                            var session = pie.sessions[user][sidx];
                            session.sendEvent(event);
                        }
                    }
                });
            }
        });
    };

}).call(PIE.prototype);

module.exports = PIE;
