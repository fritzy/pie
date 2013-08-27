var deputy = require('deputydb');
var DBProxy = require('./db');
var PieHTTP = require('./http');

function PIE(config) {
    this.config = config;
    this.db = new DBProxy(this);
    this.http = new PieHTTP(this);
}

(function() {

}).call(PIE.prototype);

module.exports = PIE;
