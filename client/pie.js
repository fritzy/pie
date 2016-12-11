function PIE(user, host, port, token) {
    this.user = user;
    this.host = host;
    this.token = token;
    this.ws = new WebSocket('ws://' + host + ':' + port);
    console.log("here we go...");
    this.ws.onopen = function () {
        this.tokenAuth();
    }.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.id = 0;
    this.callbacks = {};
}

(function () {

    this.handleMessage = function (event) {
        console.log("IN");
        var msg = JSON.parse(event.data);
        if (this.callbacks.hasOwnProperty(msg.id)) {
            this.callbacks[msg.id](false, msg);
            delete this.callbacks[msg.id];
        }
        console.log(msg);
    };

    this.getChannel = function (channel) {
        $.ajax({
            headers: {
                Authorization: "Bearer " + this.token,
            },
        });
    };
    
    this.tokenAuth = function () {
        console.log("sending auth...");
        this.sendRequest({
            rpc: 'tokenAuth',
            token: this.token,
        }, function (err, response) {
            console.log("got response!");
            if (response.authed) {
                console.log("we are authed as: " + response.user);
            } else {
                console.log("not authed. :(");
            }
        });
    };

    this.sendRequest = function (msg, cb) {
        this.id++;
        msg.id = this.id;
        msg = JSON.stringify(msg);
        this.ws.send(msg);
        if (typeof cb === 'function') {
            this.callbacks[this.id] = cb;
        }
    };

}).call(PIE.prototype);

console.log("ok?");
