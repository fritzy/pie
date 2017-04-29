var uuid = require('node-uuid');
var async = require('async');
var ACL = require('./acl');

function RPC(pie) {
    this.pie = pie;
}

(function () {

    this.handleRequest = (type, opts) => ({
        who: opts.who,
        destination: opts.user + '@' + opts.domain + opts.channel,
        status: 'pending',
        requestType: type,
        msg: opts.data.msg,
        id: opts.data.id
    });

    this.requestRelationship = function (opts, cb) {
        var r = this.handleRequest('relationship', opts);
        r.content = opts.data.content;
        r.subject = opts.data.subject;
        r.id = 'req:rel:' + uuid();
        this.pie.db.relationship(opts.user, opts.domain).get(opts.who, (err, rel) => {
            if (err || !rel) {
                this.pie.db.request(opts.user, opts.domain).add(r.who, r.id, r, cb);
            } else {
                cb("Relationship already exists.", rel);
            }
        });
    };

    this.approveRelationship = function (opts, cb) {
        this.pie.db.request(opts.user, opts.domain).approve(r.who, opts.id, function (err, request) {
            request.access_tags = opts.data.access_tags;
            if (!err && request) {
                this.pie.db.relationship(opts.user, opts.domain).add(request.who, request, cb);
            } else {
                cb(err, request);
            }
        });
    };

    this.discover = function (opts, cb) {
        var pie = this.pie;
        var who = new Id().parse(opts.who);
        chan_results = [];

        this.pie.db.relationship(opts.user, opts.domain).get(opts.who, function (err, rship) {
            if (err || !rship) {
                cb("No valid relationship.");
            } else {
                this.pie.db.channel(opts.user, opts.domain).db.walk((dir, db, done) => {
                    async.waterfall([
                        acb => {
                            if (dir.children.hasOwnProperty('config') && Object.keys(dir.children.config).length > 0) {
                                db.get(dir.children.config[Object.keys(dir.children.config)[0]], acb);
                            } else {
                                acb("No config for directory: " + dir.path);
                            }
                        },
                        (config, acb) => {
                            pie.db.relationships(opts.user, opts.domain).get(opts.who, (err, relationship) => {
                                acb(err, config, relationship);
                            });
                        },
                        (config, rship, acb) => {
                            if (dir.hasOwnProperty('acl') && dir.acl.hasOwnProperty(opts.who)) {
                                db.get(dir.acl[opts.who], (err, acl) => {
                                    if (err || !acl) {
                                        acl = '';
                                    }
                                    acb(config, rship, acl);
                                });
                            } else {
                                acb(config, rship, '');
                            }
                        }
                    ], (err, config, rship, uacl) => {
                        var matchtags = [];
                        var acl = new ACL();
                        acl.parse(config.public_acl);
                        acl.parse(config.uacl);
                        if (config.hasOwnProperty('access_tags')) {
                            matchtags = config.access_tags.filter(n => rship.access_tags.indexOf(n) != -1);
                        }
                        if (config.owner === opts.who) {
                            acl.setOwner();
                        }
                        if (acl.channel.read || config.discoverable == true || matchtags.length > 0) {
                            chan_results.push({
                                path: dir.path,
                                name: config.name,
                                description: config.description,
                                acl: acl.toString()
                            });
                        }
                        
                    });
                }, err => {
                    cb(err, {channels: chan_results});
                });
            }
        });
    };

    this.denyRelationship = function (opts, cb) {
        this.pie.db.request(opts.user, opts.domain).deny(r.who, opts.id, cb);
    };

    this.requestAccess = (opts, cb) => {
    };

    this.approveAccess = (opts, cb) => {
    };

    this.denyAccess = (opts, cb) => {
    };

    this.setAccess = (opts, cb) => {
    };

    this.requestSubscription = (opts, cb) => {
    };

    this.approveSubscription = (opts, cb) => {
    };

    this.denySubscription = (opts, cb) => {
    };

    this.getRelationship = (opts, cb) => {
    };

    this.getAccess = (opts, cb) => {
    };

    this.updateAccess = (opts, cb) => {
    };

    this.getSubscriptions = (opts, cb) => {
    };

    this.responseEvent = (opts, cb) => {
    };

}).call(RPC.prototype);
