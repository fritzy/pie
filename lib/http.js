var express = require('express');
var url = require('url');
var querystring = require('querystring');

function PieHTTP(pie) {
    this.pie = pie;
    
    this.exp = express();
    var pie = this.pie;


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
                query: query
            };
            console.log(req.pie.channel);
        }

        if (typeof req.pie !== 'undefined') {
           if (req.method === 'POST') {
               switch (req.pie.query.type) {
               case 'channel':
                   pie.db.channel(req.pie.user, domain).addChannel('root', req.pie.channel, req.body, function (err, reply) {
                       if (err) {
                           res.send(400, err);
                       } else {
                           res.send(201);
                       }
                   });
                   break;
               default:
                   next();
               }
           } else if (req.method === 'GET') {
               switch (req.pie.query.type) {
                case 'channel':
                   pie.db.channel(req.pie.user, domain).listChannel('root', req.pie.channel, req.pie.query, function (err, reply) {
                       if(err) {
                           res.send(400, err);
                       } else {
                           res.send(200, reply);
                       }
                   });
                   break;
                case 'config':
                    pie.db.channel(req.pie.user, domain).getConfig('root', req.pie.channel, function (err, reply) {
                    if (err) {
                        res.send(400, err);
                    } else {
                        res.send(200, reply);
                    }
                });
                break;
                default:
                   next();
               }
           } else {
               next();
           }
        } else {
            next();
        }
    });

    this.exp.get(this.pie.config.http.well_known);

    this.exp.listen(this.pie.config.http.port, this.pie.config.http.host);
}

module.exports = PieHTTP;
