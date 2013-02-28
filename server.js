var websocket    = require('ws');
var http         = require('http');
var express      = require('express');
var EventEmitter = require('events').EventEmitter;
var thoonk       = require('thoonk');
var uuid         = require('node-uuid');
var Warp = require('./warp');

var app = express();

function OTalkServer(config) {
    this.config = config;
    this.app = express();

    this.chan_subscriptions = {};
    this.user_subscriptions = {};
    this.users = {};
    this.websockets = {};

    this.lredis = require('redis').createClient();
    this.lredis.on('message', function (channel, msg) {
        var jmsg = JSON.parse(msg);
        var ws;
        jmsg.from = channel;
        if(this.chan_subscriptions.hasOwnProperty(channel)) {
            for (var cidx in this.chan_subscriptions[channel]) {
                //TODO grab user subscription
                ws = this.chan_subscriptions[channel][cidx];
                jmsg.to = ws.user_id;
                console.log("SEND:", jmsg);
                this.chan_subscriptions[channel][cidx].send(JSON.stringify(jmsg));
            }
        }
    }.bind(this));

    this.app.use(express.static(__dirname + '/client'));

    this.server = http.createServer(this.app);

    this.thoonk = new thoonk.Thoonk();
    this.thoonk.registerType('Channel', Channel, function () {
        this.server.listen(8080);
        console.log(Channel);
        this.channel = this.thoonk.objects.Channel();
    }.bind(this));

    this.wss = new websocket.Server({server: this.server});

    this.connections = [];

    this.wss.on('connection', function(ws) {
        ws.id = uuid();
        ws.otalk = {};
        ws.otalk.subscriptions = [];
        ws.on('message', function(msg) {

            var pl = JSON.parse(msg);

            var from = this.parseURI(pl.from);
            if (!from.id) { from.id = ws.user_id; }
            var to = this.parseURI(pl.to);

            if(pl.hasOwnProperty('msg')) {
                this.handleMessage(ws, to, from, pl);
            } else if (pl.hasOwnProperty('query')) {
                this.handleQuery(ws, to, from, pl);
            } else {
                console.log("Unknown payload type.");
            }
        }.bind(this));
        ws.on('error', function(e) {
            console.log("error", e);
        }.bind(this));
    }.bind(this));

}

OTalkServer.prototype = Object.create(EventEmitter);

