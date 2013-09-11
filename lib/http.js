var express = require('express');
var url = require('url');
var querystring = require('querystring');
var errors = require('./error');
var bucker = require('bucker');
var log = bucker.createLogger({app: 'server.log', console: true}, 'http');


function PieHTTP(pie) {
    this.pie = pie;
    
    this.exp = express();
    var pie = this.pie;
    this.exp.use(express.cookieParser());
    this.exp.use(express.session({secret: 'bilbofrodobaggins4lyfe'}));

    this.exp.use(function (req, res, next) {
        var token;
        if (typeof req.session.user === 'undefined') {
            if (req.headers.authorization) {
                token = req.headers.authorization.substr(7);
                this.pie.db.auth(req.host).validateToken(token, function (err, user, domain) {
                    if (err) {
                        res.send(401, "Unauthorized");
                    } else {
                        if (req.host === domain) {
                            req.session.user = user;
                            req.session.domain = domain;
                            next();
                        } else {
                            log.warning("Host of request did not match token domain.");
                            res.send(401, "Unauthorized.")
                        }
                    }
                });
            } else {
                res.send(401, "Unauthorized");
            }
        }
    }.bind(this));

    this.exp.use(function (req, res, next) {
        var params;
        var query;
        var body = [];
        if (req.url === pie.config.http.user_root) {
            params = url.parse(req.url);
            query = rquerystring.parse(params.query);
            req.on('data', function (data) {
                body.push(data);
            });
            req.on('end', function () {
                var data = Buffer.concat(body);
                var jdata = JSON.parse(data);
                if (query.hasOwnProperty('getToken')) {
                    pie.db.auth(req.host).getToken(jdata.user, jdata.password, function (err, token) {
                        if (err || !token) {
                            res.send(401, "Invalid credentials");
                        } else {
                            res.set('Content-Type', 'application/json');
                            res.send(200, {user: jdata.user, token: token});
                        }
                    });
               } else {
                    res.send(404);
                }
            });
        } else {
            next();
        }
    });

    this.exp.use(function (req, res, next) {
        if (req.url.slice(0, pie.config.http.user_root.length) == pie.config.http.user_root) {
            var params = url.parse(req.url);
            var channel = params.pathname.slice(pie.config.http.user_root.length).split('/');
            var user = channel[0];
            channel = '/' + channel.slice(1).join('/');
            var query = querystring.parse(params.query);
            var domain;
            var out;
            if (user.search('@') === -1) {
                domain = req.host;
            } else {
                out = user.split('@');
                user = out[0];
                domain = out[1];
            }
            req.pie = {
                user: user,
                domain: domain,
                channel: channel,
                query: query,
                who: req.session.user + '@' + req.session.domain,
            };
        }

        if (typeof req.pie !== 'undefined') {
           var body = [];
           var methodf = '';
            req.on('data', function(data) {
                body.push(data);
            });


           req.on('end', function () {
               body = Buffer.concat(body);
               log.debug("Body length: " + body.length);
               if (req.headers['content-type'] === 'application/json') {
                   body = JSON.parse(body);
               }
               var rtype = req.pie.query.type || 'channel';
               var opts = {
                   query: req.pie.query,
                   req: req,
                   contenttype: req.headers['content-type'],
                   id: req.pie.query.id || req.pie.query.name,
                   data: body,
                   channel: req.pie.channel,
                   user: 'root',
                   domain: req.pie.domain,
               };
               if (req.method === 'POST') {
                   methodf += 'add';
               } else if (req.method === 'PUT') {
                   methodf += 'update';
               } else if (req.method === 'GET') {
                   if (req.pie.query.id || req.pie.query.name) {
                       methodf += 'get';
                   } else {
                       methodf += 'list';
                   }
               } else if (req.method === 'DELETE') {
                   methodf += 'delete';
               } else {
                   throw new Error('Unsupported Method');
               }
               methodf += rtype.substr(0,1).toUpperCase() + rtype.substr(1)
               log.debug("Method: " + methodf);
               
               try {
                   pie.db.channel(req.pie.user, domain)[methodf](opts, function (err, reply, code, ctype) {
                       if (ctype) {
                           res.set('Content-Type', ctype);
                       }
                       code = code || 200;
                       res.send(code, reply);
                   });
               } catch (e) {
                   if (e.httpcode) {
                       res.send(e.httpcode, e.description);
                   } else {
                       res.send(500, e.description)
                   }
               }
           });
        }
    }.bind(this));

    this.exp.get(this.pie.config.http.well_known);

    this.exp.listen(this.pie.config.http.port, this.pie.config.http.host);
}

module.exports = PieHTTP;
