var deputy = require('deputydb');
var models = require('./models');

function Relationship(pie, user, domain) {
    this.pie = pie;
    this.db = new deputy.Bucket(user + '_' + domain, {location: this.pie.config.db.root + '/relationship/' + user + '_' + domain});
    this.user = user;
    this.domain = domain;
}

(function () {

    this.add = function (who, data, cb) {
        var rel = new models.Relationship(data);
        if (rel.validate().length === 0 && rel.status === 'approved') {
            this.db.put(rel.who, rel.toObject(), cb);
        } else {
            cb("Invalid Relationship Model");
        }
    };

    this.get = function (who, cb) {
        this.db.get(who, cb);
    };


}).call(Relationship.prototype);

module.exports = Relationship;
