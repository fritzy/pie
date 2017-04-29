function UserRequests(pie, user, domain) {
    this.pie = pie;
    this.db = new deputy.Bucket(user + '_' + domain, {location: this.pie.config.db.root + '/request/' + user + '_' + domain});
    this.user = user;
    this.domain = domain;
}

(function () {
    this.add = function (who, id, request, cb) {
        this.db.get('order', (err, result) => {
            if(err) {
                result = [];
            }
            result.push(id);
            this.db.put(id, request, err => {
                this.db.put('order', result, cb);
            });
        });
    };

    this.list = function (who, offset, limit) {
        this.db.get('order', (err, result) => {
            if(err) {
                result = [];
            }
            offset = offset || 0;
            limit = limit || 50;
            var total = result.length;
            result.reverse();
            result = result.slice(offset, offset + limit);
            this.db.getKeys(result, (err, requests) => {
                cb(err, {
                    requests,
                    total,
                    count: requests.length,
                    limit,
                    offset
                });
            });
        });
    };

    this.remove = function (who, id, cb) {
        if (who !== this.user + '@' + this.domain) {
            cb("Unauthorized");
            return;
        }
        this.db.update('order', (order, done) => {
            if (order.indexOf(id) !== -1) {
                order.splice(order.indexOf(id), 1);
            }
            done(order);
        }, err => {
            cb(err);
        });
    };

    this.approve = function (who, id, cb) {
        if (who !== this.user + '@' + this.domain) {
            cb("Unauthorized");
            return;
        }
        this.db.update(id, (request, done) => {
            request.status = 'approved';
            done(request);
        }, cb);
    };

    this.deny = function (who, id, cb) {
        if (who !== this.user + '@' + this.domain) {
            cb("Unauthorized");
            return;
        }
        this.db.update(id, (request, done) => {
            request.status = 'denied';
            done(request);
        }, cb);
    };

}).call(UserRequests.prototype);

module.exports = UserRequests;
