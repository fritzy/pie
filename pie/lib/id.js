function Id(user, domain, channel) {
    this.user = user;
    this.domain = domain;
    this.channel = channel;
}

(function () {

    this.parse = function (inuser) {
        var s1 = inuser.split('@');
        var s2;
        this.user = s1[0];
        s2 = s1[1].split('/');
        this.domain = s2[0];
        this.channel = s2[1];
        return this;
    };

    this.toString = function () {
        var out = this.user + '@' + this.domain;
        if (typeof this.channel === 'string' && this.channel.substr(0, 1) === '/') {
            out += this.channel;
        }
        return out;
    };

    this.toFull = this.toString;

    this.toBare = function () {
        return this.user + '@' + this.domain;
    };

    this.compareBare = function (other) {
        return (this.domain === other.domain && this.user === other.user);
    };

}).call(Id.prototype);


module.exports = Id;
