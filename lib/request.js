function UserRequests(pie, user, domain) {
    this.pie = pie;
    this.db = new deputy.Bucket(user + '_' + domain, {location: this.pie.config.db.root + '/request/' + user + '_' + domain});
    this.user = user;
    this.domain = domain;
}

(function () {
    this.add = function (who, id, request, cb) {
        this.db.get('order', function (err, result) {
            if(err) {
                result = [];
            }
            result.push(id);
            this.db.put(id, request, function (err) {
                this.db.put('order', result, cb);
            }.bind(this));
        }.bind(this));
    };

    this.list = function (who, offset, limit) {
        this.db.get('order', function (err, result) {
            if(err) {
                result = [];
            }
            offset = offset || 0;
            limit = limit || 50;
            var total = result.length;
            result.reverse();
            result = result.slice(offset, offset + limit);
            this.db.getKeys(result, function (err, requests) {
                cb(err, {
                    requests: requests,
                    total: total,
                    count: requests.length,
                    limit: limit,
                    offset: offset
                });
            });
        }.bind(this));
    };

    this.remove = function (who, id, cb) {
        if (who !== this.user + '@' + this.domain) {
            cb("Unauthorized");
            return;
        }
        this.db.update('order', function (order, done) {
            if (order.indexOf(id) !== -1) {
                order.splice(order.indexOf(id), 1);
            }
            done(order);
        }, function (err) {
            cb(err);
        });
    };

    this.approve = function (who, id, cb) {
        if (who !== this.user + '@' + this.domain) {
            cb("Unauthorized");
            return;
        }
        this.db.update(id, function(request, done) {
            request.status = 'approved';
            done(request);
        }, cb);
    };

    this.deny = function (who, id, cb) {
        if (who !== this.user + '@' + this.domain) {
            cb("Unauthorized");
            return;
        }
        this.db.update(id, function(request, done) {
            request.status = 'denied';
            done(request);
        }, cb);
    };

}).call(UserRequests.prototype);

module.exports = UserRequests;
