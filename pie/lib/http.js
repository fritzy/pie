var express = require('express');
var url = require('url');
var querystring = require('querystring');
var errors = require('./error');
var util = require('util');
var bucker = require('bucker');
var log = bucker.createLogger({app: 'server.log', console: true}, 'http');
var WebSocketServer = require('ws').Server;
var path = require('path');
var http = require('http');
var Session = require('./session');



function PieHTTP(pie) {
    this.pie = pie;
    
    this.exp = express();
    var pie = this.pie;
    this.exp.use(express.cookieParser());
    this.exp.use(express.session({secret: 'bilbofrodobaggins4lyfe'}));
    

    this.exp.use('/client', express.static(path.dirname(process.mainModule.filename) + '/client'));

    this.exp.use('/pie', function (req, res, next) {
        log.debug(req.url);
        var params;
        var query;
        var body = [];
        params = url.parse(req.url);
        query = querystring.parse(params.query);
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
                req.on('data', function (data) {
                    body.push(data);
                });
                req.on('end', function () {
                    var jdata = {};
                    var data = Buffer.concat(body);
                    if (data.length) {
                        jdata = JSON.parse(data);
                    }
                    if (query.hasOwnProperty('getToken')) {
                        pie.db.auth(req.host).getToken(jdata.user, jdata.password, function (err, token) {
                            if (err || !token) {
                                res.send(401, "Invalid credentials");
                            } else {
                                res.set('Content-Type', 'application/json');
                                res.send(200, {user: jdata.user, token: token});
                            }
                        });
                    } else if (query.hasOwnProperty('simpleAuth')) {
                        pie.db.auth(req.host).verifyPassword(query.user, query.password, function (err, passed) {
                            if (err || !passed) {
                                res.send(401, "Invalid credentials");
                            } else {
                                req.session.user = query.user;
                                req.session.domain = req.host;
                                res.send(200, "Authorized.");
                            }
                        });
                   } else {
                        res.send(404);
                    }
                });
            }
        } else {
            next();
        }
    }.bind(this));


    this.exp.use('/pie', function (req, res, next) {
        var params = url.parse(req.url);
        var channel = params.pathname.slice(1).split('/');
        console.log(params);
        var user = channel[0];
        channel = '/' + channel.slice(1).join('/');
        console.log("user", user, channel);
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

        if (typeof req.pie !== 'undefined') {
           var body = [];
           var methodf = '';
            req.on('data', function(data) {
                body.push(data);
            });


           req.on('end', function () {
               body = Buffer.concat(body);
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
                   who: req.session.user + '@' + req.session.domain,
                   user: req.pie.user,
                   domain: req.pie.domain,
               };
               if (opts.query.hasOwnProperty('rpc')) {
                   log.debug('opts rpc type ' + typeof opts.query.rpc);
                   if (opts.query.rpc.indexOf('Subscription') != -1) {
                       console.log(this.pie);
                       this.pie.subscription.handleHTTP(opts, function (err, result) {
                           res.send(200, result);
                       });
                   }
               } else {
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
                           throw e;
                       }
                   }
               }
           }.bind(this));
        }
    }.bind(this));

    this.exp.get(this.pie.config.http.well_known);

    this.server = http.createServer(this.exp);
    this.server.listen(this.pie.config.http.port);
    //this.exp.listen(this.pie.config.http.port, this.pie.config.http.host);
    this.wss = new WebSocketServer({server: this.server});
    this.wss.on('connection', function (ws) {
        new Session(this.pie, ws);
    }.bind(this));
}

module.exports = PieHTTP;
