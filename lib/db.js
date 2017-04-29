var deputy = require('deputydb');
var error = require('./error');
var Channel = require('./channel');
var uuid = require('node-uuid');
var bucker = require('bucker');
var log = bucker.createLogger({app: 'server.log', console: true}, 'db');
var UserRequest = require('./request');
var Relationship = require('./relationship');

function DBProxy(pie) {
    this.pie = pie;
    this.auth_domain = {};
    this.user_channel = {};
    this.user_request = {};
    this.user_relationship = {};
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
        return this.user_channel[domain][user];
    };

    this.request = function (user, domain) {
        if (!this.user_request.hasOwnProperty(domain)) {
            if (!this.pie.config.domains.hasOwnProperty(domain)) {
                throw new error.NoLocalDomain(domain);
            } else {
                this.user_request[domain] = {};
                this.user_request[domain][user] = new UserRequest(this.pie, user, domain);
            }
        }
        return this.user_request[domain][user];
    };
    
    this.relationship = function (user, domain) {
        if (!this.user_relationship.hasOwnProperty(domain)) {
            if (!this.pie.config.domains.hasOwnProperty(domain)) {
                throw new error.NoLocalDomain(domain);
            } else {
                this.user_relationship[domain] = {};
                this.user_relationship[domain][user] = new Relationship(this.pie, user, domain);
            }
        }
        return this.user_relationship[domain][user];
    };

    
}).call(DBProxy.prototype);


function DomainAuth(pie, domain) {
    this.pie = pie;
    this.domain = domain;
    this.db = new deputy.Bucket(domain, {location: this.pie.config.db.root + '/auth/' + domain});
}

(function () {

    this.exists = function (user, cb) {
        this.db.get(user + '_' + this.domain, (err, result) => {
            if (err) {
                cb(false, false);
            } else {
                cb(false, true);
            }
        });
    };

    this.create = function (user, password, cb) {
        this.db.put(user + '_' + this.domain, password, cb);
        //this.pie.db.channelDB(user, this.domain);
    };

    this.getToken = function (user, password, cb, skippass) {
        var authdomain = this.domain;
        this.verifyPassword(user, password, (err, passed) => {
            if (passed || skippass) {
                this.db.atomic(function (done) {
                    this.get('tokens::' + '_' + authdomain, (err, tokens) => {
                        if (!tokens) {
                            tokens = {};
                        }
                        var token = 'auth:' + uuid();
                        tokens[token] = user + '@' + authdomain;
                        console.log(tokens);
                        this.put('tokens::' + '_' + authdomain, tokens, err => {
                            done();
                            cb(false, token);
                        });
                    });
                });
            } else {
                cb("Not Authorized");
            }
        });
    };

    this.validateToken = function (token, cb) {
        this.db.get('tokens::_' + this.domain, (err, tokens) => {
            var user;
            if (err || !tokens) {
                cb("Not authorized.");
            } else {
                if (tokens.hasOwnProperty(token)) {
                    user = tokens[token].split('@');
                    cb(false, user[0], user[1]);
                } else {
                    cb("Not authorized.");
                }
            }
        });
    };

    this.updatePassword = (user, domain, password) => {
    };

    this.verifyPassword = function (user, password, cb) {
        log.debug(user, this.domain, password);
        this.db.get(user + '_' + this.domain, (err, pass) => {
            cb(err, (pass == password));
        });
    };

}).call(DomainAuth.prototype);

module.exports = DBProxy;
