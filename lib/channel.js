var deputy = require('deputydb');
var async = require('async');
var models = require('./models');
var uuid = require('node-uuid');

function Channel(pie, user, domain) {
    this.pie = pie;
    this.db = new deputy.Directory(user + '_' + domain, {location: this.pie.config.db.root + '/channel/' + user + '_' + domain});
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
    }

    this.addItem = function (who, path, item, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(who,path, 'addItem', acb);
            }.bind(this),
            function (acb) {
                this.db.write(path, 'item', 'item:' + uuid(), item, acb);
            }.bind(this),
        ], function (err, result) {
            console.log(err, result);
            cb(err, result);
        });
    };
    
    this.delItem = function (who, path, id, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(who, path, 'deleteItem', acb);
            }.bind(this),
            function (acb) {
                this.db.del(path, 'item', id, acb);
            }.bind(this),
        ], function (err, result) {
            cb(err, result);
        });
    };

    this.listItem = function (who, path, query, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(who, path, 'listItem', acb);
            }.bind(this),
            function (acb) {
                this.db.getDir(path, acb);
            }.bind(this),
        ], function (err, dir) {
            var offset = query.offset || 0;
            var limit = query.limit || 50;
            var items = [];
            console.log(dir);
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
            cb(err, result);
        });
    };

    this.getItem = function (who, path, id, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(who, path, 'getItem', acb);
            }.bind(this),
            function (acb) {
                this.db.read(path, 'item', id, acb);
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

    this.streamInFile = function (who, path, stream, cb) {
    };
    
    this.streamOutFile = function (who, path, stream, cb) {
    };

    this.getConfig = function (who, path, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(who,path, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.read(path, 'config', 'config', acb);
            }.bind(this),
        ], function (err, result) {
            console.log(err, result);
            cb(err, result);
        });
    };

    this.addChannel = function (who, path, config, cb) {
        config = models.ChannelConfig.create(config);
        var errors = config.doValidate();
        if (errors.length > 0) {
            cb("Validation errors:\n" + errors.join('\n'));
        }
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(who,path, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.makeDir(path, acb);
            }.bind(this),
            function (dirkey, acb) {
                this.db.write(path, 'config', 'config', config.toObject(), acb);
                //acb(false, "hi");
            }.bind(this),
        ], function (err, result) {
            console.log(err, result);
            cb(err, config.toObject());
        });
    };
    
    this.delChannel = function (who, path, cb) {
        if (this.can(who, path, 'delItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.listChannel = function (who, path, query, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(who, path, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.getDir(path, acb);
            }.bind(this),
        ], function (err, dir) {
            if (err) {
                cb(err);
            } else {
                var offset = query.offset || 0;
                var limit = query.limit || 50;
                var chans = Object.keys(dir.subdirs);
                var total = chans.length;
                var chans = chans.sort().map(function (chan, idx, chans) {
                    if (path.substr(-1) === '/') {
                        return path + chan;
                    } else {
                        return path + '/' + chan;
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

    this.getChannel = function (who, path, cb) {
    };

    this.updateChannel = function (who, path, cb) {
    };

    this.addFile = function (who, path, filestream, cb) {
    };

    this.delFile = function (who, path, query, cb) {
    };

    this.getFile = function (who, path, query, cb) {
    };

    this.listFile = function (who, path, query, cb) {
    };

    this.addSubscription = function (who, path, sub, cb) {
    };
    
    this.delSubscription = function (who, path, query, cb) {
    };

    this.listSubscription = function (who, path, query, cb) {
    };

    this.getSubscription = function (who, path, query, cb) {
    };

    this.updateSubscription = function (who, path, query, sub, cb) {
    };
    
    this.addACL = function (who, path, item, cb) {
    };
    
    this.delACL = function (who, path, query, cb) {
    };

    this.listACL = function (who, path, query, cb) {
    };

    this.getACL = function (who, path, query, cb) {
    };

    this.updateACL = function (who, path, query, cb) {
    };

}).apply(Channel.prototype);

module.exports = Channel;
