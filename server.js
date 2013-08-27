var pie = require('./lib');
var config = require('./config');
var replify = require('replify');
var minimist = require('minimist');

function PieRepl(pie) {
    this.pie = pie;
    this.crap = 1;

    this.createUser = function() {
        return "This will be great eventually.";
    };
}


var server = new pie(config);

function evaler(cmd, ctx, filename, cb) {
    cmd = cmd.replace('\n', '');
    cmd = cmd.slice(1, cmd.length-1);
    var args = minimist(cmd);
    cb(null, [cmd, args]);
}

replify({name: 'pie', path: __dirname, eval: evaler}, server.exp, new PieRepl(server));

