var deputy = require('deputydb');
var async = require('async');
var models = require('./models');
var uuid = require('node-uuid');
var levelstore = require('level-store');
var bucker = require('bucker');
var log = bucker.createLogger({app: 'server.log', console: true}, 'db');

function Channel(pie, user, domain) {
    this.pie = pie;
    this.db = new deputy.Directory(user + '_' + domain, {location: this.pie.config.db.root + '/channel/' + user + '_' + domain});
    this.store = levelstore(this.db.lup);
    this.user = user;
    this.domain = domain;
}

(function () {
    
    this.userExists = function (cb) {
        this.pie.db.auth(this.domain).exists(this.user, (err, exists) => { cb(!exists) });
    };

    this.can = (who, path, action) => true;
    this.canFail = (who, path, action, cb) => {
        cb(false);
    };

    this.addItem = function (opts, cb) {
        var key = 'item:' + uuid();
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'addItem', acb);
            },
            acb => {
                var item = {
                    by: opts.who,
                    ns: opts.query.ns,
                    when: Date.now(),
                    payload: opts.data,
                    id: key,
                };
                this.db.write(opts.channel, 'item', key, item, acb);
            },
        ], (err, result) => {
            console.log(err);
            cb(err, result);
            if (!err) {
                this.pie.emitter.emit('addItem', {
                    user: opts.user,
                    domain: opts.domain,
                    channel: opts.channel,
                    item: opts.data,
                    id: key,
                    who: opts.who,
                });
            }
        });
    };
    
    this.delItem = function (opts, cb) {
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'deleteItem', acb);
            },
            acb => {
                this.db.del(opts.channel, 'item', opts.id, acb);
            },
        ], (err, result) => {
            cb(err, result);
            if (!err) {
                this.pie.emitter.emit('delItem', {
                    user: opts.user,
                    domain: opts.domain,
                    channel: opts.channel,
                    id: opts.id,
                    who: opts.who,
                });
            }
        });
    };

    this.listItem = function (opts, cb) {
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'listItem', acb);
            },
            acb => {
                this.db.getDir(opts.channel, acb);
            },
        ], (err, dir) => {
            var offset = opts.query.offset || 0;
            var limit = opts.query.limit || 50;
            var items = [];
            if(dir.children.hasOwnProperty('item')) {
                var items = Object.keys(dir.children['item']);
            }
            var total = items.length;
            items.slice(offset, limit);
            var count = items.length;
            var result = {
                items,
                offset,
                limit,
                count,
                total,
            };
            if (opts.query.hasOwnProperty('html')) {
                var out = "<html><body>";
                for (var iidx in result.items) {
                    out += '<a href="' + this.pie.config.http.user_root + opts.user + opts.channel +"?type=item&id=" + result.items[iidx] + '">' + result.items[iidx] + "</a><br />";
                }
                out += "</body></html>";
                cb(err, out);
            } else {
                cb(err, result);
            }
        });
    };

    this.getItem = function (opts, cb) {
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'getItem', acb);
            },
            acb => {
                this.db.read(opts.channel, 'item', opts.id, acb);
            },
        ], (err, result) => {
            cb(err, result);
        });
    };

    this.updateItem = function (who, path, query, cb) {
        if (this.can(who, path, 'updateItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.addFile = function (opts, cb) {
        var fkey = 'file:' + uuid();
        var ikey = 'item:' + uuid();
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            },
            acb => {
                this.db.write(opts.channel, 'file', fkey, opts.data, 'binary', acb);
            },
            (key, acb) => {
                var item = {
                    by: opts.who,
                    id: ikey,
                    type: 'http://andyet.com/pie/fileitem',
                    key: fkey,
                    size: opts.data.length,
                    'content-type': opts.contenttype,
                };
                this.db.write(opts.channel, 'item',  ikey, item, (err, key) => {
                    acb(err, item);
                });
            },
        ], (err, result) => {
            cb(err, result);
            if (!err) {
                this.pie.emitter.emit('addFile', {
                    user: opts.user,
                    domain: opts.domain,
                    channel: opts.channel,
                    item: result,
                    id: ikey,
                    who: opts.who,
                });
            }
        });
    };
    
    this.getFile = function (opts, cb) {
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'readFile', acb);
            },
            acb => {
                this.db.read(opts.channel, 'item', opts.id, acb);
            },
            (item, acb) => {
                this.db.read(opts.channel, 'file', item.key, 'binary', (err, data) => {
                    acb(err, item, data);
                });
            },
        ], (err, item, data) => {
            cb(err, data, 200, item['content-type']);
        });
    };

    this.getConfig = function (opts, cb) {
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            },
            acb => {
                this.db.read(opts.channel, 'config', 'config', acb);
            },
        ], (err, result) => {
            cb(err, result);
        });
    };

    this.addChannel = function (opts, cb) {
        var config = models.ChannelConfig.create(opts.data);
        var errors = config.doValidate();
        if (errors.length > 0) {
            cb("Validation errors:\n" + errors.join('\n'));
        }
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                //TODO: grab parent
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            },
            acb => {
                this.db.makeDir(opts.channel, acb);
            },
            (dirkey, acb) => {
                this.db.write(opts.channel, 'config', 'config', config.toObject(), acb);
            },
        ], (err, result) => {
            cb(err, config.toObject());
            if (!err) {
                this.pie.emitter.emit('addChannel', {
                    user: opts.user,
                    domain: opts.domain,
                    channel: opts.channel,
                    who: opts.who,
                });
            }
        });
    };
    
    this.delChannel = function (who, path, cb) {
        if (this.can(who, path, 'delItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.listChannel = function (opts, cb) {
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            },
            acb => {
                this.db.getDir(opts.channel, acb);
            },
        ], (err, dir) => {
            if (err) {
                cb(err);
            } else {
                var offset = opts.query.offset || 0;
                var limit = opts.query.limit || 50;
                var chans = Object.keys(dir.subdirs);
                var total = chans.length;
                var chans = chans.sort().map((chan, idx, chans) => {
                    if (opts.channel.substr(-1) === '/') {
                        return opts.channel + chan;
                    } else {
                        return opts.channel + '/' + chan;
                    }
                }).slice(offset, limit+offset);
                var count = chans.length;
                var result = {
                    channels: chans,
                    offset,
                    limit,
                    count,
                    total,
                };
                cb(err, result);
            }
        });
    };

    this.getChannel = function (opts, cb) {
        this.getConfig(opts, cb);
    };

    this.updateChannel = function (opts, cb) {
        this.updateConfig(opts, cb);
    };
    
    this.deleteFile = function (opts, cb) {
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            },
            acb => {
                this.db.read(opts.channel, 'item', opts.query.id, acb);
            },
            (item, acb) => {
                this.db.del(opts.channel, 'file', item.key, acb);
            },
            (item, acb) => {
                this.db.del(opts.channel, 'item', opts.query.id, acb);
            },
        ], (err, result) => {
            cb(err, result);
            if (!err) {
                this.pie.emitter.emit('deleteFile', {
                    user: opts.user,
                    domain: opts.domain,
                    channel: opts.channel,
                    id: opts.id,
                    who: opts.who,
                });
            }
        });
    };

    this.listFile = (who, path, query, cb) => {
        cb("You can't list files.");
    };

    this.addSubscription = function (opts, cb) {
        var key = 'sub:' + uuid();
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'addItem', acb);
            },
            acb => {
                this.db.write(opts.channel, 'subscription', key, opts.data, acb);
            },
        ], (err, result) => {
            item.id = key;
            console.log(err);
            cb(err, result);
        });
    };
    
    this.addACL = function (opts, cb) {
        var key = 'acl:' + uuid();
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'addItem', acb);
            },
            acb => {
                this.db.write(opts.channel, 'acl', key, opts.data, acb);
            },
        ], (err, result) => {
            result.id = key;
            console.log(err);
            cb(err, result);
        });
    };
    
    this.delACL = function (opts, cb) {
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'deleteItem', acb);
            },
            acb => {
                this.db.del(opts.channel, 'acl', opts.id, acb);
            },
        ], (err, result) => {
            cb(err, result);
        });
    };

    this.listACL = function (opts, cb) {
        async.waterfall([
            acb => {
                this.userExists(acb);
            },
            acb => {
                this.canFail(opts.user, opts.channel, 'listItem', acb);
            },
            acb => {
                this.db.getDir(opts.channel, acb);
            },
        ], (err, dir) => {
            var offset = opts.query.offset || 0;
            var limit = opts.query.limit || 50;
            var items = [];
            if(dir.children.hasOwnProperty('acl')) {
                var acls = Object.keys(dir.children['acl']);
            }
            var total = acls.length;
            acls.slice(offset, limit);
            var count = acls.length;
            var result = {
                acls,
                offset,
                limit,
                count,
                total,
            };
            cb(err, result);
        });
    };

    this.getACL = (who, path, query, cb) => {
    };

    this.updateACL = (who, path, query, cb) => {
    };

}).apply(Channel.prototype);

module.exports = Channel;
