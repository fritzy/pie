var deputy = require('deputydb');
var DBProxy = require('./db');
var PieHTTP = require('./http');
var Subscription = require('./subscription');
var EventEmitter = require('events').EventEmitter;
var async = require('async');
var ACL = require('./acl');

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

    this.getACL = function (who, user, domain, channel, cb) {
        var pie = this;
        if (user + '@' + domain === who) {
            var acl = new ACL();
            acl.setOwner();
            cb(false, acl);
            return;
        }
        async.waterfall([
            //get config
            function (acb) {
                this.db.channel(user, domain).db.getDir(channel, function (err, dir) {
                    console.log(dir);
                    if (dir.children.hasOwnProperty('config') && Object.keys(dir.children.config).length > 0) {
                        this.db.channel(user, domain).db.get(dir.children.config[Object.keys(dir.children.config)[0]], acb);
                    } else {
                        acb("No config for directory: " + dir.path);
                    }
                }.bind(this));
            }.bind(this),
            //get relationship
            function (config, acb) {
                pie.db.relationship(user, domain).get(who, function (err, relationship) {
                    acb(err, config, relationship);
                });
            },
            //get additional acl
            function (config, rship, acb) {
                this.db.channel(user, domain).read(who, 'acl', function (err, acl) {
                    if (err || !acl) {
                        acl = '';
                    }
                    acb(false, config, rship, acl);
                });
            }
        ], function (err, config, rship, uacl) {
            var acl = new ACL();
            var matchtags = [];
            if (!err) {
                acl.parse(config.public_acl);
                acl.parse(config.uacl);
                if (config.hasOwnProperty('access_tags')) {
                    matchtags = config.access_tags.filter(function(n) {
                        return rship.access_tags.indexOf(n) != -1
                    });
                }
                if (config.owner === who) {
                    acl.setOwner();
                }
            }
            cb(err, acl);
        });
    };

}).call(PIE.prototype);

module.exports = PIE;
