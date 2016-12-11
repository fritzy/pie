<<<<<<< HEAD
var pie = require('./lib');
var config = require('./config');
var replify = require('replify');
var minimist = require('minimist');
var async = require('async');
var colors = require('colors');
var bucker = require('bucker');
var log = bucker.createLogger({app: 'server.log', console: true}, 'main');

function PieRepl(pie) {
    log.info("Starting...");
    this.pie = pie;
    this.crap = 1;
    var repli = this;

    this.func_usage = {
        createUser: "createUser [user] [domain] [password]",
        generateToken: 'getToken [user] [domain]',
    };
    this.funcs = {
        createUser: function(user, domain, pass, cb) {
            repli.pie.db.auth(domain).create(user, pass, function (err, reply) {
                if(!err) {
                    cb(false, "User added.");
                } else {
                    cb(true, "hello?");
                }
            });
        }.bind(this),
        generateToken: function (user, domain, cb) {
            repli.pie.db.auth(domain).getToken(user, '', function (err, token) {
                console.log("done");
                cb(err, token);
            }, true);
        },
        help: function (cb) {
            async.reduce(Object.keys(repli.func_usage), '', function(desc, fname, acb) {
                desc += '\n';
                desc += fname.green.bold + ": " + "\n  " + repli.func_desc[fname];
                desc += '\n  Usage: '.red + repli.func_usage[fname];
                desc += '\n';
                acb(false, desc);
            },
            function (err, desc) {
                cb(false, desc);
            });
        },
    };
    
    this.func_desc = {
        createUser: "Create a new local user.",
        generateToken: "Generate token for user."
    }
}


var server = new pie(config);

function evaler(cmd, ctx, filename, cb) {
    cmd = cmd.replace('\n', '');
    var cargs = cmd.match(/\w+|(?:")(?:\\.|[^(?:")])+"/g);
    if (cargs === null) {
        cb(false);
        return;
    }
    var args = minimist(cargs)._;
    if (ctx.funcs.hasOwnProperty(args[0])) {
        var func = ctx.funcs[args[0]];
        args.push(cb);
        if (func.length === args.length - 1) {
            try {
                func.apply(ctx, args.slice(1));
            } catch (e) {
                throw e;
            }
        } else {
            cb(false, "Usage: " + ctx.func_usage[args[0]]);
        }
    } else {
        cb (false, "Command not found: " + args[0] + '\n  Try "help"');
    }
}

function writer(thing) {
    return thing;
}

replify({name: 'pie', path: __dirname, eval: evaler, writer: writer}, server.exp, new PieRepl(server));

=======
var websocket    = require('ws');
var http         = require('http');
var express      = require('express');
var EventEmitter = require('events').EventEmitter;
var uuid         = require('node-uuid');
var Warp = require('./node-warp');
var fs = require('./fs');

var app = express();

