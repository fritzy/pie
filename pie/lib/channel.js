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
        this.pie.db.auth(this.domain).exists(this.user, function (err, exists) { cb(!exists) });
    };

    this.can = function (who, path, action) {
        return true;
    };
    this.canFail = function (who, path, action, cb) {
        cb(false);
    };

    this.addItem = function (opts, cb) {
        var key = 'item:' + uuid();
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'addItem', acb);
            }.bind(this),
            function (acb) {
                var item = {
                    by: opts.who,
                    ns: opts.query.ns,
                    when: Date.now(),
                    payload: opts.data,
                    id: key,
                };
                this.db.write(opts.channel, 'item', key, item, acb);
            }.bind(this),
        ], function (err, result) {
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
        }.bind(this));
    };
    
    this.delItem = function (opts, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'deleteItem', acb);
            }.bind(this),
            function (acb) {
                this.db.del(opts.channel, 'item', opts.id, acb);
            }.bind(this),
        ], function (err, result) {
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
        }.bind(this));
    };

    this.listItem = function (opts, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'listItem', acb);
            }.bind(this),
            function (acb) {
                this.db.getDir(opts.channel, acb);
            }.bind(this),
        ], function (err, dir) {
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
                items: items,
                offset: offset,
                limit: limit,
                count: count,
                total: total,
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
        }.bind(this));
    };

    this.getItem = function (opts, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'getItem', acb);
            }.bind(this),
            function (acb) {
                this.db.read(opts.channel, 'item', opts.id, acb);
            }.bind(this),
        ], function (err, result) {
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
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.write(opts.channel, 'file', fkey, opts.data, 'binary', acb);
            }.bind(this),
            function (key, acb) {
                var item = {
                    by: opts.who,
                    id: ikey,
                    type: 'http://andyet.com/pie/fileitem',
                    key: fkey,
                    size: opts.data.length,
                    'content-type': opts.contenttype,
                };
                this.db.write(opts.channel, 'item',  ikey, item, function (err, key) {
                    acb(err, item);
                });
            }.bind(this),
        ], function (err, result) {
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
        }.bind(this));
    };
    
    this.getFile = function (opts, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'readFile', acb);
            }.bind(this),
            function (acb) {
                this.db.read(opts.channel, 'item', opts.id, acb);
            }.bind(this),
            function (item, acb) {
                this.db.read(opts.channel, 'file', item.key, 'binary', function (err, data) {
                    acb(err, item, data);
                });
            }.bind(this),
        ], function (err, item, data) {
            cb(err, data, 200, item['content-type']);
        });
    };

    this.getConfig = function (opts, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.read(opts.channel, 'config', 'config', acb);
            }.bind(this),
        ], function (err, result) {
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
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                //TODO: grab parent
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.makeDir(opts.channel, acb);
            }.bind(this),
            function (dirkey, acb) {
                this.db.write(opts.channel, 'config', 'config', config.toObject(), acb);
            }.bind(this),
        ], function (err, result) {
            cb(err, config.toObject());
            if (!err) {
                this.pie.emitter.emit('addChannel', {
                    user: opts.user,
                    domain: opts.domain,
                    channel: opts.channel,
                    who: opts.who,
                });
            }
        }.bind(this));
    };
    
    this.delChannel = function (who, path, cb) {
        if (this.can(who, path, 'delItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.listChannel = function (opts, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.getDir(opts.channel, acb);
            }.bind(this),
        ], function (err, dir) {
            if (err) {
                cb(err);
            } else {
                var offset = opts.query.offset || 0;
                var limit = opts.query.limit || 50;
                var chans = Object.keys(dir.subdirs);
                var total = chans.length;
                var chans = chans.sort().map(function (chan, idx, chans) {
                    if (opts.channel.substr(-1) === '/') {
                        return opts.channel + chan;
                    } else {
                        return opts.channel + '/' + chan;
                    }
                }).slice(offset, limit+offset);
                var count = chans.length;
                var result = {
                    channels: chans,
                    offset: offset,
                    limit: limit,
                    count: count,
                    total: total,
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
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.read(opts.channel, 'item', opts.query.id, acb);
            }.bind(this),
            function (item, acb) {
                this.db.del(opts.channel, 'file', item.key, acb);
            }.bind(this),
            function (item, acb) {
                this.db.del(opts.channel, 'item', opts.query.id, acb);
            }.bind(this),
        ], function (err, result) {
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
        }.bind(this));
    };

    this.listFile = function (who, path, query, cb) {
        cb("You can't list files.");
    };

    this.addSubscription = function (opts, cb) {
        var key = 'sub:' + uuid();
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'addItem', acb);
            }.bind(this),
            function (acb) {
                this.db.write(opts.channel, 'subscription', key, opts.data, acb);
            }.bind(this),
        ], function (err, result) {
            item.id = key;
            console.log(err);
            cb(err, result);
        });
    };
    
    this.addACL = function (opts, cb) {
        var key = 'acl:' + uuid();
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'addItem', acb);
            }.bind(this),
            function (acb) {
                this.db.write(opts.channel, 'acl', key, opts.data, acb);
            }.bind(this),
        ], function (err, result) {
            result.id = key;
            console.log(err);
            cb(err, result);
        });
    };
    
    this.delACL = function (opts, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'deleteItem', acb);
            }.bind(this),
            function (acb) {
                this.db.del(opts.channel, 'acl', opts.id, acb);
            }.bind(this),
        ], function (err, result) {
            cb(err, result);
        });
    };

    this.listACL = function (opts, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(opts.user, opts.channel, 'listItem', acb);
            }.bind(this),
            function (acb) {
                this.db.getDir(opts.channel, acb);
            }.bind(this),
        ], function (err, dir) {
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
                acls: acls,
                offset: offset,
                limit: limit,
                count: count,
                total: total,
            };
            cb(err, result);
        });
    };

    this.getACL = function (who, path, query, cb) {
    };

    this.updateACL = function (who, path, query, cb) {
    };

}).apply(Channel.prototype);

module.exports = Channel;