(function () {

    this.send = function (ws, body, from, to) {
        if (typeof body === 'object') {
            body = JSON.stringify(body);
        }
        ws.send(body);
        console.log("SEND:", body);
    };

    this.handleMessage = function (ws, to, from, stanza) {
        console.log("RECV MSG:", stanza);
        this.channel.publish(to.id, to.channel, from.id, from.channel, JSON.stringify(stanza), function (err, reply) {
        });
    };

    this.handleQuery = function (ws, to, from, stanza) {
        var nr;
        console.log("RECV QRY:", stanza);
        if (typeof this[stanza.query.ns] == 'function') {
            this[stanza.query.ns](to, from, stanza, ws, function (err, reply) {
                console.log(typeof reply, reply);
                reply.response.id = stanza.query.id;
                this.send(ws, JSON.stringify(reply));
            }.bind(this));
        } else {
            this.channel[stanza.query.ns](to.id, to.channel, from.id, from.channel, JSON.stringify(stanza), function (err, reply) {
                nr = JSON.parse(reply);
                nr.response.id = stanza.query.id;
                this.send(ws, JSON.stringify(nr));
            }.bind(this));
        }
    };

    this['http://otalk.com/p/subscribe'] = function(to, from, stanza, ws, cb) {
        this.channel.subscribe(to.id, to.channel, from.id, from.channel, JSON.stringify(stanza), function(err, reply) {
            if (!err) {
                this.subscribe(ws, to.id + to.channel);
            }
            cb(err, JSON.parse(reply));
        }.bind(this));
    };

    this.subscribe = function (ws, channel) {
        this.lredis.subscribe(channel);
        if (!this.chan_subscriptions.hasOwnProperty(channel)) {
            this.chan_subscriptions[channel] = [];
        }
        this.chan_subscriptions[channel].push(ws);
    };

    this['http://otalk.com/p/bind'] = function(to, from, stanza, ws, cb) {
        var bound = this.parseURI(stanza.query.bind);
        var sess = bound.channel.split('/');
        sess = sess[sess.length - 1];
        if (!this.users.hasOwnProperty(bound.id)) {
            this.users[bound.id] = {};
        }
        if (!this.users[bound.id].hasOwnProperty(sess)) {
            this.users[bound.id][sess] = [];
        }
        this.users[bound.id][sess].push(ws);
        this.websockets[ws.id] = bound.id + '/sess/' + sess;
        if (!this.user_subscriptions.hasOwnProperty(bound.id + '/sess/' + sess)) {
            this.user_subscriptions[bound.id + '/sess/' + sess] = [];
        }
        ws.user_id = bound.id;
        ws.user_session = sess;
        cb(false, {to: bound.id, response: {ns: 'http://otalk.com/p/bind', bind: bound.id + '/sess/' + sess}});
    };

    this.parseURI = function (uri) {
        if(typeof uri === 'undefined') {
            return {id: "", channel: "/", args: null};
        }
        var idx = uri.indexOf('/');
        if (idx === -1) {
            return {id: uri, channel: "/", args: null};
        }
        var id = uri.substr(0, idx);
        var channel = uri.substr(idx);
        return {id: id, channel: channel, args: null};

    };


    this.validateFrom = function (from) {
        return from;
    };

    this.validateTo = function (to) {
        return to;
    };


}).call(OTalkServer.prototype);


var Channel = function (name, thoonk_inst) {
    thoonk.ThoonkBaseInterface.call(this, thoonk_inst);
};

Channel.prototype = Object.create(thoonk.ThoonkBaseInterface.prototype);
Channel.prototype.objtype = 'channel_1';
Channel.prototype.scriptdir = __dirname + '/scripts/channel_1';
Channel.prototype.event_content_type = 'json';
Channel.prototype.version = '1';


(function() {

    this.create = function (to, to_chan, from, from_chan, msg, cb) {
        this.runscript('create', [to, to_chan, from, from_chan, msg], cb); 
    };
    this['http://otalk.com/p/create'] = this.create;

    this.delete = function (to, from, msg, cb) {
    };

    this.move = function(user, channel, msg) {
    };

    this.getConfig = function (user, channel, msg) {
    };

    this.setConfig = function (user, channel, msg) {
    };

    this.getContent = function (user, channel, msg) {
    };

    this.getMessages = function (user, channel, msg) {
    };

    this.moveMessage = function (user, channel, msg) {
    };
    
    this.deleteMessage = function (user, channel, msg) {
    };

    this.getKeys = function (user, channel, msg) {
    };

    this.getChannels = function (user, channel, msg) {
    };

    this.getSubscriptions = function (user, channel, msg) {
        this.runscript('getsub', [to, to_chan, from, from_chan, msg], cb);
    };

    this.publish = function (to, to_chan, from, from_chan, msg, cb) {
        this.runscript('publish', [to, to_chan, from, from_chan, msg, uuid(), Date.now()], cb);
    };
    
    this.subscribe = function (to, to_chan, from, from_chan, msg, cb) {
        this.runscript('subscribe', [to, to_chan, from, from_chan, msg], cb);
    };
    //this['http://otalk.com/p/subscribe'] = this.subscribe;

    this.getACL = function (user, channel, msg) {
    };

    this.setACL = function (user, channel, msg) {
    };

}).call(Channel.prototype);

Channel.prototype.ns_map = {
    'http://otalk.com/p/create': Channel.prototype.create,
};

var server = new OTalkServer();
