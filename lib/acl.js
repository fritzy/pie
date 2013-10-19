function ACL(initial) {
    this.item = {
        create: false,
        read: false,
        update: false,
        delete: false
    };
    this.channel = {
        create: false,
        read: false,
        update: false,
        delete: false
    };
    this.other = {
        grant: false,
        approve: false
    };
    this.parse(initial);

}

(function () {

    this.parse = function (input) {
        input = input || '';
        var parts = input.split('|');
        if (parts.length !== 3) {
            return;
        }
        if (parts[0].indexOf('c') !== -1) {
            this.item.create = true;
        }
        if (parts[0].indexOf('r') !== -1) {
            this.item.read = true;
        }
        if (parts[0].indexOf('u') !== -1) {
            this.item.update = true;
        }
        if (parts[0].indexOf('d') !== -1) {
            this.item.delete = true;
        }
        if (parts[1].indexOf('c') !== -1) {
            this.channel.create = true;
        }
        if (parts[1].indexOf('r') !== -1) {
            this.channel.read = true;
        }
        if (parts[1].indexOf('u') !== -1) {
            this.channel.update = true;
        }
        if (parts[1].indexOf('d') !== -1) {
            this.channel.delete = true;
        }
        if (parts[2].indexOf('g') !== -1) {
            this.other.grant = true;
        }
        if (parts[2].indexOf('a') !== -1) {
            this.other.approve = true;
        }
    };

    this.toString = function () {
        var out = '';
        if (this.item.create) out += 'c';
        if (this.item.read) out += 'r';
        if (this.item.update) out += 'u';
        if (this.item.delete) out += 'd';
        out += '|';
        if (this.channel.create) out += 'c';
        if (this.channel.read) out += 'r';
        if (this.channel.update) out += 'u';
        if (this.channel.delete) out += 'd';
        out += '|';
        if (this.other.grant) out += 'g';
        if (this.other.approve) out += 'a';
        return out;
    };

    this.setOwner = function () {
        this.item = {
            create: true,
            read: true,
            update: true,
            delete: true
        };
        this.channel = {
            create: true,
            read: true,
            update: true,
            delete: true
        };
        this.other = {
            grant: true,
            approve: true
        };
    };

}).call(ACL.prototype);

module.exports = ACL;
