var deputy = require('deputydb');
var error = require('./error');
var Channel = require('./channel');

function DBProxy(pie) {
    this.pie = pie;
    this.auth_domain = {};
    this.user_channel = {};
}

(function () {

    this.auth = function (domain) {
        if (!this.auth_domain.hasOwnProperty(domain)) {
            if (!this.pie.config.domains.hasOwnProperty(domain)) {
                throw new error.NoLocalDomain(domain);
            } else {
                this.auth_domain[domain] = new DomainAuth(this.pie, domain);
            }
        }
        return this.auth_domain[domain];
    };

    this.channel = function (user, domain) {
        if (!this.user_channel.hasOwnProperty(domain)) {
            if (!this.pie.config.domains.hasOwnProperty(domain)) {
                throw new error.NoLocalDomain(domain);
            } else {
                this.user_channel[domain] = {};
                this.user_channel[domain][user] = new Channel(this.pie, user, domain);
            }
        }
        return this.auth_domain[domain];
    };
    
}).call(DBProxy.prototype);


function DomainAuth(pie, domain) {
    this.pie = pie;
    this.domain = domain;
    this.db = new deputy.Bucket(domain, {location: this.pie.config.db.root + '/auth/' + domain});
}

(function () {

    this.create = function (user, password, cb) {
        this.db.put(user + '_' + this.domain, password, cb);
        this.pie.db.channelDB(user, this.domain);
    };

    this.updatePassword = function (user, domain, password) {
    };

    this.verifyPassword = function (user, password, cb) {
        this.db.get(user + '_' + this.domain, function (err, pass) {
            cb(err, (pass == password));
        });
    };

}).call(DomainAuth.prototype);

module.exports = DBProxy;
