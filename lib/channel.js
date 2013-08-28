var deputy = require('deputydb');
var async = require('async');
var models = require('./models');

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
        if (this.can(who, path, 'addItem')) {

        } else {
            cb("Permission Denied");
        }
    };
    
    this.delItem = function (who, path, query, cb) {
        if (this.can(who, path, 'delItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.listItem = function (who, path, query, cb) {
        if (this.can(who, path, 'listItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.getItem = function (who, path, query, cb) {
        if (this.can(who, path, 'getItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.updateItem = function (who, path, query, cb) {
        if (this.can(who, path, 'updateItem')) {

        } else {
            cb("Permission Denied");
        }
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
                this.canFail(who, path, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.makeDir(path, acb);
            }.bind(this),
            function (acb) {
                this.db.write(path + '/config', 'config', config.toObject(), acb);
            }.bind(this),
        ], function (err, result) {
            cb(err, config.toObject());
        });
    };
    
    this.delChannel = function (who, path, cb) {
        if (this.can(who, path, 'delItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.listChannel = function (who, path, cb) {
        async.waterfall([
            function (acb) {
                this.userExists(acb);
            }.bind(this),
            function (acb) {
                this.canFail(who, path, 'addChannel', acb);
            }.bind(this),
            function (acb) {
                this.db.subDirs(path, acb);
            }.bind(this),
        ], function (err, result) {
            cb(err, result);
        });
    };

    this.getChannel = function (who, path, cb) {
        if (this.can(who, path, 'getItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.updateChannel = function (who, path, cb) {
        if (this.can(who, path, 'updateItem')) {

        } else {
            cb("Permission Denied");
        }
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
        if (this.can(who, path, 'addItem')) {

        } else {
            cb("Permission Denied");
        }
    };
    
    this.delSubscription = function (who, path, query, cb) {
        if (this.can(who, path, 'delItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.listSubscription = function (who, path, query, cb) {
        if (this.can(who, path, 'listItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.getSubscription = function (who, path, query, cb) {
        if (this.can(who, path, 'getItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.updateSubscription = function (who, path, query, sub, cb) {
        if (this.can(who, path, 'updateItem')) {

        } else {
            cb("Permission Denied");
        }
    };
    
    this.addACL = function (who, path, item, cb) {
        if (this.can(who, path, 'addItem')) {

        } else {
            cb("Permission Denied");
        }
    };
    
    this.delACL = function (who, path, query, cb) {
        if (this.can(who, path, 'delItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.listACL = function (who, path, query, cb) {
        if (this.can(who, path, 'listItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.getACL = function (who, path, query, cb) {
        if (this.can(who, path, 'getItem')) {

        } else {
            cb("Permission Denied");
        }
    };

    this.updateACL = function (who, path, query, cb) {
        if (this.can(who, path, 'updateItem')) {

        } else {
            cb("Permission Denied");
        }
    };

}).apply(Channel.prototype);

module.exports = Channel;
