var pie = require('./lib');
var config = require('./config');
var replify = require('replify');
var minimist = require('minimist');
var async = require('async');
var colors = require('colors');

function PieRepl(pie) {
    this.pie = pie;
    this.crap = 1;
    var repli = this;

    this.func_usage = {
        createUser: "createUser [user] [domain] [password]",
    };
    this.funcs = {
        createUser: function(user, domain, pass, cb) {
            repli.pie.db.auth(domain).create(user, pass, cb);
        }.bind(this),
        help: function (cb) {
            var desc = "";
            async.each(Object.keys(repli.func_usage), function(fname, acb) {
                desc += fname.green.bold + ": " + "\n  " + repli.func_desc[fname];
                desc += '\n  Usage: '.red + repli.func_usage[fname];
                desc += '\n';
                acb();
            },
            function (err) {
                cb(false, desc);
            });
        },
    };
    
    this.func_desc = {
        createUser: "Create a new local user.",
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
                cb(true, e.description);
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

replify({name: 'pie', path: __dirname, eval: evaler, writer: writer}, server.exp, new PieRepl(server));

