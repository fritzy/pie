var simpleriak = require('simpleriak');
var riak = simpleriak.createClient();
var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();

var map_reduce = {
    getFromPath: {
        map: function (v, x, a) {
            var data = JSON.parse(v.values[0].data);
            return [{data: data, index: v.values[0].metadata.index}];
        },
        reduce: function (v, a) {
            if (a.hasOwnProperty('offset')) {
                v = v.slice(a.offset);
            }
            if (a.hasOwnProperty('count')) {
                v = v.slice(0, a.count);
            }
            return v;
        }
    },

    pathsFromPattern: {
        map: function (v, x, a) {
            return [{key: v.values[0].key, path: v.values[0].metadata.index.path_bin}];
        },
        reduce: function(v, a) {
            var paths = [];
            for (var vidx in v) {
                var path = v[vidx].path;
                if (a.pattern[a.pattern.length - 1] !== '*') {
                    a.pattern = a.pattern.replace('*', '\\w+');
                    var pattern = new RegExp('^' + a.pattern + '$');
                } else {
                    a.pattern = a.pattern.replace('*', '[A-Za-z0-9_/]+');
                    var pattern = new RegExp('^' + a.pattern + '$');
                }
                if(pattern.exec(path) !== null) {
                    paths.push(path);
                }
            }
            return paths;
        }
    }
};

var getFromPath = function (bucket, path, type, indexes, count, offset, cb) {
    var mi = indexes || {};
    mi.path = path;
    mi.type = type;
    riak.mapred({index: mi, map: {source: map_reduce.getFromPath.map, arg: {count: count, offset: offset}}, reduce: {source: map_reduce.getFromPath.reduce, arg: {count: count, offset: offset}}, bucket: bucket}, function (err, result) {
        cb (err, result);
    });
};

var addToPath = function (bucket, path, type, indexes, data, cb) {
    var mi = indexes || {};
    mi.path = path;
    mi.time = Date.now();
    mi.type = type;
    riak.put({index: mi, data: data, bucket: bucket}, cb);
};

var createPath = function (bucket, path, data, cb) {
    var mi = {
        path: path,
        type: "path",
    };
    pathExists(bucket, path, function(exists) {
        if(!exists) {
            riak.put({index: mi, data: data, bucket: bucket}, function (err, reply) {
                events.emit('create_path', path, data);
                //TODO event
                //TODO check for patterns in subscriptions
                cb(err, reply);
            });
        } else {
            cb("Already exists", null);
        }
    });
};

var updatePath = function (bucket, path, data, cb) {
};

var getPath = function (bucket, path, cb) {
    riak.get({bucket: bucket, index: {path: path, type: 'path'}}, function(err, reply) {
        cb(err, reply);
    });
};

var movePath = function (bucket, path, newpath, cb) {
};

var deleteFromPath = function (bucket, path, type, indexes, cb) {
};

var pathsFromPattern = function (bucket, path_pattern, cb) {
    riak.mapred({bucket: bucket, index: {type: 'path'}, map: {source: map_reduce.pathsFromPattern.map, arg:{pattern: path_pattern}}, reduce: {source:map_reduce.pathsFromPattern.reduce, arg:{pattern: path_pattern}}}, function (err, reply) {
        cb(err, reply);
    });
};

var pathExists = function (bucket, path, cb) {
    getPath(bucket, path, function (err, reply) {
        if (err || reply.statusCode == 404) {
            cb(false);
        } else {
            cb(true);
        }
    });
};

module.exports = {
    getFromPath: getFromPath,
    addToPath: addToPath,
    createPath: createPath,
    updatePath: updatePath,
    getPath: getPath,
    movePath: movePath,
    deleteFromPath: deleteFromPath,
    pathsFromPattern: pathsFromPattern,
    pathExists: pathExists
};

//createPath('otalk_fritzy@andyet.net', '/up/down/left/right', {}, function (err, reply) {
    //console.log(err, reply);
    //addToPath('otalk_fritzy@andyet.net', '/up/down/left/right', 'msg', {}, {body: 'weee'}, function (err, reply) {
        //getFromPath('otalk_fritzy@andyet.net', '/up/down/left/right', 'msg', undefined, undefined, undefined, function (err, reply) {
            //console.log("...");
            //console.log(err, reply);
            //pathsFromPattern('otalk_fritzy@andyet.net', "/up/down/left/*/", function (err, reply) {
                //console.log(reply);
            //});
        //});
    //});
//});
