var express = require('express');
var url = require('url');
var querystring = require('querystring');

function PieHTTP(pie) {
    this.pie = pie;
    
    this.exp = express();
    var pie = this;


    this.exp.use(function (req, res, next) {
        if (req.url.slice(0, pie.config.http.user_root.length) == pie.config.http.user_root) {
            var params = url.parse(req.url);
            var channel = params.pathname.slice(pie.config.http.user_root.length).split('/');
            var user = channel[0];
            channel = channel.slice(1);
            var query = querystring.parse(params.query);
            req.pie = {
                user: user,
                channel: channel,
                query: query
            };
        }
        next();
    });

    this.exp.use(function (req, res, next) {
        if (req.hasOwnProperty(pie) ) {
        }
    });

    this.exp.get(this.pie.config.http.well_known);

    this.exp.listen(this.pie.config.http.port, this.pie.config.http.host);
}

module.exports = PieHTTP;
