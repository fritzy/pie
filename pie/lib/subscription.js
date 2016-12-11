var deputy = require('deputydb');
var uuid = require('node-uuid');
var async = require('async');
var bucker = require('bucker');
var log = bucker.createLogger({app: 'server.log', console: true}, 'sub');

function Subscription(pie) {
    this.pie = pie;
    this.db = new deputy.Bucket('subscriptions', {location: this.pie.config.db.root});
}

(function () {


    this.handleHTTP = function (opts, cb) {
        log.debug('handleHTTP');
        if (opts.query.rpc === 'requestSubscription') {
            this.request(opts, cb);
        } else {
            cb("RPC Undefined");
        }
    };

    this.request = function (opts, cb) {
        var chandb = this.pie.db.channel(opts.user, opts.domain).db;
        async.waterfall([
            function (acb) {
                chandb.read(opts.channel, 'config', 'config', acb);
            }.bind(this),
            function (config, acb) {
                chandb.read(opts.channel, 'subscriptions', opts.who, function (err, subs) {
                    if (err || !subs) {
                        subs = [];
                    }
                    acb(false, config, subs);
                });
            }.bind(this),
            function (config, subs, acb) {
                var key = 'sub:' + uuid();
                var subscription = {
                    type: opts.data.type,
                    from: opts.who,
                    from_channel: opts.data.channel,
                    to_user: opts.user,
                    to_channel: opts.channel,
                    status: 'pending',
                    secret: opts.data.secret,
                };
                this.db.put(key, subscription, function (err) {
                    acb(err, key);
                });
            }.bind(this),
            function (key, acb) {
                console.log(4);
                this.pie.db.channel(opts.user, opts.domain).db.write(opts.channel, 'subscriptions', opts.who, {key: key, status: 'active'}, function (err) {
                    acb(err, {id: key, user: opts.who, status: 'active'});
                });
            }.bind(this),
        ], function (err, response) {
            console.log(err, response);
            cb(err, response);
        });
    };

    this.deny = function (opts, cb) {
    };

    this.list = function (opts, cb) {
    };

    this.subscriptionExists

}).call(Subscription.prototype);

module.exports = Subscription;
