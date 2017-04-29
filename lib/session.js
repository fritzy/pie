var uuid = require('node-uuid');
var bucker = require('bucker');
var log = bucker.createLogger({app: 'server.log', console: true}, 'http');

function Session(pie, ws) {
    this.pie = pie;
    this.user = null;
    this.domain = null;
    this.id = uuid();
    this.ws = ws;
    this.domain = this.ws.upgradeReq.headers.host.split(':')[0];
    log.debug("Websocket connection for " + this.domain);

    this.ws.on('error', this.handleError.bind(this));
    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('close', () => {
        log.debug('websocket closed');
        
    });
}

(function () {


    this.handleError = error => {
    };

    this.handleMessage = function (msg) {
        msg = JSON.parse(msg);
        console.log(msg);
        if (typeof this['rpc_' + msg.rpc]  === 'function') {
            this['rpc_' + msg.rpc](msg);
        }
    };

    this.sendEvent = function (event) {
        var id = uuid();
        event.id = id;
        this.ws.send(JSON.stringify(event));
    };


    this.rpc_tokenAuth = function (msg) {
        console.log("tokenAuth", msg);
        this.pie.db.auth(this.domain).validateToken(msg.token, (err, user, domain) => {
            console.log(err, user, domain);
            if (!err) {
                this.ws.send(JSON.stringify({
                    id: msg.id,
                    authed: true,
                    user: user + '@' + domain,
                }));
                this.user = user;
                this.domain = domain;
                if (!this.pie.sessions.hasOwnProperty(user + '@' + domain)) {
                    this.pie.sessions[user + '@' + domain] = {};
                }
                this.pie.sessions[user + '@' + domain][this.id] = this;
            } else {
            }
        });

    };

}).call(Session.prototype);

module.exports = Session;