function OTalkServer(config) {
    this.config = config;
    this.app = express();

    this.session = {};

    this.channel = new Channel;

    this.app.use(express.static(__dirname + '/client'));

    this.server = http.createServer(this.app);
    this.server.listen(8080);

    this.wss = new websocket.Server({server: this.server});

    this.websocket = {};

    this.wss.on('connection', function(ws) {
        ws.id = uuid();
        this.websocket[ws.id] = ws;
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
        ws.onerror = function(e) {
            console.log("error", e);
        }.bind(this);
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
        this.channel.publish(to, from, stanza, function (err, reply) {
        });
    };

    this.handleQuery = function (ws, to, from, stanza) {
        var nr;
        console.log("RECV QRY:", stanza);
        if (typeof this[stanza.query.ns] === 'function') {
            this[stanza.query.ns](to, from, stanza, ws, function (err, reply) {
                console.log(typeof reply, reply);
                reply.response.id = stanza.query.id;
                this.send(ws, JSON.stringify(reply));
            }.bind(this));
        } else {
            this.channel[stanza.query.ns](to, from, stanza, function (err, reply) {
                nr = reply;
                nr.response.id = stanza.query.id;
                this.send(ws, JSON.stringify(nr));
            }.bind(this));
        }
    };

    this['http://otalk.com/p/subscribe'] = function(to, from, stanza, ws, cb) {
        this.channel.subscribe(to, from, stanza, function(err, reply) {
            this.subscribe(ws, to.id + to.channel);
            cb(err, {from: to.full, to: from.full, response: {ns: 'http://otalk.com/p/subscribe'}});
        }.bind(this));
    };

    this.subscribe = function (ws, channel) {
        var fullid = ws.user_id + '/sess/' + ws.user_session;
        var ws;
        sub = Warp.Warp.subscribe({to: "warp://warp:netevents/public/" + channel}, function (message) {
            console.log("GOT MESSAGE", message.object);
            if (this.session.hasOwnProperty(fullid)) {
                for (var widx in this.session[fullid].ws) {
                    ws = this.session[fullid].ws[widx];
                    ws.send(JSON.stringify(message.object));
                }
            };
        }.bind(this));
        if (this.session.hasOwnProperty(fullid)) {
            this.session[fullid].sub.push(sub);
        }
    };

    this.unsubscribe = function (ws, channel) {
    };

    this['http://otalk.com/p/bind'] = function(to, from, stanza, ws, cb) {
        var bound = this.parseURI(stanza.query.bind);
        var sess = bound.channel.split('/');
        sess = sess[sess.length - 1];
        var fullid = bound.id + '/sess/' + sess;

        if (!this.session.hasOwnProperty(fullid)) {
            this.session[fullid] = {ws: [ws], sub: []};
        } else {
            this.session[fullid].ws.push(ws);
        }

        ws.user_id = bound.id;
        ws.user_session = sess;

        cb(false, {to: bound.id, response: {ns: 'http://otalk.com/p/bind', bind: fullid}});
    };

    this.parseURI = function (uri) {
        var idx, id, channel, args = {}, pairs, pair;
        if(typeof uri === 'undefined') {

            return {id: "", channel: "/", args: {}};
        }
        idx = uri.indexOf('/');
        if (idx === -1) {
            return {id: uri, full: uri, channel: '', args: {}};
        }
        id = uri.substr(0, idx);
        channel = uri.substr(idx);
        idx = channel.indexOf('?');
        if (idx !== -1) {
            args = channel.substr(idx + 1)
            channel = channel.substr(0, idx);
            pairs = args.split('&');
            for (var pidx in pairs) {
                console.log(pairs);
                pair = pairs[pidx].split('=');
                args[decodeURIComponent(pair[0])] = decodeURIComponent(pair[pair.length - 1]);
            }
        }
        return {id: id, channel: channel, full: uri, args: args};

    };


    this.validateFrom = function (from) {
        return from;
    };

    this.validateTo = function (to) {
        return to;
    };

}).call(OTalkServer.prototype);


var Channel = function (name) {
};


(function() {

    this.create = function (to, from, msg, cb) {
        fs.createPath('otalk_' + to.id, to.channel, {'derp': 'herp'}, function(err, reply) {
            if(!err) {
                cb(false, {to: from.full, from: to.full, response: {ns: 'http://otalk.com/p/create'}});
            } else {
                cb(true, {to: from.full, from: to.full, response: {ns: 'http://otalk.com/p/create', error: {text: "Channel already exists"}}});
            }
        });
    };
    this['http://otalk.com/p/create'] = this.create;

    this.delete = function (to, from, msg, cb) {

    };

    this.move = function(user, channel, msg) {
    };

    this.getConfig = function (to, from, msg, cb) {
        fs.getPath(to.id, to.channel, function (err, reply) {
            console.log(err, reply);
        });
    };
    this['http://otalk.com/p/config'] = this.getConfig;

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
    };

    this.publish = function (to, from, msg, cb) {

        fs.pathExists('otalk_' + to.id, to.channel, function (exists) {
            if (!exists) {
                cb(true, {to: from.full, from: to.full, response: {ns: 'http://otalk.com/p/publish', error: {text: "Channel doesn't exist."}}});
            } else {
                fs.addToPath('otalk_' + to.id, to.channel, 'msg', {time: Date.now()}, msg.msg, function (err, reply) {
                    Warp.Warp.send({to: "warp://warp:netevents/public/" + to.id + to.channel, data: msg});
                    cb(false, {to: from.full, from: to.full, response: {ns: 'http://otalk.com/p/publish', msg_id: reply.key}});
                });
            }
        });
    };
    
    this.subscribe = function (to, from, msg, cb) {
        cb(false, null);
    };
    //this['http://otalk.com/p/subscribe'] = this.subscribe;

    this.getACL = function (user, channel, msg) {
    };

    this.setACL = function (user, channel, msg) {
    };

}).call(Channel.prototype);

var server = new OTalkServer();
>>>>>>> 609a440da2811c698884b48dde0c9f192853ab4e
