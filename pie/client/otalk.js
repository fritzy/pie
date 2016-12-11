function oTalk(conn_uri, user_uri, session) {
    this.conn = {
        websocket: conn_uri,
        user: user_uri,
        session: session
    };

    this.qid = 0;

    this.ws = new WebSocket(this.conn.websocket);

    this.ws.onmessage = function (msg) {
        var jmsg = JSON.parse(msg);
        if (jmsg.hasOwnProperty('query') && jmsg.query.hasOwnProperty('id') && this.queryies.hasOwnProperty(jmsg.query.id)) {
            this.queries[jmsg.query.id].call(this, cb);
            delete this.queries[jmsg.query.id];
        }
    }.bind(this);

    this.queries = {};


}

(function () {

    this.query = function (stanza, cb) {
        this.queries
    };

    this.connect = function () {
    };

    this.disconnect = function () {
    };

    this.setPresence = function () {
    };

    this.getRoster = function () {
    };

    this.createChannel = function () {
    };

    this.subscribe = function () {
    };

    this.sendMsg = function () {
    };

}).call(oTalk.prototype);
