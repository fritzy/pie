var pie = require('./lib');
var config = require('./config');
var replify = require('replify');
var minimist = require('minimist');
var async = require('async');
var colors = require('colors');
var bucker = require('bucker');
var log = bucker.createLogger({app: 'server.log', console: true}, 'main');

function PieRepl(pie) {
    log.info("Starting...");
    this.pie = pie;
    this.crap = 1;
    var repli = this;

    this.func_usage = {
        createUser: "createUser [user] [domain] [password]",
        generateToken: 'getToken [user] [domain]',
    };
    this.funcs = {
        createUser: (user, domain, pass, cb) => {
            repli.pie.db.auth(domain).create(user, pass, (err, reply) => {
                if(!err) {
                    cb(false, "User added.");
                } else {
                    cb(true, "hello?");
                }
            });
        },
        generateToken(user, domain, cb) {
            repli.pie.db.auth(domain).getToken(user, '', (err, token) => {
                console.log("done");
                cb(err, token);
            }, true);
        },
        help(cb) {
            async.reduce(Object.keys(repli.func_usage), '', (desc, fname, acb) => {
                desc += '\n';
                desc += fname.green.bold + ": " + "\n  " + repli.func_desc[fname];
                desc += '\n  Usage: '.red + repli.func_usage[fname];
                desc += '\n';
                acb(false, desc);
            },
            (err, desc) => {
                cb(false, desc);
            });
        },
    };
    
    this.func_desc = {
        createUser: "Create a new local user.",
        generateToken: "Generate token for user."
    }
}


var server = new pie(config);

function evaler(cmd, ctx, filename, cb) {
    cmd = cmd.replace('\n', '');
    var cargs = cmd.match(/\w+|(?:")(?:\\.|[^(?:")])+"/g);
    if (cargs === null) {
        cb(false);
        return;
    }
    var args = minimist(cargs)._;
    if (ctx.funcs.hasOwnProperty(args[0])) {
        var func = ctx.funcs[args[0]];
        args.push(cb);
        if (func.length === args.length - 1) {
            try {
                func.apply(ctx, args.slice(1));
            } catch (e) {
                throw e;
            }
        } else {
            cb(false, "Usage: " + ctx.func_usage[args[0]]);
        }
    } else {
        cb (false, "Command not found: " + args[0] + '\n  Try "help"');
    }
}

function writer(thing) {
    return thing;
}

replify({name: 'pie', path: __dirname, eval: evaler, writer}, server.exp, new PieRepl(server));

