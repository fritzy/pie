//©2013 Ericsson AB. All Rights Reserved.
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var WebSocket    = require('ws');



var window = this;

var Warp = {config: {delayLoad: true, debug: true}};
var Trap = {useBinary: false, config: {debug: true}};

var self = {
    console: console
}

if (typeof(Warp) != "object")
{
    Warp = { config: {delayLoad: true } };
}

Warp.version = "2.0";

if (!Warp.config)
    Warp.config = {};

if (!Warp.log) Warp.log = function(){};
if (!Warp.warn) Warp.warn = Warp.log;
if (!Warp.error) Warp.error = Warp.log;

var _prefixUrl = function(url) {
	if(typeof(Warp.config.gateway) == "string")
		url = Warp.config.gateway + url;
	return url;
};

var _postfixUrl = function(url) {
	var mod = [];
    if(Warp.config.debug === true)
        mod.push("debug");
    //else
    //    mod.push(new Date().getTime().toString());  // Why was THIS a great idea? If NOT debug, then do NOT cache???
	if(Warp.config.websocket === true)
		mod.push("websocket");
	if(Warp.config.slam === true)
		mod.push("slam");
	if(Warp.config.workers === true)
		mod.push("workers");
	if(Warp.config.headless === true)
		mod.push("headless");
	if(Warp.config.securekey === true)
		mod.push("securekey");
	if(Warp.config.binary === true)
		mod.push("binary");
	if(!undef(Warp.config.storage))
		mod.push("storage=" + Warp.config.storage);
    if(mod.length > 0)
        url += "?" + mod.join("&");
    return url;
};

function undef(v) { return typeof(v) == "undefined"};

if(typeof(Warp.config.gateway) != "string")
	Warp.config.gateway = "http://75.55.107.100:8080/Core-Gateway-View";
if(typeof(Warp.config.debug) != "boolean")
	Warp.config.debug = true;
if(typeof(Warp.config.headless) != "boolean")
	Warp.config.headless = true;
if(typeof(Warp.config.slam) != "boolean")
	Warp.config.slam = true;
if(typeof(Warp.config.trap) != "string")
	Warp.config.trap = "trap.transport.asyncloopback.loopback-remote-id = 1099a5b8-e8fc-47b8-9301-18225404cb1c\ntrap.transport.http.url = http://75.55.107.100:8088/\ntrap.transport.socket.host = 75.55.107.100\ntrap.transport.socket.port = 10088\ntrap.transport.websocket.wsuri = ws://75.55.107.100:10080/ws\n";

Warp.config.key = {
	p : "b61b19e62e76d6190d24a6dd0fb17e713b08aff66142a3170623a7038f58da11",
	q : "a19a10ccf463390dd6b81d855ee36739690565063be629e031c2037301d84bff",
	n : "72f4a38ad4c0203749998ef4a3344d0d955c11f87a2111893cdbe1a2a246778b8036ebaa790d1172d2bcd2cdb29e6fe2d99094bb04a8c0b16f5bdbffe0bc31ef",
	e : "10001",
	d : "2f12d8e9a00770e9d2fccbda87fe81d31f278dc0579ab508a2e053bc7a812ab06bb7fea20a2d67325b066b4127a25474820d076c9c0b7c6df40a356cca22e161"
};

Warp.config.gatewayname = "null"

var _pad = function (val, len) {
	val = String(val);
	len = len || 2;
	while (val.length < len)
		val = "0" + val;
	return val;
};

var _logtime = function () {
	var d = new Date();
    return [_pad(d.getHours(), 2)+":"+_pad(d.getMinutes(), 2)+":"+_pad(d.getSeconds(), 2)+"."+_pad(d.getMilliseconds(), 3)+" -"];
};

Warp.log = function() {
	try	{
		// Return immediately if there's no log function. This allows me to enable logging even without debug mode
		// (i.e. on the fly) by setting _logFun. Also, it's much fewer checks.
		if (!Warp._logFun)
			return;
		var params = _logtime();
        params.push.apply(params, arguments);
		Warp._logFun(params);
	} catch (e) {} // Can't do anything if Warp.log fails
};

Warp.warn = function() {
	try	{
		if (!Warp._warnFun)
			return;
		var params = _logtime();
		params.push("WARNING:");
        params.push.apply(params, arguments);
		Warp._warnFun(params);
	} catch (e) {}
};

Warp.error = function() {
	try	{
		if (!Warp._errorFun)
			return;
		var params = _logtime();
		params.push("ERROR:");
        params.push.apply(params, arguments);
		Warp._errorFun(params);
	} catch (e) {}
};

// DEPRECATED! We should not put things in the self namespace; instead, it should reside under Warp.
self.timelog = Warp.log;

// Set up Warp.log, Warp.warn and Warp.error
Warp._logFun = function(params) { self.console.log(params.join()); };
if (Warp.config.debug) {
	if (self.console && self.console.log) {
	    if (self.console.log.apply)
	    	Warp._logFun = function(params) { self.console.log.apply(self.console, params); };
	    else
	    	Warp._logFun = function(params) { self.console.log(params.join()); };
	    if (self.console.warn) {
		    if (self.console.warn.apply)
		    	Warp._warnFun = function(params) { self.console.warn.apply(self.console, params); };
		    else
		    	Warp._warnFun = function(params) { self.console.warn(params.join()); };
	    } else
	    	Warp._warnFun = Warp._logFun;
	    if (self.console.error) {
		    if (self.console.error.apply)
		    	Warp._errorFun = function(params) { self.console.error.apply(self.console, params); };
		    else
		    	Warp._errorFun = function(params) { self.console.error(params.join()); };
	    } else
	    	Warp._errorFun = Warp._logFun;
	} else
		try {
			if (document && document.getElementById("warp-console")) {
				var c = document.getElementById("warp-console");
				function log(level, strs) { c.innerHTML += level + ": " + strs.join(); }
				Warp._logFun = function() { log("INFO", arguments); };
				Warp._warnFun = function() { log("WARN", arguments); };
				Warp._errorFun = function() { log("ERROR", arguments); };
			}
		} catch(e) {}
}

var _eventlistenersMap = Warp._eventlistenersMap || {};
delete Warp._eventlistenersMap;

var _dispatchEvent = function(evt) {
    var listeners = _eventlistenersMap[evt.type];
    
    if(!!listeners)
    	for (var i = 0; i < listeners.length; i++)
    		listeners[i](evt);
    
    // Support Warp.onXXX handlers natively
    var f = Warp["on"+evt.type];
    if (f && typeof(f) == "function") f(evt);
};

/**
 * Register an event listener.
 * 
 * @param {String} type The event type the listener triggers on.
 * @param {Function} listener The event listener to unregister.
 *
 * @see Warp#removeEventListener
 */
if (!Warp.addEventListener) // Prevents these functions from overwriting previously defined ones (in loader)
Warp.addEventListener = function(type, listener) {
    if (!_eventlistenersMap[type])
        _eventlistenersMap[type] = [];
    var eventlisteners = _eventlistenersMap[type];
    for (var i = 0; i<eventlisteners.length; i++) {
        if(listener === eventlisteners[i])
            return;
    }
    eventlisteners[i] = listener;
};

/**
 * Unregister previously registered event listener.
 * 
 * @param {String} type The event type the listener triggers on.
 * @param {Function} listener The event listener to unregister.
 *
 * @see Warp#addEventListener
 */
if (!Warp.removeEventListener) // Prevents these functions from overwriting previously defined ones (in loader)
Warp.removeEventListener = function(type, listener) {
    if (!_eventlistenersMap[type])
        return;
    var eventlisteners = _eventlistenersMap[type];
    for (var i = 0; i < eventlisteners.length; i++) {
        if (listener === eventlisteners[i]) {
            eventlisteners.splice(i,1);
            break;
        }
    }
};

var _loadcount = 0;

if (!Warp.util)
	Warp.util = {};

Warp.util.timeouts = {};
Warp.util.timeoutNum = 1;

Warp.util.timeout = function(time, object) {
	var tn = "t"+Warp.util.timeoutNum++;
	Warp.util.timeouts[tn] = object;
	setTimeout("Warp.util.doTimeout(\"" + tn + "\");", time);
};

Warp.util.doTimeout = function(timeout) {
	var obj = Warp.util.timeouts[timeout];
	delete Warp.util.timeouts[timeout];
	obj.ontimeout();
};

console.log("updating string");
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

if (typeof String.prototype.trim != 'function')
{
	String.prototype.trim = function(str)
	{
		var	s = str.replace(/^\s\s*/, ''),
			ws = /\s/,
			i = s.length;
		while (ws.test(s.charAt(--i)));
		return s.slice(0, i + 1);
		
	};
}

if (typeof String.prototype.endsWith != 'function') {
	String.prototype.endsWith = function(suffix) {
	    return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};
}

if (typeof String.prototype.contains != 'function')
{
	String.prototype.contains = function(target)
	{
		return this.indexOf(target) != -1;
	};
};

// Calculates the length of the string in utf-8
if (typeof String.prototype.utf8ByteLength != 'function')
{
	String.prototype.utf8ByteLength = function()
	{
		// Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
		var m = encodeURIComponent(this).match(/%[89ABab]/g);
		return this.length + (m ? m.length : 0);
	};
};

String.prototype.toUTF8ByteArray = function() {
	var bytes = [];

	var s = unescape(encodeURIComponent(this));

	for (var i = 0; i < s.length; i++) {
		var c = s.charCodeAt(i);
		bytes.push(c);
	}

	return bytes;
};

String.fromUTF8ByteArray = function(arr, offset, length)
{
	var str = "";
	if (typeof(offset) == "undefined")
	{
		offset = 0; length = arr.length;
	}
	
	for (var i=offset; i<length; i++)
		str += String.fromCharCode(arr[i]);
	
	return String.utf8Decode(str);
};

String.utf8Encode = function(src)
{
	return unescape( encodeURIComponent( src ) );
};

String.utf8Decode = function(src)
{
	return decodeURIComponent( escape( src ) );
};

function capitalise(str)
{
	return str.substr(0,1).toUpperCase() + str.substr(1);
}

function __defineSetter(object, setterName, cb)
{
	
	var newName = "set" + capitalise(setterName);
	
	if (object.__defineSetter__)
	{
		try
		{
			object.__defineSetter__(setterName, function()
			{
				if (Warp.config.debug && Warp.config.iewarn != false)
				{
					Warp.warn("Using setter [", setterName, "] as field. This code will fail in Internet Explorer. Use " + newName + "() instead (if compatibility is desired)");
				}
				return cb.apply(object, arguments);
			});
		} catch(e){}
	}

	// Also create the getter function as a property of the object
	object[newName] = cb;
}

function __defineGetter(object, getterName, cb)
{
	
	var newName = "get" + capitalise(getterName);
	
	if (object.__defineGetter__)
	{
		try
		{
			object.__defineGetter__(getterName, function()
			{
				if (Warp.config.debug && Warp.config.iewarn != false)
				{
					Warp.warn("Using getter [", getterName, "] as field. This code will fail in Internet Explorer. Use " + newName + "() instead (if compatibility is desired)");
				}
				return cb.apply(object, arguments);
			});
		} catch(e){}
	}
	
	// Also create the getter function as a property of the object
	object[newName] = cb;
}

function __addEventListener(object, event, listener)
{
	
	function ie() { object.attachEvent("on"+event, listener); }
	
	if (object.addEventListener)
		try
		{
			object.addEventListener(event, listener, false);
		} catch(e) { ie(); } // Yes, Internet Explorer supports AddEventListener... YET STILL THROWS. What's the logic? Really?
	else if (object.attachEvent)
		ie();
	else
		Warp.warn("Could not add listener for ", event, " to object ", object);
}

// Random, unique, unpredictable
// Both uuidCounter++ are needed and Math.random.
// uuidCounter++ ensures unique
// Math.random() ensures unpredictable
// Prints it out as hex with no other punctuation (looks neater)
var uuidCounter = 0;
var uuid = function()
{
	return Math.random().toString(16).substring(2) + (uuidCounter++).toString(16);
};
(function(){
	  // Only apply settimeout workaround for iOS 6 - for all others, we map to native Timers
    return
	  if (!navigator.userAgent.match(/OS 6(_\d)+/i)) return;
	  
	  // Abort if we're running in a worker. Let's hope workers aren't paused during scrolling!!!
	  if (typeof(window) == "undefined")
		  return;
	 
	  (function (window) {
		  
	      // This library re-implements setTimeout, setInterval, clearTimeout, clearInterval for iOS6.
	      // iOS6 suffers from a bug that kills timers that are created while a page is scrolling.
	      // This library fixes that problem by recreating timers after scrolling finishes (with interval correction).
		// This code is free to use by anyone (MIT, blabla).
		// Author: rkorving@wizcorp.jp

	      var timeouts = {};
	      var intervals = {};
	      var orgSetTimeout = window.setTimeout;
	      var orgSetInterval = window.setInterval;
	      var orgClearTimeout = window.clearTimeout;
	      var orgClearInterval = window.clearInterval;


	      function createTimer(set, map, args) {
	              var id, cb = args[0], repeat = (set === orgSetInterval);

	              function callback() {
	                      if (cb) {
	                              cb.apply(window, arguments);

	                              if (!repeat) {
	                                      delete map[id];
	                                      cb = null;
	                              }
	                      }
	              }

	              args[0] = callback;

	              id = set.apply(window, args);

	              map[id] = { args: args, created: Date.now(), cb: cb, id: id };

	              return id;
	      }


	      function resetTimer(set, clear, map, virtualId, correctInterval) {
	              var timer = map[virtualId];

	              if (!timer) {
	                      return;
	              }

	              var repeat = (set === orgSetInterval);

	              // cleanup

	              clear(timer.id);

	              // reduce the interval (arg 1 in the args array)

	              if (!repeat) {
	                      var interval = timer.args[1];

	                      var reduction = Date.now() - timer.created;
	                      if (reduction < 0) {
	                              reduction = 0;
	                      }

	                      interval -= reduction;
	                      if (interval < 0) {
	                              interval = 0;
	                      }

	                      timer.args[1] = interval;
	              }

	              // recreate

	              function callback() {
	                      if (timer.cb) {
	                              timer.cb.apply(window, arguments);
	                              if (!repeat) {
	                                      delete map[virtualId];
	                                      timer.cb = null;
	                              }
	                      }
	              }

	              timer.args[0] = callback;
	              timer.created = Date.now();
	              timer.id = set.apply(window, timer.args);
	      }


	      window.setTimeout = function () {
	              return createTimer(orgSetTimeout, timeouts, arguments);
	      };


	      window.setInterval = function () {
	              return createTimer(orgSetInterval, intervals, arguments);
	      };

	      window.clearTimeout = function (id) {
	              var timer = timeouts[id];

	              if (timer) {
	                      delete timeouts[id];
	                      orgClearTimeout(timer.id);
	              }
	      };

	      window.clearInterval = function (id) {
	              var timer = intervals[id];

	              if (timer) {
	                      delete intervals[id];
	                      orgClearInterval(timer.id);
	              }
	      };

	      window.addEventListener('scroll', function () {
	              // recreate the timers using adjusted intervals
	              // we cannot know how long the scroll-freeze lasted, so we cannot take that into account

	              var virtualId;

	              for (virtualId in timeouts) {
	                      resetTimer(orgSetTimeout, orgClearTimeout, timeouts, virtualId);
	              }

	              for (virtualId in intervals) {
	                      resetTimer(orgSetInterval, orgClearInterval, intervals, virtualId);
	              }
	      });

	}(window));
	})();
if (!this.JSON) {
    JSON = {};
}
(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z';
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

Warp.MD5 = function (string) {
 
	function RotateLeft(lValue, iShiftBits) {
		return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
	}
 
	function AddUnsigned(lX,lY) {
		var lX4,lY4,lX8,lY8,lResult;
		lX8 = (lX & 0x80000000);
		lY8 = (lY & 0x80000000);
		lX4 = (lX & 0x40000000);
		lY4 = (lY & 0x40000000);
		lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
		if (lX4 & lY4) {
			return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
		}
		if (lX4 | lY4) {
			if (lResult & 0x40000000) {
				return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
			} else {
				return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
			}
		} else {
			return (lResult ^ lX8 ^ lY8);
		}
 	}
 
 	function F(x,y,z) { return (x & y) | ((~x) & z); }
 	function G(x,y,z) { return (x & z) | (y & (~z)); }
 	function H(x,y,z) { return (x ^ y ^ z); }
	function I(x,y,z) { return (y ^ (x | (~z))); }
 
	function FF(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function GG(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function HH(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function II(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function ConvertToWordArray(string) {
		var lWordCount;
		var lMessageLength = string.length;
		var lNumberOfWords_temp1=lMessageLength + 8;
		var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
		var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
		var lWordArray=Array(lNumberOfWords-1);
		var lBytePosition = 0;
		var lByteCount = 0;
		while ( lByteCount < lMessageLength ) {
			lWordCount = (lByteCount-(lByteCount % 4))/4;
			lBytePosition = (lByteCount % 4)*8;
			lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
			lByteCount++;
		}
		lWordCount = (lByteCount-(lByteCount % 4))/4;
		lBytePosition = (lByteCount % 4)*8;
		lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
		lWordArray[lNumberOfWords-2] = lMessageLength<<3;
		lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
		return lWordArray;
	};
 
	function WordToHex(lValue) {
		var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
		for (lCount = 0;lCount<=3;lCount++) {
			lByte = (lValue>>>(lCount*8)) & 255;
			WordToHexValue_temp = "0" + lByte.toString(16);
			WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
		}
		return WordToHexValue;
	};
 
	function Utf8Encode(string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	};
 
	var x=Array();
	var k,AA,BB,CC,DD,a,b,c,d;
	var S11=7, S12=12, S13=17, S14=22;
	var S21=5, S22=9 , S23=14, S24=20;
	var S31=4, S32=11, S33=16, S34=23;
	var S41=6, S42=10, S43=15, S44=21;
 
	string = Utf8Encode(string);
 
	x = ConvertToWordArray(string);
 
	a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
 
	for (k=0;k<x.length;k+=16) {
		AA=a; BB=b; CC=c; DD=d;
		a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
		d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
		c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
		b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
		a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
		d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
		c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
		b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
		a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
		d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
		c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
		b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
		a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
		d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
		c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
		b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
		a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
		d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
		c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
		b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
		a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
		d=GG(d,a,b,c,x[k+10],S22,0x2441453);
		c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
		b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
		a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
		d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
		c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
		b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
		a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
		d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
		c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
		b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
		a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
		d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
		c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
		b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
		a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
		d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
		c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
		b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
		a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
		d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
		c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
		b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
		a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
		d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
		c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
		b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
		a=II(a,b,c,d,x[k+0], S41,0xF4292244);
		d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
		c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
		b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
		a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
		d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
		c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
		b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
		a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
		d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
		c=II(c,d,a,b,x[k+6], S43,0xA3014314);
		b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
		a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
		d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
		c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
		b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
		a=AddUnsigned(a,AA);
		b=AddUnsigned(b,BB);
		c=AddUnsigned(c,CC);
		d=AddUnsigned(d,DD);
	}
 
	var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);
 
	return temp.toLowerCase();
};

Warp.HTTPDigest = function() {
    this.algorithm = "MD5";
};

Warp.HTTPDigest.prototype._parse = function(string, key, regexp) {
    var out = string.match((regexp?new RegExp(regexp):new RegExp(key+"=\\\"[^\\\"]+\\\"")));
    if(out && out[0] && out[0].length>0)
        return out[0].substring(key.length+2, out[0].length-1);
    return null;
};

Warp.HTTPDigest.prototype.getRealm = function(challenge) {
	return this._parse(challenge, "realm");
};

Warp.HTTPDigest.prototype.isStale = function(challenge) {
	var st = this._parse(challenge, "stale", "stale=\\\"(true|false)\\\"");
	if (st === "true")
		return true;
	var non = this._parse(challenge, "nonce");
	if(this.nonce != non)
		return true;	
	return false;
};

Warp.HTTPDigest.prototype.setCredentials = function(username, password) {
    if (!this.algorithm)
    	return;
    var A1 = username + ":" + this.realm + ":" + password;
    this.username = username;
    if(this.algorithm=="MD5")
    	this.authCredentials = Warp.MD5(A1);
    else
    	this.authCredentials = A1;
};

Warp.HTTPDigest.prototype.setChallenge = function(challenge) {
    if(!challenge || challenge.search(/(\s)*Digest(\s)+/)!=0)
        return;
    var non = this._parse(challenge, "nonce");
    if(!non)
    	return;
    if(this.nonce!=non) {
    	this.nonce = non;
    	this.nc = 1;
    }
    this.realm = this.getRealm(challenge);
    if(!this.realm)
    	return;
    var token = "([^(\\x00-\\x1F\\x7F\\(\\)\\<\\>\\@\\,\\;\\:\\\\\"\\/\\[\\]\\?\\=\\{\\} \\t)])+";
    var qo = this._parse(challenge, "qop", "qop=\\\"(auth|auth-int|"+token+")\\\"");
    if(qo)
        this.qop = qo.split(/,/);
    this.opaque = this._parse(challenge, "opaque");
    var alg = this._parse(challenge, "algorithm", "algorithm=\\\"(MD5|MD5-sess|"+token+")\\\"");
    if(alg)
        this.algorithm = alg;
    this.cnonce = Warp.MD5("#"+Math.random()*new Date().getTime()).substring(24);
};

Warp.HTTPDigest.prototype.computeResponse = function(method, uri, data) {
    if(!method || !uri || !this.realm || !this.authCredentials || !this.algorithm || !this.nonce)
        return null;
    
    function contains(a, obj) {
        if(!a)
            return false;
        var i = a.length;
        while(i--)
            if(a[i] === obj)
                return true;
        return false;
    }

	var auth;
    if(contains(this.qop, "auth-int"))
    	auth = "auth-int";
    else
    	if(contains(this.qop, "auth"))
    		auth = "auth";
    
    var HA1 = this.authCredentials;
    if(this.algorithm=="MD5-sess") {
	    var A1 = HA1 + ":" + this.nonce + ":" + this.cnonce;
    	HA1 = Warp.MD5(A1);
    }

    var A2 = method + ":" + uri;
    if(auth && auth=="auth-int")
    	A2 += ":" + Warp.MD5(data);
    	
    var HA2 = Warp.MD5(A2);

    var response = HA1 + ":" + this.nonce + ":";
    if(auth && (auth=="auth" || auth=="auth-int")) 
    	response = Warp.MD5(response + this.nc.toString(16) + ":" + this.cnonce+ ":" + auth +":" + HA2);
    else
    	response = Warp.MD5(response + HA2);
    
    return 'Digest username="'+this.username+
           '",realm="'+this.realm+
           '",nonce="'+this.nonce+
           '",uri="'+uri+
           (this.opaque?
           '",opaque="'+this.opaque:'')+
           ((auth && (auth=='auth' || auth=='auth-int'))?
           '",qop="'+auth+
           '",cnonce="'+this.cnonce+
           '",nc="'+(this.nc++).toString(16):'')+
           '",response="'+response+
           '"';
};

Warp.Rsa = function(b) {
	
	// Big Integer Library v. 5.1
	// Created 2000, last modified 2007
	// Leemon Baird
	
	var bpe=0;
	var mask=0;
	var radix=mask+1;
	
	for(bpe=0;(1<<(bpe+1))>(1<<bpe);bpe++);
	bpe>>=1;
	mask=(1<<bpe)-1;
	radix=mask+1;
	
	var one=int2bigInt_(1,1,1);
	var t=new Array(0);
	var s0=t;
	var s3=t;
	var s4=t;
	var s5=t;
	var s6=t;
	var s7=t;
	var ss=t;
	var sa=t;
	var T=t;
	var eg_v=t;
	var eg_u=t;
	var eg_A=t;
	var eg_B=t;
	var eg_C=t;
	var eg_D=t;
	var mr_x1=t;
	var mr_r=t;
	var mr_a=t;
	var primes=t;
	var pows=t;
	var s_i=t;
	var s_i2=t;
	var s_R=t;
	var s_rm=t;
	var s_q=t;
	var s_n1=t; 
	var s_a=t;
	var s_r2=t;
	var s_n=t;
	var s_b=t;
	var s_d=t;
	var s_x1=t;
	var s_x2=t;
	var s_aa=t;

	this.b = b;
	
	function copyInt_(x,n) {
		var i,c;
		for(c=n,i=0;i<x.length;i++) {
			x[i]=c&mask;
			c>>=bpe;
		}
	}

	function int2bigInt_(t,bits,minSize) {	
		var i,k;
		k=Math.ceil(bits/bpe)+1;
		k=minSize>k?minSize:k;
		var buff=new Array(k);
		copyInt_(buff,t);
		return buff;
	}
	
	this.int2bigInt = function(t,bits,minSize) {
		return int2bigInt_(t,bits,minSize);
	};

	this.randTruePrime = function(k) {
		var ans=this.int2bigInt(0,k,0);
		randTruePrime_(ans,k);
		return trim(ans,1);
	};

	function randTruePrime_(ans,k) {
		var c,m,pm,dd,j,r,B,divisible,z,zz,recSize;
		if(primes.length==0)
			primes=findPrimes(30000);
		if(pows.length==0) {
			pows=new Array(512);
			for(j=0;j<512;j++)
				pows[j]=Math.pow(2,j/511.-1.);
		}
		c=0.1;
		m=20;
		recLimit=20;
		if(s_i2.length!=ans.length) {
			s_i2=dup(ans);
			s_R =dup(ans);
			s_n1=dup(ans);
			s_r2=dup(ans);
			s_d =dup(ans);
			s_x1=dup(ans);
			s_x2=dup(ans);
			s_b =dup(ans);
			s_n =dup(ans);
			s_i =dup(ans);
			s_rm=dup(ans);
			s_q =dup(ans);
			s_a =dup(ans);
			s_aa=dup(ans);
		}
		if(k<=recLimit) {
			pm=(1<<((k+2)>>1))-1;
			copyInt_(ans,0);
			for(dd=1;dd;) {
				dd=0;
				ans[0]= 1|(1<<(k-1))|Math.floor(Math.random()*(1<<k));
				for(j=1;(j<primes.length)&&((primes[j]&pm)==primes[j]);j++) {
					if(0==(ans[0]%primes[j])) {
						dd=1;
						break;
					}
				}
			}
			carry_(ans);
			return;
		  }
		  B=c*k*k;
		  if(k>2*m)
			  for(r=1;k-k*r<=m;)
				  r=pows[Math.floor(Math.random()*512)];
		  else
			  r=.5;
		  recSize=Math.floor(r*k)+1;
		  randTruePrime_(s_q,recSize);
		  copyInt_(s_i2,0);
		  s_i2[Math.floor((k-2)/bpe)]|=(1<<((k-2)%bpe));
		  divide_(s_i2,s_q,s_i,s_rm);
		  z=bitSize(s_i);
		  for(;;) {
			for(;;) {
			  randBigInt_(s_R,z,0);
			  if(greater_(s_i,s_R))
				break;
			}
			addInt_(s_R,1);
			add_(s_R,s_i);
			copy_(s_n,s_q);
			mult_(s_n,s_R); 
			multInt_(s_n,2);
			addInt_(s_n,1);
			copy_(s_r2,s_R);
			multInt_(s_r2,2);
			for(divisible=0,j=0;(j<primes.length)&&(primes[j]<B);j++)
				if(modInt(s_n,primes[j])==0) {
					divisible=1;
					break;
				}
			if(!divisible)
				if(!millerRabin(s_n,2))
					divisible=1;
				if(!divisible) {
					addInt_(s_n,-3);
			  for(j=s_n.length-1;(s_n[j]==0)&&(j>0);j--);
				for(zz=0,w=s_n[j]; w; (w>>=1),zz++);
					zz+=bpe*j;
				for(;;) {
					randBigInt_(s_a,zz,0);
					if(greater_(s_n,s_a))
						break;
				}
				addInt_(s_n,3);
				addInt_(s_a,2);
				copy_(s_b,s_a);
				copy_(s_n1,s_n);
				addInt_(s_n1,-1);
				powMod_(s_b,s_n1,s_n);
				addInt_(s_b,-1);
				if(isZero(s_b)) {
					copy_(s_b,s_a);
					powMod_(s_b,s_r2,s_n);
					addInt_(s_b,-1);
					copy_(s_aa,s_n);
					copy_(s_d,s_b);
					GCD_(s_d,s_n);
					if(equalsInt_(s_d,1)) {
						copy_(ans,s_aa);
						return;
					}
				}
			}
		}
	}

	function findPrimes(n) {
		var i,s,p,ans;
		s=new Array(n);
		for(i=0;i<n;i++)
			s[i]=0;
		s[0]=2;
		p=0;
		for(;s[p]<n;) {
			for(i=s[p]*s[p];i<n;i+=s[p])
				s[i]=1;
			p++;
			s[p]=s[p-1]+1;
			for(;s[p]<n&&s[s[p]];s[p]++);
		}
		ans=new Array(p);
		for(i=0;i<p;i++)
			ans[i]=s[i];
		return ans;
	}

	function dup(x) {
		var i;
		buff=new Array(x.length);
		copy_(buff,x);
		return buff;
	}
		 
	function copy_(x,y) {
		var i;
		var k=x.length<y.length?x.length:y.length;
		for(i=0;i<k;i++)
		x[i]=y[i];
		for(i=k;i<x.length;i++)
			x[i]=0;
	}
		
	function carry_(x) {
		var i,k,c,b;
		k=x.length;
		c=0;
		for(i=0;i<k;i++) {
			c+=x[i];
			b=0;
			if(c<0) {
				b=-(c>>bpe);
				c+=b*radix;
			}
			x[i]=c & mask;
			c=(c>>bpe)-b;
		}
	}

	function divide_(x,y,q,r) {
		var kx,ky;
		var i,j,y1,y2,c,a,b;
		copy_(r,x);
		for(ky=y.length;y[ky-1]==0;ky--);
			b=y[ky-1];
		for(a=0;b;a++)
			b>>=1;	
		a=bpe-a;
		leftShift_(y,a);
		leftShift_(r,a);
		for(kx=r.length;r[kx-1]==0 && kx>ky;kx--);
			copyInt_(q,0);
		while(!greaterShift(y,r,kx-ky)) {
			subShift_(r,y,kx-ky);
			q[kx-ky]++;
		}
		for(i=kx-1;i>=ky;i--) {
			if(r[i]==y[ky-1])
				q[i-ky]=mask;
			else
				q[i-ky]=Math.floor((r[i]*radix+r[i-1])/y[ky-1]);	
			for(;;) {
				y2=(ky>1?y[ky-2]:0)*q[i-ky];
				c=y2>>bpe;
				y2=y2 & mask;
				y1=c+q[i-ky]*y[ky-1];
				c=y1>>bpe;
				y1=y1 & mask;
				if(c==r[i]?y1==r[i-1]?y2>(i>1?r[i-2]:0):y1>r[i-1]:c>r[i]) 
					q[i-ky]--;
				else
					break;
			}
			linCombShift_(r,y,-q[i-ky],i-ky);
			if(negative(r)) {
				addShift_(r,y,i-ky);
				q[i-ky]--;
			}
		}
		rightShift_(y,a);
		rightShift_(r,a);
	}

	function leftShift_(x,n) {
		var i;
		var k=Math.floor(n/bpe);
		if(k) {
			for(i=x.length;i>=k;i--)
				x[i]=x[i-k];
			for(;i>=0;i--)
				x[i]=0;	 
			n%=bpe;
		}
		if(!n)
			return;
		for(i=x.length-1;i>0;i--)
			x[i]=mask & ((x[i]<<n)|(x[i-1]>>(bpe-n)));
		x[i]=mask&(x[i]<<n);
	}

	function greaterShift(x,y,shift) {
		var kx=x.length,ky=y.length;
		k=((kx+shift)<ky)?(kx+shift):ky;
		for(i=ky-1-shift;i<kx&&i>=0;i++) 
		if(x[i]>0)
			return 1;
		for(i=kx-1+shift;i<ky;i++)
			if(y[i]>0)
				return 0;
		for(i=k-1;i>=shift;i--)
			if(x[i-shift]>y[i])
				return 1;
			else
				if(x[i-shift]<y[i])
					return 0;
				return 0;
	}

	function linCombShift_(x,y,b,ys) {
		var i,c,k,kk;
		k=x.length<ys+y.length?x.length:ys+y.length;
		kk=x.length;
		for(c=0,i=ys;i<k;i++) {
			c+=x[i]+b*y[i-ys];
			x[i]=c&mask;
			c>>=bpe;
		}
		for(i=k;c&&i<kk;i++) {
			c+=x[i];
			x[i]=c & mask;
			c>>=bpe;
		}
	}

	function negative(x) {
		return ((x[x.length-1]>>(bpe-1))&1);
	}

	function rightShift_(x,n) {
		var i;
		var k=Math.floor(n/bpe);
		if(k) {
			for(i=0;i<x.length-k;i++)
				x[i]=x[i+k];
			for(;i<x.length;i++)
				x[i]=0;
			n%=bpe;
		}
		for(i=0;i<x.length-1;i++)
			x[i]=mask&((x[i+1]<<(bpe-n))|(x[i]>>n));
		x[i]>>=n;
	}

	function bitSize(x) {
		var j,z,w;
		for(j=x.length-1;(x[j]==0)&&(j>0);j--);
		for(z=0,w=x[j];w;(w>>=1),z++);
		z+=bpe*j;
		return z;
	}
		
	function randBigInt_(b,n,s) {
		var i,a;
		for(i=0;i<b.length;i++)
			b[i]=0;
		a=Math.floor((n-1)/bpe)+1;
		for(i=0;i<a;i++)
			b[i]=Math.floor(Math.random()*(1<<(bpe-1)));
		b[a-1]&=(2<<((n-1)%bpe))-1;
		if(s==1)
			b[a-1]|=(1<<((n-1)%bpe));
	}

	function greater_(x,y) {
		var i;
		var k=(x.length<y.length)?x.length:y.length;
		for(i=x.length;i<y.length;i++)
		if(y[i])
			return 0;
		for(i=y.length;i<x.length;i++)
			if(x[i])
				return 1;
		for(i=k-1;i>=0;i--)
			if(x[i]>y[i])
				return 1;
			else
				if(x[i]<y[i])
					return 0;
		return 0;
	}
	
	this.greater = function(x,y) {
		return greater_(x,y);
	};
		
	function addInt_(x,n) {
		var i,k,c,b;
		x[0]+=n;
		k=x.length;
		c=0;
		for(i=0;i<k;i++) {
			c+=x[i];
			b=0;
			if(c<0) {
				b=-(c>>bpe);
				c+=b*radix;
			}
			x[i]=c&mask;
			c=(c>>bpe)-b;
			if(!c)
				return;
		}
	}

	function add_(x,y) {
		var i,c,k,kk;
		k=x.length<y.length?x.length:y.length;
		for(c=0,i=0;i<k;i++) {
			c+=x[i]+y[i];
			x[i]=c&mask;
			c>>=bpe;
		}
		for(i=k;c&&i<x.length;i++) {
			c+=x[i];
			x[i]=c&mask;
			c>>=bpe;
		}
	}

	function mult_(x,y) {
		var i;
		if(ss.length!=2*x.length)
			ss=new Array(2*x.length);
		copyInt_(ss,0);
		for(i=0;i<y.length;i++)
			if(y[i])
				linCombShift_(ss,x,y[i],i);
		copy_(x,ss);
	}

	function multInt_(x,n) {
		var i,k,c,b;
		if(!n)
			return;
		k=x.length;
		c=0;
		for(i=0;i<k;i++) {
			c+=x[i]*n;
			b=0;
			if(c<0) {
				b=-(c>>bpe);
				c+=b*radix;
			}
			x[i]=c&mask;
			c=(c>>bpe)-b;
		}
	}

	function modInt(x,n) {
		var i,c=0;
		for(i=x.length-1;i>=0;i--)
			c=(c*radix+x[i])%n;
		return c;
	}

	function millerRabin(x,b) {
		var i,j,k,s;
		if(mr_x1.length!=x.length) {
			mr_x1=dup(x);
			mr_r=dup(x);
			mr_a=dup(x);
		}
		copyInt_(mr_a,b);
		copy_(mr_r,x);
		copy_(mr_x1,x);
		addInt_(mr_r,-1);
		addInt_(mr_x1,-1);
		k=0;
		for(i=0;i<mr_r.length;i++)
			for(j=1;j<mask;j<<=1)
				if(x[i]&j) {
					s=(k<mr_r.length+bpe?k:0); 
					i=mr_r.length;
					j=mask;
				} else
					k++;
				if(s)				 
					rightShift_(mr_r,s);
				powMod_(mr_a,mr_r,x);
				if(!equalsInt_(mr_a,1)&&!equals_(mr_a,mr_x1)) {
					j=1;
					while(j<=s-1&&!equals_(mr_a,mr_x1)) {
						squareMod_(mr_a,x);
						if(equalsInt_(mr_a,1))
							return 0;
						j++;
					}
					if(!equals_(mr_a,mr_x1))
						return 0;
				}
				return 1;  
	}
		
	function powMod_(x,y,n) {
		var k1,k2,kn,np;
		if(s7.length!=n.length)
			s7=dup(n);
		if((n[0]&1)==0) {
			copy_(s7,x);
			copyInt_(x,1);
			while(!equalsInt_(y,0)) {
				if(y[0]&1)
					multMod_(x,s7,n);
				divInt_(y,2);
				squareMod_(s7,n); 
			}
			return;
		}
		copyInt_(s7,0);
		for(kn=n.length;kn>0&&!n[kn-1];kn--);
			np=radix-inverseModInt(modInt(n,radix),radix);
			s7[kn]=1;
			multMod_(x,s7,n);
			if(s3.length!=x.length)
				s3=dup(x);
			else
				copy_(s3,x);
			for(k1=y.length-1;k1>0&!y[k1];k1--);
			if(y[k1]==0) {
				copyInt_(x,1);
				return;
			}
			for(k2=1<<(bpe-1);k2&&!(y[k1]&k2);k2>>=1);
			for(;;) {
				if(!(k2>>=1)) {
					k1--;
					if(k1<0) {
						mont_(x,one,n,np);
						return;
					}
					k2=1<<(bpe-1);
				}
				mont_(x,x,n,np);
				if(k2&y[k1])
					mont_(x,s3,n,np);
			}
	}	 

	function inverseModInt(x,n) {
		var a=1,b=0,t;
		for(;;) {
			if(x==1)
				return a;
			if(x==0)
				return 0;
			b-=a*Math.floor(n/x);
			n%=x;
			if(n==1)
				return b;
			if(n==0)
				return 0;
			a-=b*Math.floor(x/n);
			x%=n;
		}
	}

	function multMod_(x,y,n) {
		var i;
		if(s0.length!=2*x.length)
			s0=new Array(2*x.length);
		copyInt_(s0,0);
		for(i=0;i<y.length;i++)
			if(y[i])
				linCombShift_(s0,x,y[i],i);
		mod_(s0,n);
		copy_(x,s0);
	}
		
	function mod_(x,n) {
		if(s4.length!=x.length)
			s4=dup(x);
		else
			copy_(s4,x);
		if(s5.length!=x.length)
			s5=dup(x);	
		divide_(s4,n,s5,x);
	}

	function mont_(x,y,n,np) {
		var i,j,c,ui,t;
		var kn=n.length;
		var ky=y.length;
		if(sa.length!=kn)
			sa=new Array(kn);
		for(;kn>0&&n[kn-1]==0;kn--);
		copyInt_(sa,0);
		for(i=0;i<kn;i++) {
			t=sa[0]+x[i]*y[0];
			ui=((t&mask)*np)&mask;
			c=(t+ui*n[0])>>bpe;
			t=x[i];
			for(j=1;j<ky;j++) { 
				c+=sa[j]+t*y[j]+ui*n[j];
				sa[j-1]=c&mask;
				c>>=bpe;
			}	 
			for(;j<kn;j++) { 
				c+=sa[j]+ui*n[j];
				sa[j-1]=c&mask;
				c>>=bpe;
			}	 
			sa[j-1]=c&mask;
		}
		if(!greater_(n,sa))
			sub_(sa,n);
		copy_(x,sa);
	}
		
	function equalsInt_(x,y) {
		var i;
		if(x[0]!=y)
			return 0;
		for(i=1;i<x.length;i++)
			if(x[i])
				return 0;
		return 1;
	}

	this.equalsInt = function(x,y) {
		return equalsInt_(x,y);
	};
	
	function equals_(x,y) {
		var i;
		var k=x.length<y.length?x.length:y.length;
		for(i=0;i<k;i++)
			if(x[i]!=y[i])
				return 0;
			if(x.length>y.length) {
				for(;i<x.length;i++)
					if(x[i])
						return 0;
			} else {
				for(;i<y.length;i++)
					if(y[i])
						return 0;
			}
		return 1;
	}
	
	this.equals = function(x,y) {
		return equals_(x,y);
	};
	
	function isZero(x) {
		var i;
		for(i=0;i<x.length;i++)
			if(x[i])
				return 0;
		return 1;
	}

	function GCD_(x,y) {
		var i,xp,yp,A,B,C,D,q,sing;
		if(T.length!=x.length)
			T=dup(x);
		sing=1;
		while(sing) {
			sing=0;
			for(i=1;i<y.length;i++)
				if(y[i]) {
					sing=1;
					break;
				}
			if(!sing)
				break;
			for(i=x.length;!x[i]&&i>=0;i--);
			xp=x[i];
			yp=y[i];
			A=1;B=0;C=0;D=1;
			while((yp+C)&&(yp+D)) {
				q=Math.floor((xp+A)/(yp+C));
				qp=Math.floor((xp+B)/(yp+D));
				if(q!=qp)
					break;
				t=A-q*C;A=C;C=t;
				t=B-q*D;B=D;D=t;
				t=xp-q*yp;xp=yp;yp=t;
			}
			if(B) {
				copy_(T,x);
				linComb_(x,y,A,B);
				linComb_(y,T,D,C);
			} else {
				mod_(x,y);
				copy_(T,x);
				copy_(x,y);
				copy_(y,T);
			} 
		}
		if(y[0]==0)
			return;
		t=modInt(x,y[0]);
		copyInt_(x,y[0]);
		y[0]=t;
		while(y[0]) {
			x[0]%=y[0];
			t=x[0];
			x[0]=y[0];
			y[0]=t;
		}
	}

	function linComb_(x,y,a,b) {
		var i,c,k,kk;
		k=x.length<y.length?x.length:y.length;
		kk=x.length;
		for(c=0,i=0;i<k;i++) {
			c+=a*x[i]+b*y[i];
			x[i]=c&mask;
				c>>=bpe;
		}
		for(i=k;i<kk;i++) {
			c+=a*x[i];
			x[i]=c&mask;
			c>>=bpe;
		}
	}

	function sub_(x,y) {
		var i,c,k,kk;
		k=x.length<y.length?x.length:y.length;
		for(c=0,i=0;i<k;i++) {
			c+=x[i]-y[i];
			x[i]=c&mask;
			c>>=bpe;
		}
		for(i=k;c&&i<x.length;i++) {
			c+=x[i];
			x[i]=c&mask;
			c>>=bpe;
		}
	}

	function subShift_(x,y,ys) {
		var i,c,k,kk;
		k=x.length<ys+y.length?x.length:ys+y.length;
		kk=x.length;
		for(c=0,i=ys;i<k;i++) {
			c+=x[i]-y[i-ys];
			x[i]=c&mask;
			c>>=bpe;
		}
		for(i=k;c&&i<kk;i++) {
			c+=x[i];
			x[i]=c&mask;
			c>>=bpe;
		}
	}

	function trim(x,k) {
		var i,y;
		for(i=x.length;i>0&&!x[i-1];i--);
		y=new Array(i+k);
		copy_(y,x);
		return y;
	}

	this.mod = function(x,n) {
		var ans=dup(x);
		mod_(ans,n);
		return trim(ans,1);
	};

	this.mult = function(x,y) {
		var ans=expand(x,x.length+y.length);
		mult_(ans,y);
		return trim(ans,1);
	};

	function expand(x,n) {
		var ans=int2bigInt_(0,(x.length>n?x.length:n)*bpe,0);
		copy_(ans,x);
		return ans;
	}

	this.addInt = function(x,n) {
		var ans=expand(x,x.length+1);
		addInt_(ans,n);
		return trim(ans,1);
	};

	this.inverseMod = function(x,n) {
		var ans=expand(x,n.length); 
		var s;
		s=inverseMod_(ans,n);
		return s?trim(ans,1):null;
	};

	function inverseMod_(x,n) {
		var k=1+2*Math.max(x.length,n.length);
		if(!(x[0]&1)&&!(n[0]&1)) {
			copyInt_(x,0);
			return 0;
		}
		if(eg_u.length!=k) {
			eg_u=new Array(k);
			eg_v=new Array(k);
			eg_A=new Array(k);
			eg_B=new Array(k);
			eg_C=new Array(k);
			eg_D=new Array(k);
		}
		copy_(eg_u,x);
		copy_(eg_v,n);
		copyInt_(eg_A,1);
		copyInt_(eg_B,0);
		copyInt_(eg_C,0);
		copyInt_(eg_D,1);
		for(;;) {
			while(!(eg_u[0]&1)) {
				halve_(eg_u);
				if(!(eg_A[0]&1)&&!(eg_B[0]&1)) {
					halve_(eg_A);
					halve_(eg_B);	   
				} else {
					add_(eg_A,n);
					halve_(eg_A);
					sub_(eg_B,x);
					halve_(eg_B);
				}
			}
			while(!(eg_v[0]&1)) {
				halve_(eg_v);
				if(!(eg_C[0]&1)&&!(eg_D[0]&1)) {
					halve_(eg_C);
					halve_(eg_D);	   
				} else {
					add_(eg_C,n);
					halve_(eg_C);
					sub_(eg_D,x);
					halve_(eg_D);
				}
			}
			if(!greater_(eg_v,eg_u)) {
				sub_(eg_u,eg_v);
				sub_(eg_A,eg_C);
				sub_(eg_B,eg_D);
			} else {
				sub_(eg_v,eg_u);
				sub_(eg_C,eg_A);
				sub_(eg_D,eg_B);
			}
			if(equalsInt_(eg_u,0)) {
				if(negative(eg_C))
					add_(eg_C,n);
				copy_(x,eg_C);
				if(!equalsInt_(eg_v,1)) {
					copyInt_(x,0);
					return 0;
				}
				return 1;
			}
		}
	}

	function halve_(x) {
		var i;
		for(i=0;i<x.length-1;i++)
			x[i]=mask&((x[i+1]<<(bpe-1))|(x[i]>>1));
		x[i]=(x[i]>>1)|(x[i] & (radix>>1));
	}

	this.powMod = function(x,y,n) {
		var ans=expand(x,n.length);	 
		powMod_(ans,trim(y,2),trim(n,2),0);
		return trim(ans,1);
	};
		
	function addShift_(x,y,ys) {
		var i,c,k,kk;
		k=x.length<ys+y.length?x.length:ys+y.length;
		kk=x.length;
		for(c=0,i=ys;i<k;i++) {
			c+=x[i]+y[i-ys];
			x[i]=c&mask;
			c>>=bpe;
		}
		for(i=k;c&&i<kk;i++) {
			c+=x[i];
			x[i]=c&mask;
			c>>=bpe;
		}
	}

	//additional functions for conversions

	var digitsStr='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_=!@#$%^&*()[]{}|;:,.<>/?`~ \\\'\"+-';

	this.bigInt2str = function(x,base) {
		var i,t,s="";
		if(s6.length!=x.length) 
			s6=dup(x);
		else
			copy_(s6,x);
		if(base==-1) {
			for(i=x.length-1;i>0;i--)
				s+=x[i]+',';
			s+=x[0];
		} else {
			while(!isZero(s6)) {
				t=divInt_(s6,base);
				s=digitsStr.substring(t,t+1)+s;
			}
		}
		if(s.length==0)
			s="0";
		return s;
	};

	this.str2bigInt = function(s,base,minSize) {
		var d,i,j,x,y,kk;
		var k=s.length;
		if(base==-1) {
			x=new Array(0);
			for(;;) {
				y=new Array(x.length+1);
				for(i=0;i<x.length;i++)
					y[i+1]=x[i];
				y[0]=parseInt(s,10);
				x=y;
				d=s.indexOf(',',0);
				if(d<1) 
					break;
				s=s.substring(d+1);
				if(s.length==0)
					break;
			}
			if(x.length<minSize) {
				y=new Array(minSize);
				copy_(y,x);
				return y;
			}
			return x;
		}
		x=this.int2bigInt(0,base*k,0);
		for(i=0;i<k;i++) {
			d=digitsStr.indexOf(s.substring(i,i+1),0);
			if(base<=36&&d>=36)
				d-=26;
			if(d<base&&d>=0) {
				multInt_(x,base);
				addInt_(x,d);
			}
		}
		for(k=x.length;k>0&&!x[k-1];k--);
		k=minSize>k+1?minSize:k+1;
		y=new Array(k);
		kk=k<x.length?k:x.length;
		for(i=0;i<kk;i++)
			y[i]=x[i];
		for(;i<k;i++)
			y[i]=0;
		return y;
	};

	function divInt_(x,n) {
		var i,r=0,s;
		for(i=x.length-1;i>=0;i--) {
			s=r*radix+x[i];
			x[i]=Math.floor(s/n);
			r=s%n;
		}
		return r;
	}

	// additional functions for fastdecode

	this.add = function(x,y) {
		var ans=expand(x,(x.length>y.length?x.length+1:y.length+1)); 
		add_(ans,y);
		return trim(ans,1);
	};

	this.multMod = function(x,y,n) {
		var ans=expand(x,n.length);
		multMod_(ans,y,n);
		return trim(ans,1);
	};

	this.sub = function(x,y) {
		var ans=expand(x,(x.length>y.length?x.length+1:y.length+1)); 
		sub_(ans,y);
		return trim(ans,1);
	};
	
};

// public functions

Warp.Rsa.prototype.generatekeys = function() {
	var key = {};
	key.e = this.int2bigInt(65537,16,0);
    while(1) {
    	key.p = this.randTruePrime(this.b);
        if(!this.equalsInt(this.mod(key.p, key.e),1))
          break;
    }
    while(1) {
        key.q = this.randTruePrime(this.b);
        if(!this.equals(key.p, key.q) && !this.equalsInt(this.mod(key.q, key.e),1))
          break;
    }
    key.n = this.mult(key.p, key.q);
	var phi = this.mult(this.addInt(key.p, -1),this.addInt(key.q, -1));
	key.d = this.inverseMod(key.e, phi);
	return key;
};

Warp.Rsa.prototype.encode = function(hex, key) {
	return this.bigInt2str(this.powMod(this.str2bigInt(hex, 16, 0), key.e, key.n), 16);
};

Warp.Rsa.prototype.slowdecode = function(hex, key) {
	var hexEncodedString = this.bigInt2str(this.powMod(this.str2bigInt(hex, 16, 0), key.d, key.n), 16);
	var outputString = "";
	var i = 0;
	for(i=0;i<hexEncodedString.length;i+=2)
		outputString+=String.fromCharCode("0x"+hexEncodedString.substr(i,2));
	return outputString;
};

Warp.Rsa.prototype.fastdecode = function(hex, key) {
    var c = this.str2bigInt(hex, 16, 0);
    var p = key.p;
    var q = key.q;
	var P = this.powMod(this.mod(c, p), this.mod(key.d, this.addInt(p, -1)), p);
    var Q = this.powMod(this.mod(c, q), this.mod(key.d, this.addInt(q, -1)), q);
    var t;
    if(this.greater(P,Q)) {
      t=P; P=Q; Q=t;
      t=p; p=q; q=t;
    }
    var hexEncodedString = this.bigInt2str(this.add(this.mult(this.multMod(this.sub(Q, P), this.inverseMod(p, q), q), p), P), 16);
    var outputString = "";
    var i = 0;
	for(i=0;i<hexEncodedString.length;i+=2)
		outputString+=String.fromCharCode("0x"+hexEncodedString.substr(i,2));
	return outputString;
};


if (!window.jQuery) { window.jQuery = {}; if(!window.$) window.$ = window.jQuery; }

Warp.notifications = {};	
Warp.notifications.showMessage = function(content){};
Warp.notifications.setStatus = function(content, buttons){};
Warp.notifications.showButtons = function(){};
Warp.notifications.clear = function(){};
Warp.notifications.defaultView = function(){};
Warp.notifications.addButton = function(button, callback, tooltip){};
Warp.notifications._addButton = function(title, icon, style, tooltip, onclick, id){};
Warp.notifications.sticky = function(b){};
Warp.notifications.setTimer = function(t){};
Warp.notifications.minify = function(manual){};
Warp.notifications.maximize = function(cb){};
Warp.notifications.hide = function(){};
Warp.notifications.show = function(){};
Warp.notifications.setViewRect = function(){};
Warp.notifications.toggle = function(){};

Warp.addEventListener("load", _loadStageComplete);

Warp.Status = function() {
	var state = this.states[0];
	var user = "Unknown User";
	var gateway = "Unknown Gateway";
	
	this.getState = function() { return state; };
	this.getUser = function() { return user; };
	this.getGateway = function() { return gateway; };
	
	this.setState = function(newState) {  };
	this.setUser = function(newVal) { };
	this.setGateway = function(newVal) {  };
};

Warp.Status.prototype.states = {};
Warp.Status.prototype.states.Disconnected = 0;
Warp.Status.prototype.states.Connecting = 1;
Warp.Status.prototype.states.Connected = 2;
Warp.Status.prototype.states.Disconnecting = 3;
Warp.Status.prototype.states.Error = 4;
Warp.Status.prototype.update = function() {};

Warp.status = new Warp.Status();

Warp.LoginView = function(formname){};
Warp.LoginView.prototype.show = function(){throw "Invalid credentials supplied (guid or secret is undefined) when using headless mode. Ensure GUID is a valid Warp URI, and that secret is supplied.";};
Warp.LoginView.prototype.keys = {};
Warp.LoginView.prototype.keys.authType = "Warp.LoginView.keys.AuthType";
Warp.LoginView.prototype.loginStart = function(){};
Warp.LoginView.prototype.loginError = function(t){throw "Wrong Credentials Error not handled. Ensure your application has an event listener on the 'wrongcredentials' event.";};
Warp.LoginView.prototype.hide = function(){};
Warp.LoginView.authTypes = new Array();
Warp.LoginView.prototype.update = function(e){};

Warp.LoginView.prototype.getGuid = function()
{
	return Warp.application.guid;
};

Warp.LoginView.prototype.getSecret = function()
{
	return Warp.application.secret;
};Warp.authorizationManager = {};

Warp.resourceManager = {};

Warp.warpManager = {}; 

function _loadStageComplete()
{
	
    /*
	if (typeof(Warp.warpManager_numTasks) == "undefined")
		Warp.warpManager_numTasks = 3;
	
	Warp.warpManager_numTasks--;
    console.log("Tasks...", Warp.warpManager_numTasks);
	
	if (Warp.warpManager_numTasks > 0)
		return;
	
	delete Warp.warpManager_numTasks;
    */
	
	Warp.loginView = new Warp.LoginView("dialog-form");
    //Warp.loginView = {};
	
	// Update state display(s)
	Warp.status.update();
	Warp.notifications.defaultView(true);
	
	Warp.loginView.onlogin = Warp.warpManager.connect;
	
    Warp.securityManager.configureKey(Warp.config.key, function(key) { 
		Warp.config.key = key; 
		if (!Warp.config.key.secure) // Don't overwrite a key's security setting if it is there
			Warp.config.key.secure = Warp.config.securekey;
		//jQuery.jStorage.set("warp-client-key", Warp.config.key);
		//_loadStageComplete();
	});	
	
	if (self.wb || Warp.warpManager.hasCredentials())
		Warp.warpManager.connect();
	else
		Warp.warpManager.login();
	
	_loadStageComplete = function() { Warp.warn("Subsequent loadStageComplete!!!"); }; // Disable myself.
}

Warp.warpManager.configureApplication = function(application) {
	Warp.application = application;
	Warp.log("Configured application:", application);
	_dispatchEvent({ type : "clientconnected", client : { Warp : { warpManager : Warp.warpManager } } });
	if(Warp.warpManager.name != Warp.application.resource && Warp.application.resource != null)
		Warp.warpManagerManager.reregisterWarpManager(Warp.warpManager.name, Warp.application.resource);
	_loadStageComplete();
};

var _luid, _guid, _sendOnConnect;
var _warpReadySent = false;

Warp.warpManager.notifyRegistered = function(name) {
	Warp.warpManager.name = name;
	if(Warp.application && Warp.application.resource && Warp.application.resource != null && Warp.application.resource != "null" && Warp.application.resource != name)
		Warp.warpManagerManager.reregisterWarpManager(name, Warp.application.resource);
	else
	{
		
		var rsFun = function()
		{

			if (!Warp.applicationManager)
			{
				setTimeout(rsFun, 25);
				return;
			}
			
			if (_warpReadySent === true)
				return;

			_warpReadySent = true;
				
			Warp.applicationManager.notifyWarpReady();

			if (_sendOnConnect)
			{
				try { Warp.loginView.hide(); } catch(e) {};
				ocFun(name, _luid, _guid, Warp.config.uaid);
				Warp.status.setState(Warp.status.states.Connected);
			}
		}

		setTimeout(rsFun, 0);
	}
};

Warp.addEventListener("load", function() {
    var storedKey;
	//var storedKey = jQuery.jStorage.get("warp-client-key");
	// debug_requireNewKey will not always work I guess... It would need to be included as part of config? Or maybe secure && debug implies requireNewKey?
	if (!!storedKey && (storedKey.secure || !Warp.config.securekey) && (!Warp.application || !Warp.application.debug_requireNewKey))
	{
		Warp.log("Using stored key. Stored key is secure:", storedKey.secure, ", and the security setting is:", Warp.config.securekey);
		Warp.config.key = storedKey;
	}
	else
		Warp.log("Skipping to use configured key.");

	Warp.securityManager.configureKey(Warp.config.key, function(key) { 
		Warp.config.key = key; 
		if (!Warp.config.key.secure) // Don't overwrite a key's security setting if it is there
			Warp.config.key.secure = Warp.config.securekey;
		//jQuery.jStorage.set("warp-client-key", Warp.config.key);
		_loadStageComplete();
	});	
	
	var ctrl=false, shift=false;
	self.onkeydown = function(e) {
		
		if (!e && self.event)
			e = self.event;
		
		if (!e)
		{
			Warp.warn("Received event onkeydown but couldn't find event object")
			return;
		}
		if (e.keyCode==17)
			ctrl=true;
		else if (e.keyCode==16)
			shift=true;
		else if (e.keyCode == 89 && shift && ctrl)
		{
			Warp.notifications.toggle();
			return false;
		}
	};
	self.onkeyup = function(e) {
		
		if (!e && self.event)
			e = self.event;
		
		if (!e)
		{
			Warp.warn("Received event onkeydown but couldn't find event object")
			return;
		}
		if (e.keyCode==17)
			ctrl=false;
		else if (e.keyCode==16)
			shift=false;
	};
	
	Warp.addEventListener("loginerror", Warp.warpManager.notifyLoginError);
	Warp.warpManager.setViewRect("notifications", {top:0, right:0}, {width:"100%", height:"24"});
});

Warp.warpManager.hasCredentials = function() {
	return new Warp.URI(Warp.loginView.getGuid()).valid() && 
	       typeof(Warp.loginView.getSecret()) == "string" &&
	       Warp.loginView.getSecret().length >= 2;
};

Warp.warpManager.login = function() {
	Warp.notifications.hide();
    Warp.loginView.show();
};

Warp.warpManager.logout = function() {
	Warp.warpManager.disconnect();
	Warp.warpManager.login();
};

Warp.warpManager.connect = function() {
	Warp.loginView.hide();
	Warp.status.setUser(Warp.loginView.getGuid());
	Warp.status.setGateway("Ericsson Labs Gateway");
	Warp.notifications.show();
	Warp.connectionManager.login(Warp.loginView.getGuid(), Warp.loginView.getSecret(), Warp.config.key["public"]);
};

Warp.warpManager.disconnect = function() {
	Warp.status.setState(Warp.status.states.Disconnecting);
	Warp.connectionManager.close();
	//setTimeout(Warp.warpManager.notifyDisconnected, 1000);
};

Warp.warpManager.notifyConnected = function(luid, guid, uaid) {
	Warp.config.luid = _luid = luid; Warp.config.guid = _guid = guid;
	Warp.config.uaid = uaid;
	// Remove the login view
	_sendOnConnect = true;
	try { Warp.loginView.hide(); } catch(e) {};
	Warp.status.setState(Warp.status.states.Connected);
	
	if (_warpReadySent === true)
		ocFun(Warp.warpManager.name, luid, guid, uaid);
};

var ocFun = function()
{
	var args = arguments;
	if (!Warp.rootResource)
	{
		Warp.log("Deferring logon message until Warp.rootResource is defined...");
		setTimeout(function(){ocFun.apply(ocFun, args);}, 25);
	}
	else
		Warp.rootResource._onConnect.apply(Warp.rootResource, args);
}

	
Warp.warpManager.notifyDisconnected = function(status, statusText) {
	Warp.status.setState(Warp.status.states.Disconnected);
	Warp.rootResource._onDisconnect(status, statusText);
};

Warp.warpManager.notifyConnecting = function()
{
	Warp.status.setState(Warp.status.states.Connecting);
}

Warp.warpManager.notifyDisconnecting = function()
{
	Warp.status.setState(Warp.status.states.Disconnecting);
}

Warp.warpManager.notifyError = function(evt) {
	Warp.applicationManager.notifyError(evt, function()
	{
		if (evt.type == "wrongcredentials")
		{
			Warp.status.setState(Warp.status.states.Disconnected);
			Warp.loginView.show();
			Warp.loginView.loginError(evt.message);
		}
		else
		{
			Warp.notifications.showMessage("An error occurred: " + evt.message);
			Warp.notifications.addButton(Warp.notifications.buttons["dismiss"], function() { Warp.notifications.defaultView(); });
			Warp.error(evt);
		}
	});
};

Warp.warpManager.notifyLoginError = function(message) {
	Warp.status.state = Warp.status.states.Error;
	Warp.notifications.clear();
	Warp.notifications.showMessage("Wrong username and/or password");
	Warp.notifications.addButton(Warp.notifications.buttons.login, Warp.warpManager.login);
	Warp.warpManager.login();
};

Warp.warpManager.dispatchMessage = function(message, resourcePath) {
	Warp.rootResource._dispatch(message, resourcePath);
};

Warp.warpManager.decrypt = function(encrypted, cb) {
	Warp.securityManager.decryptWithPrivateKey(encrypted, Warp.config.key,
		function(decrypted) {
			cb(decrypted);
		}
	);
};


// View Controls
/**
 * Sets the geometry required for a certain object (sender). This will cause the 
 * Warp Manager to calculate the visible area required to display all the
 * contents, and ask the iFrame to resize itself to fit.
 * 
 * Generally, the view rect will be set by the Notifications view to the size of the current
 * notification, as well as the login, help and error screens to 100%.
 */
Warp.warpManager.windowSize = 
{
	width: 640, height: 480
};
Warp.warpManager.viewRects = {};
Warp.warpManager.setViewRect = function(sender, origin, size)
{
	Warp.warpManager.viewRects[sender] = {origin:origin, size:size};
	Warp.warpManager.updateViewRect();
};
Warp.warpManager.removeViewRect = function(sender)
{
	delete Warp.warpManager.viewRects[sender];
	Warp.warpManager.updateViewRect();
}

Warp.warpManager.setWindowSize = function(width, height)
{
	Warp.warpManager.windowSize.width = width;
	Warp.warpManager.windowSize.height = height;
	Warp.warpManager.updateViewRect();
};

Warp.warpManager.updateViewRect = function()
{
	if (!Warp.applicationManager)
		return;
	
	if (Warp.config.headless === true)
		return; // With no UI, leave the iFrame as 0px, 0px, hidden.
	
	var finalRect = null;
	
	// Recalculate the view rect
	for (var key in Warp.warpManager.viewRects)
	{
		if (typeof(key) != "string")
			continue;
		
		var viewRect = Warp.warpManager.viewRects[key];
		
		var normalisedRect = {origin:{top:0, left:0}, size: {width:0, height:0}};
		
		// Calculate the height of this view rect.
		if (typeof(viewRect.origin.top) != "undefined" && typeof(viewRect.origin.bottom) != "undefined")
		{
			// This viewRect is defined as the difference between the top and bottom origins.
			normalisedRect.origin.top = viewRect.origin.top;
			normalisedRect.size.height = Warp.warpManager.windowSize.height - viewRect.origin.top - viewRect.origin.bottom;
		}
		else if (viewRect.size.height)
		{
			
			// Calculate the origin
			normalisedRect.size.height = viewRect.size.height;
			
			// Calcualte relative heights to absolute.
			if (_isRelativeSize(normalisedRect.size.height))
			{
				normalisedRect.size.height = normalisedRect.size.height.substring(0, normalisedRect.size.height.length-1);
				normalisedRect.size.height = normalisedRect.size.height*0.01*Warp.warpManager.windowSize.height;
			}
			
			if (typeof(viewRect.origin.bottom) != "undefined")
			{
				// Defined as height going upwards from the bottom
				// So rewrite the origin as windowHeight - height
				normalisedRect.origin.top = Warp.warpManager.windowSize.height - normalisedRect.size.height - viewRect.origin.bottom;
			}
			else
			{
				normalisedRect.origin.top = viewRect.origin.top;
			}
		}
		
		// Calculate the width, using the same logic as the height but with different names. HELLO COPY PASTE
		if (typeof(viewRect.origin.left) != "undefined" && typeof(viewRect.origin.right) != "undefined")
		{
			// This viewRect is defined as the difference between the top and bottom origins.
			normalisedRect.origin.left = viewRect.origin.left;
			normalisedRect.size.width = Warp.warpManager.windowSize.width - viewRect.origin.left - viewRect.origin.right;
		}
		else if (viewRect.size.width)
		{
			
			// Calculate the origin
			normalisedRect.size.width = viewRect.size.width;
			
			// Calcualte relative width to absolute.
			if (_isRelativeSize(normalisedRect.size.width))
			{
				normalisedRect.size.width = normalisedRect.size.width.substring(0, normalisedRect.size.width.length-1)*0.01*Warp.warpManager.windowSize.width;
			}
			
			if (typeof(viewRect.origin.right) != "undefined")
			{
				// Defined as height going leftwards from the right
				// So rewrite the origin as windowWidth - width
				normalisedRect.origin.left = Warp.warpManager.windowSize.width - normalisedRect.size.width - viewRect.origin.right;
			}
			else
			{
				normalisedRect.origin.left = viewRect.origin.left;
			}
		}
		
		// After producing a normalisedRect, we need to resize the finalRect to fit.
		if (finalRect == null)
		{
			// This is the first iteration. Save our rect as the final rect.
			finalRect = normalisedRect;
		}
		
		// Change the top parameter only if we need a smaller top.
		if (normalisedRect.origin.top < finalRect.origin.top)
		{
			// Resize it upwards, and change the finalHeight to match.
			finalRect.size.height += finalRect.origin.top - normalisedRect.origin.top;
			finalRect.origin.top = normalisedRect.origin.top;
		}
		else if (normalisedRect.origin.top > finalRect.origin.top)
		{
			// Recalculate the normalised rect height value so it represents the height needed to
			// go from finalRect.origin.top to the bottom of the area represented by normalisedRect.
			normalisedRect.size.height += normalisedRect.origin.top - finalRect.origin.top;
		}
		
		// Now change the left parameter...
		if (normalisedRect.origin.left < finalRect.origin.left)
		{
			finalRect.size.width += finalRect.origin.left - normalisedRect.origin.left;
			finalRect.origin.left = normalisedRect.origin.left;
		}
		else if (normalisedRect.origin.left > finalRect.origin.left)
		{
			normalisedRect.size.width += normalisedRect.origin.left - finalRect.origin.left;
		}
		
		// Now adjust the width and height as applicable
		if (normalisedRect.size.height > finalRect.size.height)
			finalRect.size.height = normalisedRect.size.height;
		
		if (normalisedRect.size.width > finalRect.size.width)
			finalRect.size.width = normalisedRect.size.width;
		
	}
	
	if (finalRect)
		Warp.applicationManager.setIframeSize(finalRect.origin.top, finalRect.origin.left, finalRect.size.width, finalRect.size.height);
	else
		Warp.applicationManager.setIframeSize(0, 0, 0, 0); // Effectively? Hide.
};

function _isRelativeSize(string)
{
	if (typeof(string) != "string")
		return false;
	return _endsWith(string, "%");
};

function _endsWith(haystack, needle)
{
	return (haystack.match(needle+"$")==needle);
};

Warp.securityManager = {};

Warp.securityManager.rsa = new Warp.Rsa(512);

Warp.securityManager.configureKey = function(key, cb) {
	if (key && key.configured)
	{
		cb(key);
		return;
	}
	if (key && key.d && key.e && key.n && key.p && key.q) {
		key.d = this.rsa.str2bigInt(key.d, 16, 0);
		key.e = this.rsa.str2bigInt(key.e, 16, 0);
		key.n = this.rsa.str2bigInt(key.n, 16, 0);
		key.p = this.rsa.str2bigInt(key.p, 16, 0);
		key.q = this.rsa.str2bigInt(key.q, 16, 0);
	} else
		key = this.rsa.generatekeys();
	key["private"] = { "modulus" : this.rsa.bigInt2str(key.n, 16), "exponent" : this.rsa.bigInt2str(key.d, 16) };
	key["public"] = { "modulus" : this.rsa.bigInt2str(key.n, 16), "exponent" : this.rsa.bigInt2str(key.e, 16) };
	key.configured = true;
	Warp.log("Configured key:", key);
	cb(key);
};

Warp.securityManager.decryptWithPrivateKey = function(encrypted, key, cb) {
	cb(this.rsa.fastdecode(encrypted, key));
};

Warp.connectionManager = {};

// Use binary mode transfers for better performance
//Trap.useBinary = true;

if (!self.Trap)
	self.Trap = {};

self.Trap.useBinary = typeof(ArrayBuffer) != "undefined" && Warp.config.binary;

Warp.connectionManager.login = function(guid, password, publicKey) {
	
	if (!guid || !password || !publicKey || !publicKey.modulus || !publicKey.exponent)
	{
		Warp.error("login() called with invalid input data...");
		return;
	}
	
	/*
	 * If the connectionManager is not connected, creating a new connectionManager is a trivial decision. Do it.
	 */
	if (!Warp.connectionManager.instance || Warp.connectionManager.instance._state == -1 || Warp.connectionManager.instance._state >= 3)
	{
		//Warp.log("Creating new WCM as the previous one was not available/connected");
		Warp.connectionManager.instance = new Warp.ConnectionManager(guid, password, publicKey);
		return;
	}

	
	/*
	 * If the connectionManager is in the process of connecting/connected, creating a new one isn't that simple.
	 * We need to consider whether any of the data has changed
	 */
	
	if (   Warp.connectionManager.instance.getGuid() != guid 
        || Warp.connectionManager.instance.getPassword() != password
		|| Warp.connectionManager.instance.getPublicKey().modulus != publicKey.modulus
		|| Warp.connectionManager.instance.getPublicKey().exponent != publicKey.exponent)
	{
		// Close the old instance, freeing up Gateway resources
		Warp.connectionManager.instance.close();
		Warp.connectionManager.instance._state = 4; // Prevent dispatching of messages.
		//Warp.log("Creating new WCM due to changed input value(s)");
		Warp.connectionManager.instance = new Warp.ConnectionManager(guid, password, publicKey);
		return;
	}
};

Warp.connectionManager.send = function() { Warp.connectionManager.instance.send.apply(Warp.connectionManager.instance, arguments); };
Warp.connectionManager.close = function() { Warp.connectionManager.instance.close.apply(Warp.connectionManager.instance, arguments); };

Warp.ConnectionManager = function(guid, password, publicKey) {

	this._luid = null;
	this._state = -1; // -1 - disconnected, 0 - connecting, 1 - unauthorized, 2 - authorized, 3 - disconnecting, 4 - cancelled, 5 - error

	this.getGuid = function() {
		return guid;
	};
	
	this.getPassword = function() {
		return password;
	};
	
	this.getPublicKey = function() {
		return publicKey;
	};
	
	var mythis = this;
	
	Warp.warpManagerManager.onregister = function(warpManager) {
		mythis.registerWarpManager(warpManager);
	};
	
	Warp.warpManagerManager.onunregister = function(warpManager) {
		mythis.unregisterWarpManager(warpManager);
	};
	
	//if(!Warp.warpManagerManager._warpManagers.empty()) {
    //    console.log("opening...");
		this.open();
    //}

};

Warp.ConnectionManager.prototype.onconnect = function() {};
Warp.ConnectionManager.prototype.ondisconnect = function() {};
Warp.ConnectionManager.prototype.onwrongcredentials = function(evt) 
{
	for(var rr in Warp.warpManagerManager._warpManagers) {
		var warpManager = Warp.warpManagerManager._warpManagers[rr];
		if (isWarpManager(warpManager))
			warpManager.notifyError(evt);
	}	
};

Warp.ConnectionManager.prototype.notifyConnect = function() {
	this.onconnect({"type":"connect"});
	for(var rr in Warp.warpManagerManager._warpManagers)
	{
		var wm = Warp.warpManagerManager._warpManagers[rr];
		if (isWarpManager(wm))
			wm.notifyConnected(this._luid, this.getGuid(), this._uaid);
	}
};

Warp.ConnectionManager.prototype.notifyDisconnect = function(status, statusText) {
	if (this._state == -1)
		return;
	if (this._state >= 4)
	{
		// CM cancelled or in error state. Do not notify disconnect; another notification has taken care of it.
		return; 
	}
//	if (this._state == 0) {
//		this._state = 4;
//		return;
//	}
	
	this._state = -1;
	this.ondisconnect({"type":"disconnect"});
	for(var rr in Warp.warpManagerManager._warpManagers) {
		var warpManager = Warp.warpManagerManager._warpManagers[rr];
		if (isWarpManager(warpManager))
			warpManager.notifyDisconnected(status, statusText);
	}
};

Warp.ConnectionManager.prototype.computeChallengeResponse = function(response, request) {
	var challenge = response.getHeader(Warp.Message.HeaderName.HTTPAuthenticate);
	if(!challenge)
		return "Did not receive any challenge";

	if(challenge.search(/(\s)*PLAINTEXT(\s)+/)==0)
		return "PLAINTEXT " + this.getPassword();
	else
		if(challenge.search(/(\s)*Digest(\s)+/)==0) {
			var httpDigest = new Warp.HTTPDigest();
			var uri = request.getTo();
			httpDigest.setChallenge(challenge);
			httpDigest.setCredentials(this.getGuid(), this.getPassword());
			return httpDigest.computeResponse("POST", uri, request.getData());
		}
};

Warp.ConnectionManager.prototype.dispatchMessage = function(message) {
	var to = message.getTo();
	if(to && to.indexOf(this._luid)==0) {
		to = to.substring(this._luid.length);
		var pos = to.indexOf("?");
		if(pos>0)
			to = to.substring(0, pos);
		if(to.indexOf("/")==0) {
			var pos2 = to.indexOf("/", 1);
			var rootResourcePath = to.substring(1, (pos2!=-1?pos2:to.length));
			var warpManager = Warp.warpManagerManager._warpManagers[rootResourcePath];
			if(isWarpManager(warpManager)) {
				var resourcePath = (pos2!=-1?to.substring(pos2+1, to.length):""); // Fix to allow the root resource to receive messages (wtf??)
				warpManager.dispatchMessage(message, resourcePath);
				return;
			}
		}
	}
	Warp.warn("Cannot dispatch the message to ["+to+"]");
};

Warp.ConnectionManager.prototype.receive = function(message) {
	switch(this._state) {
	case 0:
	case 1:
		if(message.getFrom() && message.getFrom().toLowerCase() == this.getGuid().toLowerCase()) {
			var statusCode = message.getStatusCode();
			if(statusCode == 401) {
				if(this._state==0) {
					this._luid = message.getTo();
					var response = message;
					Warp.log("Registered as ["+this._luid+"]");
					message = new Warp.Message();
					message.setMethod("REGISTER");
					message.setFrom(this._luid);
					message.setTo(this.getGuid());
					message.setHeader(Warp.Message.HeaderName.HTTPAuthorization, this.computeChallengeResponse(response, message));
					message._data = this.getPublicKey().modulus + "\n" + this.getPublicKey().exponent;
					this._state = 1;
					this.ep.send(message.toString());
					break;
				}
			} else
				if(statusCode == 200) {
					
					if (!this._luid)
					{
						this._luid = message.getTo();
						Warp.log("Registered as ["+this._luid+"]");
					}
					this._state = 2;
					this._uaid = message.getHeader(Warp.Message.HeaderName.Uaid);
					Warp.log("Authenticated as ["+this.getGuid()+"]");
					Warp.log("Uaid is ["+this._uaid+"]");
					this.notifyConnect();
					break;
				} else
					Warp.warn("Unexpected status code "+statusCode);
		}
		var reason = message._data;
		var reasonLength = message.getHeader(Warp.Message.HeaderName.ReasonLength);
		if(reasonLength && reasonLength > 0)
			reason = " " + reason.substring(0, reasonLength);
		else
			reason = "";
		this._state = 5;
		Warp.error("Failed to register or authenticate as ["+this.getGuid()+"] ("+message.getStatusCode()+reason+")");
		this.onwrongcredentials({"type":"wrongcredentials", "guid" : this.getGuid(), "message" : "Failed to register or authenticate as ["+this.getGuid()+"]"});
		return;
	case 2:
		this.dispatchMessage(message);
		break;
	case 4:
		Warp.warn("//TODO: handle cancelled");
		//TODO: handle cancelled
		this._state = -1;
		break;
	}
};

Warp.ConnectionManager.prototype.open = function() {
	if (this._state != -1)
		return;
	for(var rr in Warp.warpManagerManager._warpManagers) {
		var warpManager = Warp.warpManagerManager._warpManagers[rr];
		if (isWarpManager(warpManager))
			warpManager.notifyConnecting();
	}	
	this._state = 0;
	
	var mt = this;
	
	this.ep = new Trap.ClientEndpoint(Warp.config.trap);
	this.ep.onopen = function()
	{
		mt._connect();
	}
	this.ep.onclose = function()
	{
		mt.notifyDisconnect(410, "Disconnected underlying Trap connection");
	}
	this.ep.onerror = function()
	{
		mt.notifyDisconnect(400, "Error on underlying Trap connection");
	}
	
	this.ep.onmessage = function(evt)
	{
		mt.receive(Warp.Message.fromString(evt.data)); 
	}
	
};

Warp.ConnectionManager.prototype._connect = function() {
	var message = new Warp.Message();
	message.setMethod("REGISTER");
	if (this._state != 2)
		message.setTo(this.getGuid());
	else
		message.setTo(this._luid);
	message.setData(this.getPublicKey().modulus + "\n" + this.getPublicKey().exponent);
	this.ep.send(message.toString());
};

Warp.ConnectionManager.prototype.send = function(msg) {
	var message = new Warp.Message();
	message.setData(msg._data); // This is RPC'd most likely, over which the getters and setters will die. So use the actual storage field _data
	message.setHeaders(msg._headers);
	var to = message.getTo();
	if(to) {
		// Check if ToURI starts with /. If so, just loop locally
		if (to.charAt(0) == "/") {
			message.setTo(this._luid + to);
			this.dispatchMessage(message);
		} 
		else
		{
			if (message.getFrom() != null && !message.getFrom().startsWith("warp://"))
				message.setFrom(this._luid + message.getFrom());
			this.ep.send(message.toString());
		}
	} else 
		Warp.error("Header "+Warp.Message.HeaderName.To+" is not set");
};

Warp.ConnectionManager.prototype.close = function() {
	if (this._state == 2) {
		message = new Warp.Message();
		message.setMethod("DELETE");
		message.setFrom(this._luid);
		message.setTo(this._luid);
		this.send(message);
		
		for(var rr in Warp.warpManagerManager._warpManagers) {
			var warpManager = Warp.warpManagerManager._warpManagers[rr];
			if (isWarpManager(warpManager))
				warpManager.notifyDisconnecting();
		}	
	} else
		Warp.error("Asked to close when not open yet... results unknown");
	this._state = 3;
};
 
Warp.ConnectionManager.prototype.registerWarpManager = function(warpManager) {
	if (this._state == 3)
		return;
	if(!Warp.warpManagerManager._warpManagers.empty())
		this.open();
	
	var mt = this;
	if(this._state == 2)
		setTimeout(function() { warpManager.notifyConnected(mt._luid, mt.getGuid(), mt._uaid); }, 1);
};

Warp.ConnectionManager.prototype.unregisterWarpManager = function(warpManager) {
	Warp.log("Unregistered Warp Manager");
	warpManager.notifyDisconnected(410, "Gone");
	if(Warp.warpManagerManager._warpManagers.empty())
		this.close();
};

Warp.warpManagerManager = {
	_warpManagers : {
		empty : function() {
			for(var p in this)
			{
				if(isWarpManager(this[p]))
				{
					return false;
				}
			}
			return true;
		}
	},
	onregister : function(warpManager) {},
	onunregister : function(warpManager) {}
};

Warp.addEventListener("clientconnected", function(evt) {
	Warp.warpManagerManager.registerWarpManager(evt.client.Warp.warpManager);
});

Warp.addEventListener("clientdisconnected", function(evt) {
	try
	{
		Warp.log("Disconnected event for: " + evt.client.Warp.warpManager.name);
		Warp.warpManagerManager.unregisterWarpManager(evt.client.Warp.warpManager.name);
	}
	catch(e)
	{
		Warp.error(e);
	}
});

Warp.warpManagerManager.reregisterWarpManager = function(oldName, newName) {
	var old = Warp.warpManagerManager._warpManagers[oldName];
	if(old) {
		if(Warp.warpManagerManager._warpManagers[newName]) {
			// FIXME: Define more error reasons.
			old.notifyError({type: "error", message: "ERROR: Root resource ["+newName+"] already exists", reason:"ROOT_RESOURCE_ALREADY_EXISTS"});
			return;
		}
		Warp.warpManagerManager._warpManagers[newName] = old;
		delete Warp.warpManagerManager._warpManagers[oldName];
		Warp.log("Reregistered root resource ["+oldName+"] as ["+newName+"]");
		old.name = newName;
		old.notifyRegistered(newName);
	}
};

Warp.warpManagerManager.registerWarpManager = function(warpManager) {
	var path;
	do {
		path = uuid();
	} while(this._warpManagers[path]);
	warpManager.name = path;
	this._warpManagers[path] = warpManager;
	Warp.log("Registered root resource as ["+path+"]");
	warpManager.notifyRegistered(path);
	this.onregister(warpManager);
};

Warp.warpManagerManager.unregisterWarpManager = function(path) {
	if(!isWarpManager(this._warpManagers[path])) {
		Warp.warn("Root resource ["+path+"] does not exist");
		return;
	}
	var warpManager = this._warpManagers[path];
	delete this._warpManagers[path];
	Warp.log("Unregistered root resource ["+path+"]");
	this.onunregister(warpManager);
};

Warp.warpManagerManager.getAnyWarpManager = function()
{
	for (var name in this._warpManagers)
		if(isWarpManager(this._warpManagers[name]))
			return this._warpManagers[name];
};

function isWarpManager(manager)
{
	return typeof(manager) == "object" && typeof(manager.notifyRegistered) == "function";
}

if (!self.Trap)
	Trap = {};

// Array of classes for Trap Transports
Trap.Transports = {};
if (Trap.useBinary)
{
	Trap.ByteArrayOutputStream = function(initialLength)
	{
		// Set an initial length of the array, unless otherwise specified
		if (typeof(initialLength) != "number" || initialLength < 0)
			initialLength = 512;
		
		this.buf = new Uint8Array(initialLength);
		this.off = 0;
		this.size = initialLength;
		this.growthSize = 512;
	};
	
	Trap.ByteArrayOutputStream.prototype._remaining = function()
	{
		return this.size - this.off;
	}
	
	Trap.ByteArrayOutputStream.prototype._resize = function(newSize)
	{
		var copySize = Math.min(newSize, this.off);
		var newBuf = new Uint8Array(newSize);
		
		var src = (copySize < this.buf.length ? this.buf.subarray(0, copySize) : this.buf);
		newBuf.set(src, 0);
		this.buf = newBuf;
	}
	
	Trap.ByteArrayOutputStream.prototype._checkAndResize = function(neededBytes)
	{
		if (this._remaining() < neededBytes)
			this._resize(this.size + Math.max(neededBytes, this.growthSize));
	}
	
	Trap.ByteArrayOutputStream.prototype.write = function(src, off, len)
	{
		if (typeof(src) == "number")
		{
			this._checkAndResize(1);
			this.buf[this.off++] = src;
			return;
		}
		
		if (typeof(off) != "number")
			off = 0;
		
		if (typeof(len) != "number")
			len = (src.byteLength ? src.byteLength : src.length);
		
		this._checkAndResize(len - off);
		
		if (typeof(src) == "string")
		{
			for (var i=off; i<off+len; i++)
				this.buf[this.off++] = src[i].charCodeAt(0);
			
			return;
		}

		if (typeof(src.length) == "number" && src.slice)
		{
			for (var i=off; i<off+len; i++)
				this.buf[this.off++] = src[i];
			
			return;
		}
		
		if (typeof(src.byteLength) == "number")
		{
			
			if (src.byteLength == 0)
				return;
			
			var buf = (src.buffer ? src.buffer : src);
			var view = new Uint8Array(buf, off, len);
			this.buf.set(view, this.off);
			this.off += len;
			return;
		}
		
		throw "Cannot serialise: " + typeof(src);
	}

	Trap.ByteArrayOutputStream.prototype.toString = function()
	{
		var str = "";
		for (var i=0; i<this.buf.length; i++)
			str += this.buf[i];
		return String.utf8Decode(str);
	};

	Trap.ByteArrayOutputStream.prototype.toArray = function()
	{
		return new Uint8Array(this.buf.buffer.slice(0, this.off));
	};
}
else
{
	Trap.ByteArrayOutputStream = function()
	{
		this.buf = "";
	};

	// Append the contents of the write operation in compact mode.
	// Assume the input is byte-equivalent
	Trap.ByteArrayOutputStream.prototype.write = function(str, off, len)
	{
		
		if (typeof(str) == "number")
		{
			this.buf += String.fromCharCode(str);
			return;
		}
		
		if (typeof(off) != "number")
			off = 0;
		
		if (typeof(len) != "number")
			len = str.length;

		if (typeof(str) == "string")
			this.buf += str.substr(0, len);
		else if (typeof(str.length) == "number" && str.slice)
			for (var i=off; i<off+len; i++)
				this.buf += String.fromCharCode(str[i]);
		else
			throw "Cannot serialise: " + typeof(str);
	};

	Trap.ByteArrayOutputStream.prototype.toString = function()
	{
		return this.buf;
	};

	Trap.ByteArrayOutputStream.prototype.toArray = function()
	{
		var arr = [];
		for (var i=0; i<this.buf.length; i++)
			arr[i] = this.buf[i].charCodeAt(0);
		return arr;
	};
}
if (!Trap._compat)
	Trap._compat = {};

Trap._compat.capitalise = function(str)
{
	return str.substr(0,1).toUpperCase() + str.substr(1);
};

Trap._compat.__defineSetter = function(object, setterName, cb)
{
	
	var newName = "set" + Trap._compat.capitalise(setterName);
	
	if (object.__defineSetter__)
	{
		try
		{
			object.__defineSetter__(setterName, function()
			{
				return cb.apply(object, arguments);
			});
		} catch(e){}
	}

	// Also create the getter function as a property of the object
	object[newName] = cb;
};

Trap._compat.__defineGetter = function(object, getterName, cb)
{
	
	var newName = "get" + Trap._compat.capitalise(getterName);
	
	if (object.__defineGetter__)
	{
		try
		{
			object.__defineGetter__(getterName, function()
			{
				return cb.apply(object, arguments);
			});
		} catch(e){}
	}
	
	// Also create the getter function as a property of the object
	object[newName] = cb;
};

Trap._compat.__defineGetterSetter = function(object, publicName, privateName, getter, setter)
{
	if (!privateName)
		privateName = "_" + publicName;
	
	if (!getter)
	{
		getter = function() {
			return object[privateName];
		};
	}
	
	if (!setter)
	{
		var setter = function(val) {
			object[privateName] = val;
			return this;
		};
	}

	Trap._compat.__defineSetter(object, publicName, setter);
	Trap._compat.__defineGetter(object, publicName, getter);
};

Trap._compat.__addEventListener = function(object, event, listener)
{
	
	function ie() { object.attachEvent("on"+event, listener); }
	
	if (object.addEventListener)
		try
		{
			object.addEventListener(event, listener, false);
		} catch(e) { ie(); } // Yes, Internet Explorer supports AddEventListener... YET STILL THROWS. What's the logic? Really?
	else if (object.attachEvent)
		ie();
	else
		throw "Could not add listener for " + event + " to object " + object;
};

Trap._uuidCounter = 0;
Trap._uuid = function()
{
	return Math.random().toString(16).substring(2) + (Trap._uuidCounter++).toString(16);
};

// Choosing not to define a common function, in case someone wants to feature detect object type
Trap.subarray = function(src, start, end)
{
	if (src.subarray)
		return src.subarray(start,end);
	else
		return src.slice(start,end);
};

// Flag detects if the browser supports getters (optimises access)
Trap._useGetters = false;
try { eval('var f = {get test() { return true; }}; Trap._useGetters = f.test;'); } catch(e){}



/**
Workaround for iOS 6 setTimeout bug using requestAnimationFrame to simulate timers during Touch/Gesture-based events
Author: Jack Pattishall (jpattishall@gmail.com)
This code is free to use anywhere (MIT, etc.)
 
Usage: Pass TRUE as the final argument for setTimeout or setInterval.
 
Ex:
setTimeout(func, 1000) // uses native code
setTimeout(func, 1000, true) // uses workaround
 
Demos:
http://jsfiddle.net/xKh5m/ - uses native setTimeout
http://jsfiddle.net/ujxE3/ - uses workaround timers
*/
 
(function(){
  // Only apply settimeout workaround for iOS 6 - for all others, we map to native Timers
  return;
  if (!navigator.userAgent.match(/OS 6(_\d)+/i)) return;
  
  // Abort if we're running in a worker. Let's hope workers aren't paused during scrolling!!!
  if (typeof(window) == "undefined")
	  return;
 
  (function (window) {
	  
      // This library re-implements setTimeout, setInterval, clearTimeout, clearInterval for iOS6.
      // iOS6 suffers from a bug that kills timers that are created while a page is scrolling.
      // This library fixes that problem by recreating timers after scrolling finishes (with interval correction).
	// This code is free to use by anyone (MIT, blabla).
	// Author: rkorving@wizcorp.jp

      var timeouts = {};
      var intervals = {};
      var orgSetTimeout = window.setTimeout;
      var orgSetInterval = window.setInterval;
      var orgClearTimeout = window.clearTimeout;
      var orgClearInterval = window.clearInterval;


      function createTimer(set, map, args) {
              var id, cb = args[0], repeat = (set === orgSetInterval);

              function callback() {
                      if (cb) {
                              cb.apply(window, arguments);

                              if (!repeat) {
                                      delete map[id];
                                      cb = null;
                              }
                      }
              }

              args[0] = callback;

              id = set.apply(window, args);

              map[id] = { args: args, created: Date.now(), cb: cb, id: id };

              return id;
      }


      function resetTimer(set, clear, map, virtualId, correctInterval) {
              var timer = map[virtualId];

              if (!timer) {
                      return;
              }

              var repeat = (set === orgSetInterval);

              // cleanup

              clear(timer.id);

              // reduce the interval (arg 1 in the args array)

              if (!repeat) {
                      var interval = timer.args[1];

                      var reduction = Date.now() - timer.created;
                      if (reduction < 0) {
                              reduction = 0;
                      }

                      interval -= reduction;
                      if (interval < 0) {
                              interval = 0;
                      }

                      timer.args[1] = interval;
              }

              // recreate

              function callback() {
                      if (timer.cb) {
                              timer.cb.apply(window, arguments);
                              if (!repeat) {
                                      delete map[virtualId];
                                      timer.cb = null;
                              }
                      }
              }

              timer.args[0] = callback;
              timer.created = Date.now();
              timer.id = set.apply(window, timer.args);
      }


      window.setTimeout = function () {
              return createTimer(orgSetTimeout, timeouts, arguments);
      };


      window.setInterval = function () {
              return createTimer(orgSetInterval, intervals, arguments);
      };

      window.clearTimeout = function (id) {
              var timer = timeouts[id];

              if (timer) {
                      delete timeouts[id];
                      orgClearTimeout(timer.id);
              }
      };

      window.clearInterval = function (id) {
              var timer = intervals[id];

              if (timer) {
                      delete intervals[id];
                      orgClearInterval(timer.id);
              }
      };

      window.addEventListener('scroll', function () {
              // recreate the timers using adjusted intervals
              // we cannot know how long the scroll-freeze lasted, so we cannot take that into account

              var virtualId;

              for (virtualId in timeouts) {
                      resetTimer(orgSetTimeout, orgClearTimeout, timeouts, virtualId);
              }

              for (virtualId in intervals) {
                      resetTimer(orgSetInterval, orgClearInterval, intervals, virtualId);
              }
      });

}(window));
})();
Trap.EventObject = function()
{
	this._eventlistenersMap = {};
};

Trap.EventObject.prototype.addEventListener = function(type, listener) {
    if (!this._eventlistenersMap[type])
        this._eventlistenersMap[type] = [];
    var eventlisteners = this._eventlistenersMap[type];
    for (var i = 0; i<eventlisteners.length; i++) {
        if(listener === eventlisteners[i])
            return;
    }
    eventlisteners[i] = listener;
};

Trap.EventObject.prototype.removeEventListener = function(type, listener) {
    if (!this._eventlistenersMap[type])
        return;
    var eventlisteners = this._eventlistenersMap[type];
    for (var i = 0; i < eventlisteners.length; i++) {
        if (listener === eventlisteners[i]) {
            eventlisteners.splice(i,1);
            break;
        }
    }
};

Trap.EventObject.prototype._dispatchEvent = function(evt) {
    var listeners = this._eventlistenersMap[evt.type];
    
    if (!evt.target)
    	evt.target = this;
    
    if(!!listeners)
    {
    	for (var i = 0; i < listeners.length; i++)
    	{
    		try
    		{
        		listeners[i](evt);
    		}
    		catch (e)
    		{
    			if (this.logger)
    			{
    				this.logger.warn("Exception while dispatching event to listener; ", e, " to ", listeners[i], ". Event was ", evt);
    			}
    		}
    		
    	}
    }
    
	try
	{
	    var f = this["on"+evt.type];
	    if (f && typeof(f) == "function") f.call(this, evt);
	}
	catch (e)
	{
		if (this.logger)
		{
			this.logger.warn("Exception while dispatching event to listener; ", e, " to ", f, ". Event was ", evt);
		}
	}
};
Trap.List = function()
{
	this.list = [];
};

Trap.List.prototype.className = "list";

Trap.List.prototype.add = function(a, b)
{
	
	// add(index, object)
	if (!!b && typeof(a) == "number")
	{
		this.list.splice(a, 0, b);
	}
	else
	{
		// add(object)
		this.list.push(a);
	}
};

Trap.List.prototype.addLast = function(o)
{
	this.list.push(o);
};

Trap.List.prototype.remove = function(o)
{
	
	if (typeof o == "number")
	{
		var orig = this.list[o];
		this.list.splice(o, 1);
		return orig;
	}
	
	for (var i=0; i<this.list.length; i++)
		if (this.list[i] == o)
			this.list.splice(i, 1);
	
	return o;
};

Trap.List.prototype.peek = function()
{
	return (this.list.length > 0 ? this.list[0] : null);
};

Trap.List.prototype.size = function()
{
	return this.list.length;
};

Trap.List.prototype.get = function(idx)
{
	return this.list[idx];
};

Trap.List.prototype.getLast = function()
{
	return this.get(this.size()-1);
};

Trap.List.prototype.contains = function(needle)
{
	for (var i=0; i<this.list.length; i++)
		if (this.list[i] == needle)
			return true;
	return false;
};

Trap.List.prototype.sort = function()
{
	this.list.sort.apply(this.list, arguments);
};

Trap.List.prototype.clear = function()
{
	this.list = [];
};

Trap.List.prototype.addAll = function()
{
	var args = arguments;
	
	if (args.length < 1)
		return;
	
	if (args.length == 1)
	{
		var o = args[0];
		
		if (o.className == "list")
			args = o.list;
		else if (typeof(o) == "array")
			args = o;
	}

	// Add all elements
	for (var i=0; i<args.length; i++)
		this.list.push(args[i]);
	
};
// I googled, but only found Apache JS Loggers

Trap.Logger = function(name)
{
	this.name = name;
};

Trap.Logger._loggers = {};

Trap.Logger.getLogger = function(name)
{
	var logger = Trap.Logger._loggers[name];
	
	if (!logger)
	{
		logger = new Trap.Logger(name);
		Trap.Logger._loggers[name] = logger;
	}
	
	return logger;
};

// TODO: Proper formatter plx
Trap.Logger.formatter = {};

{
	var _pad = function (val, len) {
		val = String(val);
		len = len || 2;
		while (val.length < len)
			val = "0" + val;
		return val;
	};

	var _logtime = function () {
		var d = new Date();
	    return [_pad(d.getHours(), 2)+":"+_pad(d.getMinutes(), 2)+":"+_pad(d.getSeconds(), 2)+"."+_pad(d.getMilliseconds(), 3)+" -"];
	};
	
	Trap.Logger.formatter._format = function(logMessage)
	{

		var params = _logtime();
		params.push(logMessage.label);
		
		if (logMessage.objects.length > 1 && typeof(logMessage.objects[0]) == "string")
		{
			// Slam the objects as needed.
			var msg = logMessage.objects[0];
			var idx = msg.indexOf("{}");
			var i=1;

			while (idx != -1)
			{
				if (i >= logMessage.objects.length)
					break;
				
				// Replaces first instance.
				msg = msg.replace("{}", logMessage.objects[i]);
				i++;
				
				// Technically, we can do it differently, but this way we'll prevent searching the parts of the string we processed
				idx = msg.indexOf("{}", idx);
			}
			
			params.push(msg);
			
			while (i < logMessage.objects.length)
			{
				var o = logMessage.objects[i++];
				
				params.push(o);
				
				if (o.stack)
					params.push(o.stack);
			}
			
		}
		else
			params.push.apply(params, logMessage.objects);
		
		if (logMessage.objects[0].stack)
			params.push(logMessage.objects[0].stack);
		
		return params;
	};
}

// TODO: Proper appender plx
Trap.Logger.appender = {};
Trap.Logger.appender._info = Trap.Logger.appender._warn = Trap.Logger.appender._error = function(){};

if (self.console && self.console.log) {
    if (self.console.log.apply)
    	Trap.Logger.appender._info = function(params) { self.console.log.apply(self.console, params); };
    else
    	Trap.Logger.appender._info = function(params) { self.console.log(params.join()); };
    	
    if (self.console.warn) {
	    if (self.console.warn.apply)
	    	Trap.Logger.appender._warn = function(params) { self.console.warn.apply(self.console, params); };
	    else
	    	Trap.Logger.appender._warn = function(params) { self.console.warn(params.join()); };
    } 
    else
    	Trap.Logger.appender._warn = Warp._info;
    
    if (self.console.error) {
	    if (self.console.error.apply)
	    	Trap.Logger.appender._error = function(params) { self.console.error.apply(self.console, params); };
	    else
	    	Trap.Logger.appender._error = function(params) { self.console.error(params.join()); };
    } 
    else
    	Trap.Logger.appender._error = Trap.Logger.appender._info;
}

Trap.Logger.prototype.trace = function()
{
	Trap.Logger.appender._info(Trap.Logger.formatter._format({objects: arguments, label: "", logger: this.name}));
};

Trap.Logger.prototype.debug = function()
{
	Trap.Logger.appender._info(Trap.Logger.formatter._format({objects: arguments, label: "", logger: this.name}));
};

Trap.Logger.prototype.info = function()
{
	Trap.Logger.appender._info(Trap.Logger.formatter._format({objects: arguments, label: "", logger: this.name}));
};

Trap.Logger.prototype.warn = function()
{
	Trap.Logger.appender._warn(Trap.Logger.formatter._format({objects: arguments, label: "WARN: ", logger: this.name}));
};

Trap.Logger.prototype.error = function()
{
	Trap.Logger.appender._error(Trap.Logger.formatter._format({objects: arguments, label: "ERROR: ", logger: this.name}));
};
/*
 * The Map class provides an implementation-agnostic way to have a map with any
 * keys/values but without the hassle of being affected during iterations by
 * third party libraries, since you can ask for all keys.
 */

Trap.Map = function(src)
{
	this._map = {};
	this._keys = [];
	
	if (typeof(src) != "undefined")
	{
		// Clone
		for (var key in src.allKeys())
			this.put(key, src.get(key));
	}
};

Trap.Map.prototype.put = function(key, value)
{
	if (!(key in this._map))
		this._keys.push(key);
	
	this._map[key] = value;
};

Trap.Map.prototype.get = function(key)
{
	return this._map[key];
};

Trap.Map.prototype.allKeys = function()
{
	return this._keys;
};

Trap.Map.prototype.remove = function(key)
{
	for (var i=0; i<this._keys.length; i++)
		if (this._keys[i] == key)
			this._keys.splice(i, 1);
	
	delete this._map[key];
};

Trap.Map.prototype.size = function()
{
	return this._keys.length;
};

Trap.Map.prototype.putAll = function(src)
{
	var keys = src.allKeys();
	
	for (var i=0; i<keys.length; i++)
		this.put(keys[i], src.get(keys[i]));
};
Trap.MD5 = function (string) {
 
	function RotateLeft(lValue, iShiftBits) {
		return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
	}
 
	function AddUnsigned(lX,lY) {
		var lX4,lY4,lX8,lY8,lResult;
		lX8 = (lX & 0x80000000);
		lY8 = (lY & 0x80000000);
		lX4 = (lX & 0x40000000);
		lY4 = (lY & 0x40000000);
		lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
		if (lX4 & lY4) {
			return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
		}
		if (lX4 | lY4) {
			if (lResult & 0x40000000) {
				return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
			} else {
				return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
			}
		} else {
			return (lResult ^ lX8 ^ lY8);
		}
 	}
 
 	function F(x,y,z) { return (x & y) | ((~x) & z); }
 	function G(x,y,z) { return (x & z) | (y & (~z)); }
 	function H(x,y,z) { return (x ^ y ^ z); }
	function I(x,y,z) { return (y ^ (x | (~z))); }
 
	function FF(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function GG(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function HH(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function II(a,b,c,d,x,s,ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
 
	function ConvertToWordArray(string) {
		var lWordCount;
		var lMessageLength = string.length;
		var lNumberOfWords_temp1=lMessageLength + 8;
		var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
		var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
		var lWordArray=Array(lNumberOfWords-1);
		var lBytePosition = 0;
		var lByteCount = 0;
		while ( lByteCount < lMessageLength ) {
			lWordCount = (lByteCount-(lByteCount % 4))/4;
			lBytePosition = (lByteCount % 4)*8;
			lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
			lByteCount++;
		}
		lWordCount = (lByteCount-(lByteCount % 4))/4;
		lBytePosition = (lByteCount % 4)*8;
		lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
		lWordArray[lNumberOfWords-2] = lMessageLength<<3;
		lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
		return lWordArray;
	};
 
	function WordToHex(lValue) {
		var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
		for (lCount = 0;lCount<=3;lCount++) {
			lByte = (lValue>>>(lCount*8)) & 255;
			WordToHexValue_temp = "0" + lByte.toString(16);
			WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
		}
		return WordToHexValue;
	};
 
	function Utf8Encode(string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	};
 
	var x=Array();
	var k,AA,BB,CC,DD,a,b,c,d;
	var S11=7, S12=12, S13=17, S14=22;
	var S21=5, S22=9 , S23=14, S24=20;
	var S31=4, S32=11, S33=16, S34=23;
	var S41=6, S42=10, S43=15, S44=21;
 
	string = Utf8Encode(string);
 
	x = ConvertToWordArray(string);
 
	a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
 
	for (k=0;k<x.length;k+=16) {
		AA=a; BB=b; CC=c; DD=d;
		a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
		d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
		c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
		b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
		a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
		d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
		c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
		b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
		a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
		d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
		c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
		b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
		a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
		d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
		c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
		b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
		a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
		d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
		c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
		b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
		a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
		d=GG(d,a,b,c,x[k+10],S22,0x2441453);
		c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
		b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
		a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
		d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
		c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
		b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
		a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
		d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
		c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
		b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
		a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
		d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
		c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
		b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
		a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
		d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
		c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
		b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
		a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
		d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
		c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
		b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
		a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
		d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
		c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
		b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
		a=II(a,b,c,d,x[k+0], S41,0xF4292244);
		d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
		c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
		b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
		a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
		d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
		c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
		b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
		a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
		d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
		c=II(c,d,a,b,x[k+6], S43,0xA3014314);
		b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
		a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
		d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
		c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
		b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
		a=AddUnsigned(a,AA);
		b=AddUnsigned(b,BB);
		c=AddUnsigned(c,CC);
		d=AddUnsigned(d,DD);
	}
 
	var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);
 
	return temp.toLowerCase();
};


/*
 * Adds more string functions
 */

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

if (typeof String.prototype.trim != 'function')
{
	String.prototype.trim = function(str)
	{
		var	s = str.replace(/^\s\s*/, ''),
			ws = /\s/,
			i = s.length;
		while (ws.test(s.charAt(--i)));
		return s.slice(0, i + 1);
		
	};
}

if (typeof String.prototype.endsWith != 'function') {
	String.prototype.endsWith = function(suffix) {
	    return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};
}

if (typeof String.prototype.contains != 'function')
{
	String.prototype.contains = function(target)
	{
		return this.indexOf(target) != -1;
	};
};

// Calculates the length of the string in utf-8
if (typeof String.prototype.utf8ByteLength != 'function')
{
	String.prototype.utf8ByteLength = function()
	{
		// Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
		var m = encodeURIComponent(this).match(/%[89ABab]/g);
		return this.length + (m ? m.length : 0);
	};
};

if (typeof String.prototype.toUTF8ByteArray != 'function')
String.prototype.toUTF8ByteArray = function() {
	var bytes = [];

	var s = unescape(encodeURIComponent(this));

	for (var i = 0; i < s.length; i++) {
		var c = s.charCodeAt(i);
		bytes.push(c);
	}

	return bytes;
};

if (typeof String.prototype.fromUTF8ByteArray != 'function')
String.fromUTF8ByteArray = function(arr, offset, length)
{
	var str = "";
	if (typeof(offset) == "undefined")
	{
		offset = 0; length = arr.length;
	}
	
	for (var i=offset; i<length; i++)
		str += String.fromCharCode(arr[i]);
	
	return String.utf8Decode(str);
};

String.utf8Encode = function(src)
{
	return unescape( encodeURIComponent( src ) );
};

String.utf8Decode = function(src)
{
	return decodeURIComponent( escape( src ) );
};
Trap.StringBuffer = function()
{
	this.buf = "";
};

Trap.StringBuffer.prototype.append = function(arg)
{
	this.buf += arg;
};

Trap.StringBuffer.prototype.toString = function()
{
	return this.buf;
};

Trap.StringBuilder = Trap.StringBuffer;
Trap.Authentication = function()
{
	
	/**
	 * Fetches a collection of keys (strings) that this TrapAuthentication
	 * instance wants from the TrapTransport. The TrapAuthentication instance
	 * must not change this collection after this call, and must not assume the
	 * transport will call this function more times than one. It can assume the
	 * transport calls this function at least once.
	 * <p>
	 * As an argument, the transport supplies the context keys available from
	 * this transport. The returned collection may not contain a key that does
	 * not exist in the <i>availableKeys</i> collection. If the
	 * TrapAuthentication's implementation requires a context value whose key
	 * not exist in <i>availableKeys</i>, it may generate a value, as long as it
	 * does not significantly compromise the integrity of the authentication.
	 * <p>
	 * If there is not enough context information for this TrapAuthentication
	 * instance to successfully work, it may throw a TrapException.
	 * 
	 * @param availableKeys
	 *            A collection containing all keys that the TrapTransport can
	 *            fill in with meaningful values.
	 * @throws TrapException
	 *             If there is not enough context information for this
	 *             TrapAuthentication instance to successfully work
	 * @return A collection of keys that the TrapAuthentication instance wants
	 *         the TrapTransport to provide on every call.
	 */
	this.getContextKeys = function(availableKeys) { return []; };
	
	/**
	 * Verifies the authentication of a message. Checks the authentication
	 * header against Trapauthentication's internal state, and checks if it is
	 * correct. Additional data is provided by the transport in the form of
	 * other message headers (if any), as well as the message body (if
	 * available) and, finally, the additional context keys requested.
	 * 
	 * @param authenticationString
	 *            The authentication string provided by the other side. This
	 *            does not include beginning or trailing whitespaces, newlines,
	 *            etc, and does not include an eventual header name this was
	 *            sent in, nor the authentication type (e.g. DIGEST). If the
	 *            authentication string was transferred as part of a message
	 *            header, that header may be present in the <i>headers</I> map
	 *            if and only if it is called exactly "Authorization".
	 * @param headers
	 *            A map (String, String) of eventual other message headers. May
	 *            contain any number of headers (including zero). May not be
	 *            null. May not be modified by verifyAuthentication.
	 * @param body
	 *            A message body, if present. May be null. May not be modified
	 *            by verifyAuthentication.
	 * @param context
	 *            A non-null map of the context values requested by this
	 *            TrapAuthentication in {@link #getContextKeys(Collection)}.
	 *            Every key that was returned by getContextKeys MUST be filled
	 *            in.
	 * @return <i>true</i> if the authentication string is correct, <i>false</i>
	 *         otherwise (incorrect, could not be verified, etc).
	 */
	this.verifyAuthentication = function(authenticationString, headers, body, context) {return true;};
	
	/**
	 * Creates an authentication challenge.
	 * 
	 * @param context
	 *            A map of key/value pairs deduced from the transport and
	 *            environment
	 * @return A finished authentication challenge, to be inserted into the
	 *         message to the remote end.
	 */
	this.createAuthenticationChallenge = function(context) { return "";};
	
	/**
	 * Creates an authentication string to answer an authentication challenge,
	 * or sign a message. The TrapTransport provides the challenge
	 * authentication header of the last message(if any). If there is no
	 * authentication header, the TrapAuthentication instance should attempt to
	 * generate an authentication string from the current context and state. If
	 * that fails, it may throw a TrapException.
	 * <p>
	 * The call additionally includes the message header(s) and body (if any) to
	 * be signed in the authentication header, as well as the TrapTransport's
	 * context, as requested by this TrapAuthentication instance.
	 * 
	 * @param challengeString
	 *            A challenge string received by the TrapTransport, or null if
	 *            there was no new challenge.
	 * @param headers
	 *            Eventual message headers
	 * @param body
	 *            Eventual body
	 * @param context
	 *            A non-null map of the context values requested by this
	 *            TrapAuthentication in {@link #getContextKeys(Collection)}.
	 *            Every key that was returned by getContextKeys MUST be filled
	 *            in.
	 * @return An authentication response corresponding to the challenge, to be
	 *         inserted into a message with no further modifications
	 */
	this.createAuthenticationResponse = function(challengeString, headers, body, context) {return "";};
};
Trap.Configuration = function(cfgString)
{
	
	// Set up local fields
	this.config = new Trap.Map();
	
	if (cfgString != null)
		this.initFromString(cfgString);
};

Trap.Configuration.CONFIG_HASH_PROPERTY = "trap.confighash";

Trap.Configuration.prototype.initFromString = function(configString)
{
	var strings = configString.split('\n');
	
	for (var i=0; i<strings.length; i++)
	{
		var c = strings[i].trim();
		
		var pos = c.indexOf('=');
		
		// Not found, alternatively no value
		if(pos < 0 || pos >= c.length - 1)
			continue;
		
		this.config.put(c.substring(0, pos).trim(), c.substring(pos+1).trim());
	}
};

Trap.Configuration.prototype.createPuttableGettableMap = function(optionsPrefix, cutPrefixes)
{
	var mt = this;
	var m = new Trap.Map();
	
	if (typeof(cutPrefixes) == "undefined")
		cutPrefixes = true;
	
	m.prefixKey = function(key) 
	{
		sb = (cutPrefixes?optionsPrefix:key);
		
		if(cutPrefixes) 
		{
			if(!optionsPrefix.endsWith("."))
				sb += ".";
			sb += key;
		}
		return sb;
	};
	
	m.put = function(key, value)
	{
		if(key == null || value == null)
			throw "Cannot put nil key or value";
		
		mt.config.put(m.prefixKey(key), value);
		Trap.Map.prototype.put.call(m, key, value);
	};
	
	return m;
};

Trap.Configuration.prototype.getOptions = function(optionsPrefix, cutPrefixes)
{
	if (typeof(cutPrefixes) == "undefined")
		cutPrefixes = true;
	
	var x = (cutPrefixes && !optionsPrefix.endsWith("."))?1:0;
	var m = this.createPuttableGettableMap(optionsPrefix, cutPrefixes);
	
	var keys = this.config.allKeys();
	
	for (var i=0; i<keys.length; i++)
	{
		var key = keys[i];
		var value = this.config.get(key);
		if(key.startsWith(optionsPrefix)) {
			if(cutPrefixes)
				key = key.substring(optionsPrefix.length+x);
			m.put(key, value);
		}
	}
	return m;
};

Trap.Configuration.prototype.toString = function()
{
	var keys = this.config.allKeys().sort();
	
	var sb = new Trap.StringBuilder();
	
	for (var i = 0; i < keys.length; i++)
	{
		sb.append(keys[i]);
		sb.append(" = ");
		sb.append(this.config.get(keys[i]));
		sb.append("\n");
	}
	return sb.toString();
};

/*
 * This code is unreadable. Refer to the Java implementation for what it does.
 * The mess here is because JavaScript doesn't support multiple signatures for
 * the same function name.
 */
Trap.Configuration.prototype.getOption = function(a1, a2)
{
	return this.config.get((typeof(a2) != "undefined"?a1+"."+a2:a1));
};

Trap.Configuration.prototype.getIntOption = function(option, defaultValue)
{
	
	var rv = parseInt(this.getOption(option));
	
	if (isNaN(rv))
		return defaultValue;
	
	return rv;

};

Trap.Configuration.prototype.setOption = function(a1, a2, a3)
{
	this.config.put((typeof(a3) != "undefined"?a1+"."+a2:a1), (typeof(a3) != "undefined"?a3:a2));
};
Trap.CustomConfiguration = function(cfgString) 
{
	// "super"
	Trap.Configuration.prototype.constructor.call(this, cfgString);
	
	this.setStaticConfiguration(cfgString);
	
};

Trap.CustomConfiguration.prototype = new Trap.Configuration;
Trap.CustomConfiguration.prototype.constructor = Trap.CustomConfiguration;

Trap.CustomConfiguration.prototype.setStaticConfiguration = function(configuration) {
	this.staticConfig = new Trap.Configuration(configuration);
};

Trap.CustomConfiguration.prototype.getOptions = function(optionsPrefix, cutPrefixes) {
	var options = this.createPuttableGettableMap(optionsPrefix, cutPrefixes);
	options.putAll(this.staticConfig.getOptions(optionsPrefix, cutPrefixes));
	options.putAll(Trap.Configuration.prototype.getOptions.call(this, optionsPrefix, cutPrefixes));
	return options;
};

Trap.CustomConfiguration.prototype.getOption = function() {
	var val = Trap.Configuration.prototype.getOption.apply(this, arguments);
	if (val == null)
		val = this.staticConfig.getOption.apply(this.staticConfig, arguments);
	return val;
};

Trap.CustomConfiguration.prototype.toString = function() 
{
	var sb = new Trap.StringBuffer();
	var keys = new Array();
	keys.push.apply(keys, this.staticConfig.config.allKeys());
	keys.push.apply(keys, this.config.allKeys());
	keys.sort();
	
	// Eliminate duplicate keys
	var len=keys.length,
	out=[],
	obj={};

	for (var i=0;i<len;i++) {
		obj[keys[i]]=0;
	}
	for (i in obj) {
		out.push(i);
	}

	for(var i=0;i<out.length;i++) {
		var key = out[i];
		sb.append(key);
		sb.append(" = ");
		sb.append(this.getOption(key));
		sb.append("\n");
	}
	return sb.toString();
};
Trap.Keepalive = {};
Trap.Keepalive.Policy = {
		DISABLED: -1,
		DEFAULT: 0
};

// Note that unlike api classes, the predictor classes are carbon copies of Java. I figure, internally
// we will only waste time with niceties exposed to developers
Trap.Keepalive.StaticPredictor = function ()
{
	
	this.keepaliveInterval	= Trap.Keepalive.Policy.DISABLED;
	
	// Keepalive engine stuff
	/**
	 * The current keepalive interval
	 */
	this.mKeepaliveInterval	= 5 * 60;
	
	/**
	 * Number of seconds to wait at least between keepalives
	 */
	this.minKeepalive		= 1;
	
	/**
	 * Number of seconds to wait at most between keepalives
	 */
	this.maxKeepalive		= 999999;
	
	// Automatic keepalive interval optimisation
	
	this.lastInterval		= this.mKeepaliveInterval;
	
	this.growthStep			= 0;

	this.nextInterval		= this.mKeepaliveInterval + this.growthStep;
	
	/**
	 * The minimum keepalive value that the automatic keepalive algorithm is
	 * allowed to decrease the keepalive to. The auto keepalive algorithm is
	 * only active on transports that can connect (i.e. reconnect) if it fails
	 * them.
	 */
	this.minAutoKeepalive	= 1;
	
	/**
	 * The minimum keepalive value that the automatic keepalive algorithm is
	 * allowed to decrease the keepalive to. The auto keepalive algorithm is
	 * only active on transports that can connect (i.e. reconnect) if it fails
	 * them. In addition, if keepalivepolicy != default, the automatic algorithm
	 * is disabled, as well as when min/max auto keepalives are negative
	 * numbers.
	 */
	this.maxAutoKeepalive	= 28 * 60;
	
	/**
	 * Timestamp of last recorded keepalive received
	 */
	this.lastReceivedKeepalive	= 0;
	this.lastSentKeepalive		= 0;

	this.keepaliveTask		= null;
	this.keepaliveTaskTime	= 0;
	this.keepaliveExpiryMsec	= 5000;

	/**
	 * Byte array containing the most recently sent keepalive message from this
	 * predictor.
	 */
	this.keepaliveData		= null;
	
	this.started					= false;

	this.delegate = null;

	this.setMinKeepalive = function(min)
	{
		this.minKeepalive = min;
	}
	
	this.setMaxKeepalive = function(max)
	{
		this.maxKeepalive = max;
	}
	
	this.setMinAutoKeepalive = function(min)
	{
		this.minAutoKeepalive = min;
	}
	
	this.setMaxAutoKeepalive = function(max)
	{
		this.maxAutoKeepalive = max;
	}
	
	this.setKeepaliveInterval = function(interval)
	{
		this.keepaliveInterval = interval;
		
		if (interval == Trap.Keepalive.Policy.DEFAULT)
			this.nextInterval = this.mKeepaliveInterval;
		else if (interval == Trap.Keepalive.Policy.DISABLED)
			this.nextInterval = -1;
		else
		{
			// Basically, ensure that the interval is within the allowed range
			if ((interval > this.maxKeepalive) || (interval < this.minKeepalive))
				this.nextInterval = this.mKeepaliveInterval;
			else
				this.nextInterval = interval;
		}
		
	}
	
	this.getKeepaliveInterval = function()
	{
		return this.keepaliveInterval;
	}

	this.getNextKeepalive = function()
	{
		return this.nextInterval;
	}
	
	this.keepaliveReceived = function(isPing, pingType, timer, data)
	{
		if (!isPing)
		{

			// Check if this is a PING we have sent
			if (data != this.keepaliveData)
				return;
			
			this.keepaliveData = null;
			
			switch (pingType)
			{
			// Keepalives disabled

				case '1':
					break; // Do nothing; we will not auto-adjust
					
				case '2':
					this.setKeepaliveInterval(timer); // Manual adjustment
					break;
				
				case '3': // Manually triggered keepalive
					break;
				
				default: // no-error
			}
			
			// Successful keepalive; add a timer, set expectations, GO
			this.lastReceivedKeepalive = new Date().valueOf();
			this.schedule();
		}
		else
		{
			this.delegate.get().shouldSendKeepalive(false, this.getPingType(), this.getNextKeepalive(), data);
		}
	}
	
	this.nextKeepaliveDelta = function()
	{
		var expected = this.lastReceivedKeepalive + (this.getNextKeepalive() * 1000);
		var actual = new Date().valueOf();
		return expected - actual;
	}
	
	this.setDelegate = function(delegate)
	{
		this.delegate = { get : function() { return delegate; } };
	}
	
	this.setKeepaliveExpiry = function(msec)
	{
		this.keepaliveExpiryMsec = msec;
		this.schedule();
	}
	
	this.getKeepaliveExpiry = function()
	{
		return this.keepaliveExpiryMsec;
	}
	
	this.start = function()
	{
		if (this.getKeepaliveInterval() == Trap.Keepalive.Policy.DISABLED)
			return;
		
		if (this.started)
			return;
		
		if (this.nextKeepaliveDelta() <= 0)
			this.lastReceivedKeepalive = new Date().valueOf();
		
		this.keepaliveData = null;
		this.lastSentKeepalive = 0;
		this.keepaliveTaskTime = 0;

		this.started = true;

		this.schedule();

	}
	
	this.stop = function()
	{
		
		if (!this.started)
			return;

		if (this.keepaliveTask != null)
		{
			this.keepaliveTask.cancel();
			this.keepaliveTask = null;
		}
		
		this.started = false;
	}
	
	this.schedule = function()
	{
		
		if (this.getKeepaliveInterval() == Trap.Keepalive.Policy.DISABLED)
			return;
		
		if (!this.started)
			return;
		
		// Next send should auto-disable if there is an outstanding ping/pong waiting
		var nextSend = (this.keepaliveData == null ? (this.getNextKeepalive() * 1000) + this.lastSentKeepalive : 99999999);
		var nextReceive = (this.getNextKeepalive() * 1000) + this.keepaliveExpiryMsec + this.lastReceivedKeepalive;
		var scheduledTime = Math.min(nextSend, nextReceive);
		
		var msec = scheduledTime - new Date().valueOf();
		
		if (msec < 0)
		{
			scheduledTime = new Date().valueOf() + 150;
			msec = 150;
		}
		
		// no-op: we want to schedule for longer time than the current expiry (expiry will re-schedule)
		// cancel: we want to schedule for shorter time than the current expiry
		if (this.keepaliveTask != null)
		{
			// Ensure we don't schedule if a task is going to happen closer, but in the future
			if ((this.keepaliveTaskTime <= scheduledTime) && (this.keepaliveTaskTime > new Date().valueOf()))
				return;
			
			this.keepaliveTask.cancel();
		}
		
		this.keepaliveTaskTime = scheduledTime;

		var mt = this;
		
		this.keepaliveTask = {
				run : function() { mt.run(); },
				cancel : function() { clearTimeout(this.timeout); }
		};
		
		this.keepaliveTask.timeout = setTimeout(this.keepaliveTask.run, msec);

	}
	
	this.run = function()
	{
		var delegate = this.delegate.get();
		
		if (delegate == null)
		{
			this.stop();
			return; // Delegate garbage collected; nothing to keep notifying about
		}
		
		// Check if we have been disabled...
		if (this.getKeepaliveInterval() == Trap.Keepalive.Policy.DISABLED)
		{
			this.stop();
			return;
		}
		// Now check for timeout
		
		var msec = this.nextKeepaliveDelta();
		
		if ((msec < 0) && (-msec > this.keepaliveExpiryMsec))
		{
			// Don't re-schedule this task on non-expired timeout
			delegate.predictedKeepaliveExpired(this, -msec);
			this.stop();
			return;
		}
		
		// Is it time to send a keepalive?
		
		msec = (this.lastSentKeepalive + (this.getNextKeepalive() * 1000)) - new Date().valueOf();
		if (msec <= 0)
		{
			
			if (this.keepaliveData != null)
			{
				// OOps?
				//System.err.println("EXPERIMENTAL: keepalive data != null when expired timer... Dropping sending a keepalive.");
			}
			else
			{
				
				this.keepaliveData  = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
				    return v.toString(16);
				}); 
				this.lastSentKeepalive = new Date().valueOf();
				delegate.shouldSendKeepalive(true, this.getPingType(), this.getNextKeepalive(), this.keepaliveData);
				
			}
		}
		
		// reschedule ourselves for a default time
		this.keepaliveTaskTime = 0;
		this.schedule();
	}
	
	this.getPingType = function()
	{
		var type = '1';
		
		if (this.getKeepaliveInterval() > 0)
			type = '2';
		
		return type;
	}
	
};
/**
 * Circular buffer of TrapMessages and TrapTransports they arrived on. The
 * message buffer works using random inserts and regular reads. The buffer needs
 * to be initialised with a size (can be automatically increased) and initial
 * expected message id. The buffer will use this expected message ID to seed
 * itself with and be able to receive messages from history.
 * <p>
 * The buffer will automatically sort messages for reading. If messages are read
 * in order, there is no performance penalty for accesses. If messages come from
 * outside the buffer's range, there is a performance penalty, based on buffer
 * settings.
 * <p>
 * To put it another way, it is a self-growing, circular object buffer
 * implementing random write and sequential read.
 * 
 * @author Vladimir Katardjiev
 */
Trap.MessageBuffer = function(bufSize, maxBufSize, startMessageId, minMessageId, maxMessageId)
{
	
	
	this.resizeBuffer	= true;
	this.waitTimeout		= 1000;

	this.bufGrowthSize = bufSize;
	this.maxBufSize = maxBufSize;
	this.minMessageId = minMessageId;
	this.maxMessageId = maxMessageId;
	this.buffer = new Array(bufSize);
	
	this.startMessageId = startMessageId - minMessageId;
	this.endMessageId = this.startMessageId - 1;
	
	this.fillEmptyBuf = function()
	{
		for (var i=0; i<this.buffer.length; i++)
		{
			var m = this.buffer[i];
			
			if (m == null)
				this.buffer[i] = {m: null, t: null};
		}
	}
	
	this.fillEmptyBuf();

	this.put = function(m, t)
	{
		// Let's make some comparisons
		var messageId = m.getMessageId() - this.minMessageId;
		
		// This will align the message with our buffer.
		if ((messageId < this.endMessageId) && (this.endMessageId > (this.maxMessageId - this.maxBufSize)))
			messageId += this.maxMessageId;
		
		// If the message is earlier than the start of the buffer...
		if ((messageId + 1) < this.startMessageId)
		{
			// TODO: Handle gracefully. Or warn.
			console.warn("Dropping message (Too early)");
			return;
		}
		
		// If we're about to exceed the buffer size, resize it to fit.
		if (((messageId + 1) - this.startMessageId) > this.buffer.length)
		{
				
				if (((messageId + 1) - this.startMessageId) > this.buffer.length)
				{
					var entryTime = new Date().valueOf();
					
					while ((((messageId + 1) - this.startMessageId) > this.buffer.length))
					{
						if (!this.resizeBuffer || (this.buffer.length >= this.maxBufSize))
						{
							console.warn("Dropping message (Buffer too large)");
							return;
						}
						
						// Grow the buffer by allocating a new one
						var newBuf = new Array(this.buffer.length + this.bufGrowthSize);
						
						// We'll need to re-insert the messages at the proper index.
						var idx = this.startMessageId % newBuf.length;
						
						// Now re-insert
						for (var i = this.startMessageId; i <= this.endMessageId; i++)
						{
							var msg = this.buffer[(i % this.buffer.length)];
							newBuf[(idx % newBuf.length)] = msg;
							idx++;
						}
						
						// Replace the buffer
						this.buffer = newBuf;
						
						// Fill it with new slots
						this.fillEmptyBuf();
					}
					
				}
				
		}
		
		// Insert the message
		var msg = this.buffer[(messageId % this.buffer.length)];
		msg.m = m;
		msg.t = t;
		
		// Bump up the max, if applicable.
		if (messageId > this.endMessageId)
			this.endMessageId = messageId;

	}
	
	this.get = function(skipEmpty)
	{
		for (;;)
		{
			
			// Return nothing if the buffer is empty
			
			var m = this.buffer[(this.startMessageId % this.buffer.length)];
			
			if (m == null)
				throw "Something's seriously wrong...";

			if (m.m != null)
			{
				return m;
			}
			
			if (!skipEmpty || (this.startMessageId > this.endMessageId))
				return null;
			
			// Skip forward
			this.startMessageId++;
		}
	}
	
	/**
	 * Frees the first (current) entry
	 */
	this.free = function()
	{
		if (this.startMessageId > this.endMessageId)
			return;
		
		this.buffer[(this.startMessageId % this.buffer.length)].m = null;
		
		this.startMessageId++;
		
		if (this.startMessageId > (this.maxMessageId - this.minMessageId))
		{
			// Shift the entire buffer, if applicable
			var diff = ((this.maxMessageId - this.minMessageId) + 1) % this.buffer.length;

			// If the difference is zero, we have no problem.
			if (diff != 0)
			{
				
				// I was going to make an optimised version here, but I figured, this is only going to happen once every two billion messages or so. Who cares?
				var newBuf = new Array(this.buffer.length);
				
				for (var i=this.startMessageId; i<= this.endMessageId; i++)
				{
					var m = this.buffer[ (i % this.buffer.length)];
					
					// Re-insert the objects in the new buffer
					newBuf[(m.m.getMessageId() - this.minMessageId) % newBuf.length] = m;
				}
				
				this.buffer = newBuf;
				this.fillEmptyBuf();
			}

			this.startMessageId -= (this.maxMessageId - this.minMessageId) + 1;
			this.endMessageId -= (this.maxMessageId - this.minMessageId);
			
		}
	}

}


Trap.Endpoint = function()
{
	Trap.EventObject.constructor.call(this);
	this.transportsMap			= new Trap.Map();
	this.transports				= new Trap.List();
	this.config = new Trap.Configuration();

	this.availableTransports	= new Trap.List();
	this._state					= Trap.Endpoint.State.CLOSED;

	this.messageQueue			= new Trap.List();
	this.messageQueueSize		= 0;

	this.messageQueueType		= Trap.Endpoint.Queue.REGULAR;
	this.blocking				= false;
	this.byteQueueSize			= false; 
	this.blockingTimeout		= 1<<31; 
	this.maxQueueSize			= 65535;
	this._maxActiveTransports 	= 65535;

	this.sending				= false;

	this.trapID					= 0;
	this.trapFormat				= Trap.Message.Format.SEVEN_BIT_SAFE;

	this._authentication		= new Trap.Authentication();
	this.logger					= Trap.Logger.getLogger("TrapEndpoint"); 						// The number of milliseconds async mode is allowed to wait for messages (to reorder)


	// Timeouts & Keepalives.
	/**
	 * Last known activity of the connection. Activity is defined as any form of
	 * message FROM the client. In general, the TrapEndpoint will not concern
	 * itself with ensuring this.value is continually updated, as that is mostly
	 * unnecessary overhead. It will update it during the following conditions:
	 * <p>
	 * <ul>
	 * <li>A transport disconnects. Even in this.case, the lastActivity field
	 * will only represent some most recent communication with the remote side,
	 * unless all transports have disconnected.
	 * <li>The application specifically queries. In this.case, the TrapEndpoint
	 * will specifically ensure that lastActivity has the most recent value.
	 * </ul>>
	 */
	this._lastAlive			= 0;

	/**
	 * The last known timestamp where we can reliably wake up the underlying
	 * transports. If we have a wakeup mechanism, this.will be a non-negative
	 * value, and represents when we can unilaterally tell the application the
	 * connection is permanently dead (unless we can extend the wakeup
	 * mechanism).
	 */
	this.canWakeupUntil		= 0;

	/**
	 * The last permitted timestamp for the client to re-establish connectivity.
	 * this.must be equal to or greater than canWakeupUntil, in order to
	 * maintain the same promise to the application.
	 */
	this.canReconnectUntil	= 0;

	/**
	 * The number of milliseconds that the endpoint should wait for a response
	 * (and/or attempt to reconnect/resend) to do an orderly close. After this
	 * time, the transport will simply deallocate all of its resources and
	 * vanish.
	 */
	this.keepaliveExpiry			= 5000;
	this.keepaliveInterval 			= Trap.Keepalive.Policy.DISABLED;
	this.keepaliveTask 				= null;

	this.reconnectTimeout = 180000;
	
	this.messageId = 1;
	this.maxMessageId = 0x7FFFFFFF;
	
	this.async				= true;
	this.asyncRunning		= false;
	this.asyncMessages		= new Trap.MessageBuffer(50, 1000, 1, 1, this.maxMessageId);
	this.asyncMessageWait	= 1000;		

	Trap._compat.__defineGetter(this, "state", function() {
		return this._state;
	});

	Trap._compat.__defineGetter(this, "queueType", function() {
		return this.messageQueueType;
	});

	Trap._compat.__defineSetter(this, "queueType", function(t) {
		this.messageQueueType = t;
	});

	Trap._compat.__defineGetter(this, "queueLength", function() {
		return this.maxQueueSize;
	});

	Trap._compat.__defineSetter(this, "queueLength", function(l) {
		this.maxQueueSize = l;
	});

	Trap._compat.__defineGetter(this, "maxActiveTransports", function() {
		return this._maxActiveTransports;
	});

	Trap._compat.__defineSetter(this, "maxActiveTransports", function(l) {
		this._maxActiveTransports = l;
	});

	Trap._compat.__defineGetter(this, "authentication", function() {
		return this._authentication;
	});

	Trap._compat.__defineSetter(this, "authentication", function(a) {
		this._authentication = a;

		for (var i=0; i<this.transports.size(); i++)
			this.transports.get(i).setAuthentication(a);
	});

};
Trap.Endpoint.prototype = new Trap.EventObject;
Trap.Endpoint.prototype.constructor = Trap.Endpoint;

Trap.Endpoint.State = 
{
		CLOSED : "Trap.Endpoint.State.CLOSED",
		OPENING : "Trap.Endpoint.State.OPENING",
		OPEN : "Trap.Endpoint.State.OPEN",
		SLEEPING : "Trap.Endpoint.State.SLEEPING",
		ERROR : "Trap.Endpoint.State.ERROR",
		CLOSING : "Trap.Endpoint.State.CLOSING",
};

Trap.Endpoint.Queue = 
{
		REGULAR: "Trap.Endpoint.Queue.REGULAR",
};

/* Settings methods */

Trap.Endpoint.prototype.enableTransport = function(transportName)
{
	if (this.isTransportEnabled(transportName))
		return;

	this.getTransport(transportName).enable();
};

Trap.Endpoint.prototype.disableTransport = function(transportName)
{
	if (!this.isTransportEnabled(transportName))
		return;

	this.getTransport(transportName).disable();
};

Trap.Endpoint.prototype.disableAllTransports = function()
{
	for (var i = 0; i < this.transports.size(); i++)
		this.transports.get(i).disable();
};

Trap.Endpoint.prototype.isTransportEnabled = function(transportName)
{
	try
	{
		return this.getTransport(transportName).isEnabled();
	}
	catch (e)
	{
		return false;
	}
};

Trap.Endpoint.prototype.getConfiguration = function()
{
	return this.config.toString();
};

Trap.Endpoint.prototype.parseConfiguration = function(configuration) {
	return new Trap.Configuration(configuration);
};

Trap.Endpoint.prototype.configure = function(configuration)
{
	this.config = this.parseConfiguration(configuration);

	// Iterate over all transports
	for (var i=0; i<this.transports.size(); i++)
		this.transports.get(i).setConfiguration(this.config);
	
	var option = this.config.getIntOption("trap.keepalive.interval", this.keepaliveInterval);
	this.setKeepaliveInterval(option);
	
	option = this.config.getIntOption("trap.keepalive.expiry", this.keepaliveExpiry);
	this.setKeepaliveExpiry(option);
};

Trap.Endpoint.prototype.configureTransport = function(transportName, configurationKey, configurationValue) 
{
	this.getTransport(transportName).configure(configurationKey, configurationValue);
};

Trap.Endpoint.prototype.getTransports = function()
{
	return this.transports;
};

Trap.Endpoint.prototype.getTransport = function(transportName)
{

	var t = this.transportsMap.get(transportName);

	if (t == null)
		throw "Unknown Transport";

	return t;
};

Trap.Endpoint.prototype.addTransport = function(t, message)
{
	this.transportsMap.put(t.getTransportName(), t);
	this.transports.add(t);

	// Hook the delegate methods
	var mt = this;
	t.onmessage = function(e) { mt.ttMessageReceived(e.message, t, null); };
	t.onstatechange = function(e) { mt.ttStateChanged(e.newState, e.oldState, t, null); };
	t.onfailedsending = function(e) { mt.ttMessagesFailedSending(e.messages, t, null); };

	// See public synchronized void addTransport(TrapTransport t, TrapMessage message)
	// Used to add a transport to a listener.
	if (message)
	{

		t.setConfiguration(this.config);
		t.setAuthentication(this.authentication);
		t.setTrapID(this.trapID);

		if (t.getState() == Trap.Transport.State.AVAILABLE) {
			this.addTransportToAvailable(t);
		}

		// Trigger incoming message (=OPEN) in order to reply properly.
		this.ttMessageReceived(message, t, null);
	}
};

Trap.Endpoint.prototype.setTrapID = function(newId)
{
	this.trapID = newId;
};

Trap.Endpoint.prototype.getTrapID = function()
{
	return this.trapID;
};

Trap.Endpoint.prototype.removeTransport = function(t)
{
	this.transportsMap.remove(t.getTransportName());
	this.transports.remove(t);
};

/**
 * Closes this.Trap endpoint, terminating any outstanding Trap transports.
 */
Trap.Endpoint.prototype.close = function()
{
	if (this.getState() != Trap.Endpoint.State.OPEN)
	{
		// We can't close a non-open connection.

		if (this.getState() == Trap.Endpoint.State.SLEEPING)
		{
			// TODO: We should WAKE UP then DISCONNECT.
			// Since SLEEPING is NYI, we'll leave this
			this.setState(Trap.Endpoint.State.CLOSING);
			this.onEnd(null, null);
		}
		else
		{
			if (this.getState() == Trap.Endpoint.State.CLOSING || this.getState() == Trap.Endpoint.State.CLOSED)
			{
				// Harmless call.
				return;
			}

			if (this.getState() == Trap.Endpoint.State.ERROR)
			{
				// Technically harmless call, but we will log it to point out potential laziness in the coding of the error handling of our parent.
				this.logger.debug("Called close() on an endpoint in state ERROR. This might be caused by recovery code shared between regular and normal states");
				return;
			}

			if (this.getState() == Trap.Endpoint.State.OPENING)
			{
				// TODO: This one is troublesome. close() has been called on a connection that is opening().
				// I think we can handle it normally (i.e. switch to closing and just end()) but it might be worth investigating
				// We will log.
				this.logger.debug("Called close() on an endpoint in state OPENING. This message is logged for debug purposes (if we don't fully close).");
			}
		}
	}
	this.setState(Trap.Endpoint.State.CLOSING);

	// We'll send END to the other side
	// After that has happened, we'll close (in onend)

	try
	{
		this.sendMessage(this.createMessage().setOp(Trap.Message.Operation.END));
	}
	catch (e)
	{
		this.logger.error("Setting Trap.Endpoint.State to ERROR due to an error while disconnecting that may have left the implementation in an inconsistent state");
		this.setState(Trap.Endpoint.State.ERROR);
		// TODO: Cleanup/recovery?
	};
};

/**
 * Attempts to queue data for sending. If the queue length is exceeded, it
 * may block or throw an exception, as per the queue type.
 * <p>
 * Please note that while send will accurately send the data over to the
 * other endpoint, it is advisable to instead use {@link #send(TrapObject)}
 * if the data being sent is a serialized object. If the other endpoint is
 * locally deployed, the TrapObject will never be serialized, thus saving on
 * large amounts of processing power.
 * 
 * @param data
 * @throws TrapException
 *             if the queue length is exceeded, or a timeout occurs on a
 *             blocking queue
 */
Trap.Endpoint.prototype.send = function(string)
{
	var m = this.createMessage().setOp(Trap.Message.Operation.MESSAGE).setData(string);
	this.sendMessage(m);
};

/**
 * Fetches the last known liveness timestamp of the endpoint. this.is the
 * last time it received a message from the other end. this.includes all
 * messages (i.e. also Trap messages such as keepalives, configuration, etc)
 * so must not be confused with the last known activity of the other
 * application. For example, in the case of a JavaScript remote endpoint,
 * this.does not guarantee an evaluation error has not rendered the JSApp's
 * main run loop as inoperable.
 * 
 * @see #isAlive(long, boolean, boolean, long) if all that is needed is an
 *      evaluation of the liveness status.
 * @return The timestamp of the last message received from the remote side.
 */
Trap.Endpoint.prototype.lastAlive = function()
{
	// Go through all transports and fetch lastAlive

	for (var i = 0; i < this.transports.size(); i++)
	{
		var t = this.transports.get(i);
		var tLastAlive = t.lastAlive;

		if (this._lastAlive < tLastAlive)
			this._lastAlive = tLastAlive;
	}

	return this._lastAlive;
};

/**
 * Attempts to verify if the endpoint is alive, or has been alive within a
 * certain number of milliseconds. Effectively, this.can be used to trigger
 * a keepalive check of the endpoint if used with a <i>within</i> parameter
 * of 0 and a <i>check</i> parameter of true.
 * <p>
 * this.function has a two-part purpose. The first is for the application to
 * be able to check the last known liveness of the endpoint, to reduce the
 * discovery time of a dead connection. The second is to trigger a check for
 * a dead endpoint, when the application needs to know that it has active
 * connectivity.
 * <p>
 * Note that in normal operation, the endpoint itself will report when it
 * has disconnected; the application does not need to concern itself with
 * this.detail unless it specifically needs to know that it has connectivity
 * right now.
 * <p>
 * <b>Warning:</b> Calling <i>isAlive</i> on a Server Trap Endpoint (i.e.
 * when none of the transports can perform the open() function) may cause a
 * client to lose its connectivity. The client may not have discovered the
 * underlying transport is dead yet, and may require more time to reconnect.
 * A wakeup mechanism can be used to establish liveness, but the server's
 * <i>timeout</i> value should be significantly more generous in order to
 * accommodate the client's reconnect and/or wakeup procedure!
 * 
 * @param within
 *            Within how many milliseconds the last activity of the endpoint
 *            should have occurred before the endpoint should question
 *            whether it is alive.
 * @param check
 *            Whether the endpoint should attempt to check for liveness, or
 *            simply return false if the last known activity of the endpoint
 *            is not later than within.
 * @param force
 *            Whether to attempt to force reconnection if the transports are
 *            not available within the given timeout. this.will ensure
 *            available liveness value reflects what is possible right now,
 *            although it may mean disconnecting transports that still may
 *            recover.
 * @param timeout
 *            If check is true, how many milliseconds at most the liveness
 *            check should take before returning false anyway. The
 *            application can use this.value if it has a time constraint on
 *            it.
 * @callback <i>true</i> if the connection is currently alive (including if
 *         this.function successfully re-established the connection),
 *         <i>false</i> otherwise.
 */
Trap.Endpoint.prototype.isAlive = function(within, check, reconnect, timeout, callback)
{
	// Ensure lastAlive is up to date.
	this.lastAlive();

	// Define within
	var mustBeAliveAfter = new Date().valueOf() - within;

	// We're within the allotted time window.
	if (this._lastAlive > mustBeAliveAfter)
	{
		callback(true);
		return;
	}

	// We're not allowed to perform the liveness check...
	if (!check)
	{
		callback(false);
		return;
	}
	
	// Unlike Java, we have to unroll the loop and handle it with timeouts.

	var i=0;

	// Temporary redefinition to cure a compiler warning.
	// Compiler warnings show useful stuff (especially in JS) so I want to keep them on
	var loop = function(){};
	var mt = this;
	loop = function(success)
	{

		if (success)
		{
			callback(true);
			return;
		}

		if (i < mt.availableTransports.size())
		{
			mt.availableTransports.get(i).isAlive(within, check, timeout, loop);
			i++;
		}
		else
		{
			// It appears all available transports are dead. We should reconnect
			if (!reconnect)
				callback(false);

			try
			{

				mt.setState(Trap.Endpoint.State.SLEEPING);
				mt.reconnect(timeout, function() {
					callback(mt.getState() == Trap.Endpoint.State.OPEN);
				});

			}
			catch (e)
			{
				mt.logger.error("Setting TrapEndpoint to state ERROR because reconnect failed. We don't know currently how to recover from this state, so the connection is dropped");
				mt.setState(Trap.Endpoint.State.ERROR);
			}

			callback(false);
		}
	};

	// Kick the callback loop into action
	loop(false);

};

//Abstract method (for subclass usage)
Trap.Endpoint.prototype.reconnect = function(timeout, callback) {};

//These callbacks replace the Delegate pattern used in Java.
/**
 * Called when the Trap endpoint has received byte data from the other end.
 * this.method executes in a Trap thread, so it should only perform minimal
 * operations before returning, in order to allow for maximum throughput.
 * 
 * @param data
 *            The data received.
 */
Trap.Endpoint.prototype.onmessage = function(evt){};

/**
 * Called when Trap changes state. Includes both the new state, and the
 * previous one.
 * 
 * @param newState
 *            The state Trap changed to.
 * @param oldState
 *            The previous state.
 */
Trap.Endpoint.prototype.onstatechange = function(evt){};

/**
 * Called when a Trap Endpoint knows it has failed to send some messages.
 * this.can occur when the Trap Endpoint is killed forcibly, loses all its
 * transports while still having an outgoing buffer, or fails to wake up a
 * client that has disconnected all its transports normally.
 * <p>
 * Note that there are conditions when Trap may unwittingly lose data (such
 * as data sent during a switch from unauthenticated -> authenticated
 * session, when the authentication is triggered from the remote side), so
 * the sum of data received by the other end, and called on this.method, may
 * be different. Nevertheless, any data returned by this.method definitely
 * failed to send.
 * 
 * @param datas
 *            A collection of transportable objects that failed sending.
 *            Usually byte arrays, but may contain TrapObject instances.
 */
Trap.Endpoint.prototype.onfailedsending = function(evt){};

/* Internal methods follow */

Trap.Endpoint.prototype.createMessage = function()
{
	return new Trap.Message().setTransportId(this.trapID).setFormat(this.trapFormat);
};

Trap.Endpoint.prototype.sendMessage = function(message)
{

	// There's a specific state (sleeping) that allows us to send a message by waking up the session
	if (this.getState() == Trap.Endpoint.State.SLEEPING)
	{
		// TODO: Wakeup
		// Wakeup comes defer, for defer may block. Then we must wait until defer unblocks.
		
		if (message.messageId == 0)
		{
			var mId = this.messageId++;
			if (mId > this.maxMessageId)
				this.maxMessageId = mId = 1;
			message.messageId = mId;
		}

		// Defer message.
		this.deferMessage(message);
		return;
	}

	// All other states do not allow the sending of messages.
	if (this.getState() != Trap.Endpoint.State.OPEN && message.getOp() != Trap.Message.Operation.END) // EXCEPT if we are (re-)sending the END message to terminate
		throw "Tried to send to non-open Trap session";
	
	if (message.messageId == 0)
	{
		var mId = this.messageId++;
		if (mId > this.maxMessageId)
			this.maxMessageId = mId = 1;
		message.messageId = mId;
	}

	this.deferMessage(message);
	this.kickSendingThread();
};

Trap.Endpoint.prototype.kickSendingThread = function()
{
	if (!this.sending)
	{
		this.sending = true;
		var mt = this;
		setTimeout(function() {mt._sendFun(); }, 10);
	}
};

Trap.Endpoint.prototype._sendFun = function()
{
	try
	{

		for(;;) {
			var first = null;
			if (this.messageQueueSize > 0)
			{
				try
				{
					first = this.availableTransports.get(0);
				}
				catch (t){}
				if (first != null)
					while (first.isAvailable())
					{
						try
						{
							var m = this.peekDeferredMessage();
							if(m == null || typeof(m) == "undefined")
								break;
							
							first.send(m, this.messageQueueSize > 1);
							this.popDeferredMessage();
						}
						catch (e)
						{
							this.logger.debug(e);
							
							// What should happen if we get an exception here? We don't want this loop to continue, that's for sure.
							// The first transport is clearly inadequate for the task.
							if (first.isAvailable())
							{
								// Now, the problem here is that the regular API only allows us to do a graceful disconnect.
								// If we do that, though, recovery code won't be initialised.
								mt.logger.warn("Forcibly removing transport {} from available due to infinite loop protection. This code should not occur with a well-behaved transport.", first.getTransportName());
								mt.logger.warn("Caused by {}", e);
								
								first.forceError();
							}
							else
							{
								// Transport is no longer unavailable, loop should be broken.
							}
						}
					}
			}
			if(this.messageQueueSize == 0 || first == null) {
				this.sending = false;
				return;
			}
		}
	}
	catch(t)
	{
		this.logger.log(t);
	}
};

Trap.Endpoint.prototype.ttStateChanged = function(newState, oldState, transport)
{
	if (newState == Trap.Transport.State.AVAILABLE)
	{
		this.addTransportToAvailable(transport);
		this.kickSendingThread();
		return;
	}

	// newState is NOT available. Remove the transport from availableTransports, if it was there
	this.availableTransports.remove(transport);

	// Now we'll enter failure modes.
	if (newState == Trap.Transport.State.DISCONNECTED || newState == Trap.Transport.State.ERROR)
	{
		if (this.getState() == Trap.Endpoint.State.CLOSED || this.getState() == Trap.Endpoint.State.CLOSING)
		{

			// Make sure we update our state properly when all transports have disconnected.
			if (this.getState() == Trap.Endpoint.State.CLOSING)
			{

				// Verify if this was the last open transport.
				for (var i = 0; i < this.transports.size(); i++)
				{
					var t = this.transports.get(i);
					if (t.getState() != Trap.Transport.State.ERROR && t.getState() != Trap.Transport.State.DISCONNECTED)
						return; // If there is at least one open transport, we won't change state.
				}

				this.setState(Trap.Endpoint.State.CLOSED);

			}
		}
	}
};

Trap.Endpoint.prototype.deferMessage = function(message)
{
	// Check the queue length.
	// Remember to exclude Trap's own messages from the queue limit
	if (this.messageQueueSize > this.maxQueueSize && message.getOp() == Trap.Message.Operation.MESSAGE)
	{
		// JavaScript has no blocking mode.
		throw "Failed to defer a message as the message defer queue is full";
	}

	this.messageQueue.addLast(message);
	/*try
	if (this.byteQueueSize)
	{
		// TODO: FIXME!!!

		{
			messageQueueSize += message.serialize().length;
		}
		catch (IOException e)
		{
			messageQueue.removeLast();
			throw new TrapException("Failed to defer a message due to an exception", e);
		}

		throw "Byte queue size unsupported";
	}
	else
	{*/
	this.messageQueueSize++;
	//}
};

Trap.Endpoint.prototype.peekDeferredMessage = function()
{
	return this.messageQueue.peek();
};

Trap.Endpoint.prototype.popDeferredMessage = function()
{
	var m = this.messageQueue.remove(0);
	this.messageQueueSize--;
	return m;
};

Trap.Endpoint.prototype.addTransportToAvailable = function(t)
{
	
	var added = false;
	
	for (var i = 0; i < this.availableTransports.size(); i++)
	{
		var c = this.availableTransports.get(i);

		// Priority goes from negative to positive (most to least preferred)
		if (c.getTransportPriority() > t.getTransportPriority())
		{
			this.availableTransports.add(i, t);
			added = true;
			break;
		}
	}

	if (!added)
		this.availableTransports.addLast(t);
	
	if (this.availableTransports.size() > this.maxActiveTransports)
	{
		var t = this.availableTransports.getLast();
		this.logger.debug("Disconnecting transport [{}] as the max active transports were exceeded. ({} active, {} max)", t.getTransportName(), this.availableTransports.size(), this._maxActiveTransports);
		t.disconnect();
	}
};

Trap.Endpoint.prototype.asyncReceive = function()
{

	for (;;)
	{
		var message = this.asyncMessages.get(false);
		
		if (message != null)
		{
			this.executeMessageReceived(message.m, message.t);
			this.asyncMessages.free();
		}
		else
			return;
	}

}

Trap.Endpoint.prototype.ttMessageReceived = function(message, transport)
{
	if (this.async && (message.getMessageId() != 0))
	{
		this.asyncMessages.put(message, transport);
		var mt = this;
		setTimeout(function() { mt.asyncReceive(); }, 0);
	}
	else
	{
		this.executeMessageReceived(message, transport);
	}
}

Trap.Endpoint.prototype.executeMessageReceived = function(message, transport)
{
	switch (message.getOp())
	{
	case 1:
		this.onOpen(message, transport);
		break;

	case 2:
		this.onOpened(message, transport);
		break;

	case 3:
		this.onClose(message, transport);
		break;

	case 4:
		this.onEnd(message, transport);
		break;

	case 5:
		this.onChallenge(message, transport);
		break;

	case 6:
		this.onError(message, transport);
		break;

	case 8:
		this.onMessage(message, transport);
		break;

	case 16:
		this.onOK(message, transport);
		break;

	case 17:
		this.onPing(message, transport);
		break;

	case 18:
		this.onPong(message, transport);
		break;

	case 19:
		this.onTransport(message, transport);
		break;

	default:
		return;

	}

};

Trap.Endpoint.prototype.onTransport = function(message, transport)
{
	// Transport specific messages. May require us to reconfigure a different transport.
	// This is our hook for future extensions.
};

/*
 * Ping/Pong events are generally a transport-specific concern.
 * The events will be received by the TrapEndpoint, but handled by the transports.
 */
Trap.Endpoint.prototype.onPong = function(message, transport)
{
};

Trap.Endpoint.prototype.onPing = function(message, transport)
{
};

/*
 * An OK will acknowledge a successful operation. This should be a TODO...
 */
Trap.Endpoint.prototype.onOK = function(message, transport)
{
};

Trap.Endpoint.prototype.onMessage = function(message, transport)
{
	this._dispatchMessageEvent(message);
};

if (Trap.useBinary)
{
	// Fallback approach
	Trap.Endpoint.prototype._dispatchMessageEvent = function(message) {
		var evt = {
				type: "message",
				message: message.data,
				data: message.data,
				string: message.string,
				buffer: message.data.buffer.slice(message.data.byteOffset, message.data.byteOffset + message.data.byteLength)
		};
		
		this._dispatchEvent(evt);
	}
	
	if (Trap._useGetters)
	{
		Trap.Endpoint.prototype._dispatchMessageEvent = function(message) {
			var evt = {
					type: "message",
					get message() { return message.data },
					get data() { return message.data },
					get string() { return message.string },
					get buffer() { return message.data.buffer.slice(message.data.byteOffset, message.data.byteOffset + message.data.byteLength); }
			};
			
			this._dispatchEvent(evt);
		}
	}
}
else
{
	Trap.Endpoint.prototype._dispatchMessageEvent = function(message) {
		var evt = {
				type: "message",
				message: message.string,
				data: message.string,
				string: message.string
		};
		
		this._dispatchEvent(evt);
	}
}

/*
 * Errors should be handled. Onerror will most likely mean that the connection 
 * has reached an unrecoverable state and must be discarded. The application MUST be
 * notified of this state.
 */
Trap.Endpoint.prototype.onError = function(message, transport)
{
	this.setState(Trap.Endpoint.State.ERROR);
};

Trap.Endpoint.prototype.onChallenge = function(message, transport)
{
};

Trap.Endpoint.prototype.onEnd = function(message, transport)
{

	if (this.getState() == Trap.Endpoint.State.CLOSING)
	{

		for (var i=0; i<this.transports.size(); i++)
			this.transports.get(i).disconnect();

		this.setState(Trap.Endpoint.State.CLOSED);

		// TODO: Should this do some more cleanup here? Can we reopen this object? If we can't reopen, should we note it in the state somehow?
	}
	else
	{
		this.setState(Trap.Endpoint.State.CLOSING);
		try
		{
			this.sendMessage(this.createMessage().setOp(Trap.Message.Operation.END));
		}
		catch (e)
		{
			// TODO: Can we handle this error gracefully-er?
			this.logger.warn(e);


			for (var i=0; i<this.transports.size(); i++)
				this.transports.get(i).disconnect();
		}
	}

};

Trap.Endpoint.prototype.onClose = function(message, transport)
{
};

Trap.Endpoint.prototype.onOpened = function(message, transport)
{

	if (this.getState() == Trap.Endpoint.State.CLOSED)
		return;

	if (this.getState() == Trap.Endpoint.State.CLOSING)
		return;

	if (this.getState() == Trap.Endpoint.State.ERROR)
		return;

	if (this.trapID == 0)
		this.setTrapID(message.getTransportId());

	this.setState(Trap.Endpoint.State.OPEN);

};

Trap.Endpoint.prototype.setState = function(newState)
{
	if (newState == this._state)
		return; // Department of redundancy department.

	var oldState = this._state;
	this._state = newState;
	
	this.logger.debug("TrapEndpoint changing state from {} to {}.", oldState, newState);

	this._dispatchEvent({type: "statechange", newState: newState, oldState: oldState});

	if (newState == Trap.Endpoint.State.OPEN)
		this._dispatchEvent({type: "open"});

	if (newState == Trap.Endpoint.State.CLOSED)
		this._dispatchEvent({type: "close"});

	if (newState == Trap.Endpoint.State.ERROR)
	{
		this._dispatchEvent({type: "error"});
		
		for (var i=0; i<this.transports.size(); i++)
			this.transports.get(i).disconnect();
	}
	
	if (newState == Trap.Endpoint.State.CLOSED || newState == Trap.Endpoint.State.CLOSING || newState == Trap.Endpoint.State.ERROR)
		if (this.keepaliveTask)
			clearTimeout(this.keepaliveTask);
};

Trap.Endpoint.prototype.onOpen = function(message, transport)
{

	if (this.getState() == Trap.Endpoint.State.CLOSED)
		return;

	if (this.getState() == Trap.Endpoint.State.CLOSING)
		return;

	if (this.getState() == Trap.Endpoint.State.ERROR)
		return;

	// If the transport is AVAILABLE that means it is authenticated.
	// Otherwise, the setAuthentication() stage of addTransport() would make it UNAVAILABLE
	if (transport.getState() == Trap.Transport.State.AVAILABLE)
	{
		try
		{
			transport.sendMessage(createOnOpenedMessage(message), false);
			this.setState(Trap.Endpoint.State.OPEN);
		}
		catch (e)
		{
			this.logger.warn(e);
		}
	}
};

Trap.Endpoint.prototype.createOnOpenedMessage = function(message)
{
	// Send new OPENED message
	return this.createMessage().setOp(Trap.Message.Operation.OPENED);
};

Trap.Endpoint.prototype.ttMessagesFailedSending = function(messages, transport)
{
	for (var i=0; i<messages.length; i++)
	{
		var message = messages[i];
		
		for (var j=0; i<this.messageQueue.size(); j++)
		{
			var qMessage = this.messageQueue.get(j);
			if (qMessage.messageId > message.messageId)
			{
				this.messageQueue.add(j, message);
				message = null;
				break;
			}
		}
		
		if (message != null)
			this.messageQueue.add(message);
		
	}
};

Trap.Endpoint.prototype.getKeepaliveInterval = function()
{
	return this.keepaliveInterval;
}

Trap.Endpoint.prototype.setKeepaliveInterval = function(newInterval)
{
	this.keepaliveInterval = newInterval;
	
	// Forward apply on all transports
	for (var i = 0; i < this.transports.size(); i++)
		this.transports.get(i).setKeepaliveInterval(newInterval);
	
	var mTimer = this.keepaliveInterval;
	
	if ((mTimer == Trap.Keepalive.Policy.DEFAULT) || (mTimer == Trap.Keepalive.Policy.DISABLED))
		return;
	
	if (this.keepaliveTask != null)
		clearTimeout(this.keepaliveTask);

	var mt = this;
	this.keepaliveTask = setTimeout(function() { mt._keepaliveFun(); }, mTimer * 1000);
}

Trap.Endpoint.prototype._keepaliveFun = function()
{
	// Conditions that should cause this task to exit.
	if ((this.getState() == Trap.Endpoint.State.CLOSING) || (this.getState() == Trap.Endpoint.State.CLOSED) || (this.getState() == Trap.Endpoint.State.ERROR))
		return;
	
	if ((this.getKeepaliveInterval() == Trap.Keepalive.Policy.DISABLED) || (this.getKeepaliveInterval() == Trap.Keepalive.Policy.DEFAULT))
		return;
	
	// Calculate the expected time we would need for keepalives to be working
	var expectedTime = new Date().valueOf() - (this.keepaliveInterval * 1000) - this.keepaliveExpiry;

	// Now verify all transports are within that time.
	for (var i=0; i<this.transports.size(); i++)
	{
		var t = this.transports.get(i);
		
		// Check that the transport is active
		if (!t.isConnected())
		{
			// Inactive transports are excused from keepalives
			continue;
		}

		if (t.lastAlive < expectedTime)
		{
			// This transport is not conforming.
			this.logger.debug("Transport {} is not compliant with the keepalive timers. Last alive reported was {}, but expected {}", t.getTransportName(), t.lastAlive, expectedTime );
			
			try
			{
				// Perform a manual check
				var mt = this;
				t.isAlive(this.keepaliveExpiry, true, this.keepaliveExpiry, function(rv) {
					if(!rv)
					{
						mt.logger.info("Disconnecting transport {} because it had timed out while not performing its own checks", t.getTransportName());
						t.disconnect();
					}
				});
			}
			catch (e)
			{
				this.logger.error("Exception while checking non-conforming transport", e);
			}
		}
	}
	
	// Now reschedule ourselves
	// Performing this jump will prevent a race condition from making us spiral out of control
	var mTimer = this.keepaliveInterval;
	
	if ((mTimer == Trap.Keepalive.Policy.DEFAULT) || (mTimer == Trap.Keepalive.Policy.DISABLED))
		return;

	var mt = this;
	this.keepaliveTask = setTimeout(function() { mt._keepaliveFun(); }, mTimer * 1000);
}
	
Trap.Endpoint.prototype.setKeepaliveExpiry = function(newExpiry)
{
	this.keepaliveExpiry = newExpiry;
	for (var i = 0; i < this.transports.size(); i++)
		this.transports.get(i).setKeepaliveExpiry(newExpiry);
}


	/**
	 * This subclass defines the possible message operations of a TrapMessage.
	 * For Trap, this is the complete subset of operations supported, for this
	 * version, and may not be extended without requiring a clean break. That
	 * is, Trap endpoints should never silently ignore invalid operations, so
	 * remote Trap endpoints MUST ensure they do not send commands that are
	 * invalid.
	 * 
	 * @author Vladimir Katardjiev
	 */

Trap.Message = function(inData)
{
	
	this._data = [];
	this._authData = null;
	this._transportId = 0;
	this._format = (Trap.useBinary ? Trap.Message.Format.REGULAR : Trap.Message.Format.SEVEN_BIT_SAFE);
	this._op = Trap.Message.Operation.OK;
	
	this._messageId = 0;
	
	
	// Getters/setters
	Trap._compat.__defineGetterSetter(this, "messageId");
	
	Trap._compat.__defineGetter(this, "data", function() {
		return this._data;
	});
	
	Trap._compat.__defineGetter(this, "string", function() {
		return String.fromUTF8ByteArray(this._data);
	});
	Trap._compat.__defineGetter(this, "authData", function() {
		return this._authData;
	});
	Trap._compat.__defineGetter(this, "transportId", function() {
		return this._transportId;
	});
	Trap._compat.__defineGetter(this, "format", function() {
		return this._format;
	});
	Trap._compat.__defineGetter(this, "op", function() {
		return this._op;
	});
	
	Trap._compat.__defineSetter(this, "data", function(newData) {
		
		if (typeof(newData) == "string")
			this._data = newData.toUTF8ByteArray();
		else if (typeof(newData.length) == "number" || typeof(newData.byteLength) == "number")
			this._data = newData;
		else if (typeof(newData) == "number")
			this._data = [newData];
		else
			throw "Invalid data supplied; not an array, not a string, not a number";
		
		return this;
	});
	
	Trap._compat.__defineSetter(this, "authData", function(newAuthData){
		
		if (!!newAuthData && newAuthData.length > 65535) 
			throw "authData cannot be more than 65535 bytes";
		
		if (!!newAuthData && newAuthData.length != newAuthData.toUTF8ByteArray().length)
			throw "authData was not a US-ASCII string";
		
		this._authData = newAuthData;
		return this; 
	});
	
	Trap._compat.__defineSetter(this, "transportId", function(newId){
		
		if (newId > 0x0FFFFFFF)
			throw "Transport ID [" + newId + "] too large to be transported through Trap";
		
		if (newId < 0)
			throw "Transport IDs must be unsigned integers"; 

		
		this._transportId = newId;
		return this;
	});
	
	Trap._compat.__defineSetter(this, "format", function(newFormat){
		this._format = newFormat;
		return this;
	});
	
	Trap._compat.__defineSetter(this, "op", function(newOp){
		this._op = newOp;
		return this;
	});
	
	if (typeof(inData) != "undefined")
		this.deserialize(inData, 0, inData.length);
};

Trap.Message.Operation =
{
		
		OPEN: 1,
		OPENED: 2,
		CLOSE: 3,
		END: 4,
		CHALLENGE: 5,
		ERROR: 6,
		MESSAGE: 8,
		OK: 16,
		PING: 17,
		PONG: 18,
		TRANSPORT: 19,
		name: function(op)
		{
			switch (op)
			{
				case 1:
					return "OPEN";
					
				case 2:
					return "OPENED";
					
				case 3:
					return "CLOSE";
					
				case 4:
					return "END";
					
				case 5:
					return "CHALLENGE";
					
				case 6:
					return "ERROR";
					
				case 8:
					return "MESSAGE";
					
				case 16:
					return "OK";
					
				case 17:
					return "PING";
					
				case 18:
					return "PONG";
					
				case 19:
					return "TRANSPORT";
					
				default:
					return "Unknown op type: " + op;
			}
		},
		
		getType: function(t)
		{
			return t;
		},
};

Trap.Message.Format = 
{
	REGULAR: "Trap.Message.Format.Regular",
	SEVEN_BIT_SAFE: "Trap.Message.Format.7bit"
};

Trap.Message.prototype.getBits = function(src, startBit, endBit)
{
	var mask = (Math.pow(2, endBit - startBit + 1) - 1);
	mask = mask << (32 - endBit);
	var rv = (src & mask) >> (32 - endBit);
	return rv;
};

Trap.Message.prototype.writeInt7 = function(src, bos)
{
	bos.write(this.getBits(src, 5, 11));
	bos.write(this.getBits(src, 12, 18));
	bos.write(this.getBits(src, 19, 25));
	bos.write(this.getBits(src, 26, 32));
};

Trap.Message.prototype.writeInt8 = function(src, bos)
{
	bos.write(this.getBits(src, 1, 8));
	bos.write(this.getBits(src, 9, 16));
	bos.write(this.getBits(src, 17, 24));
	bos.write(this.getBits(src, 25, 32));
};

Trap.Message.prototype.serialize = function(array)
{
	var bos = new Trap.ByteArrayOutputStream();
	
	if (this.format == Trap.Message.Format.SEVEN_BIT_SAFE)
		this.serialize7bit(bos);
	else
		this.serialize8bit(bos);
	
	if (array)
		return bos.toArray();
	else
		return bos.toString();
};

Trap.Message.prototype.serialize8bit = function(bos)
{
	// Make 8-bit assertions
	if (this.data.length >= Math.pow(2, 32))
		throw "Asked to serialize more than 2^32 bytes data into a 8-bit Trap message";
	
	var b = 0;
	
	// First byte: |1|0| MESSAGEOP |
	b |= this.op | 0x80;
	bos.write(b);
	
	var authLen = (this.authData != null ? this.authData.length : 0);
	
	// Second byte: Null (by spec)
	bos.write(0);
	
	// Third byte: Bits 3 - 9 of authLen
	bos.write(this.getBits(authLen, 17, 24));
	
	// Fourth byte: Bits 10 - 16 of authLen
	bos.write(this.getBits(authLen, 25, 32));
	
	// Transport ID!
	this.writeInt8(this.getMessageId(), bos, true);
	this.writeInt8(this.transportId, bos, true);
	this.writeInt8((this.data.byteLength ? this.data.byteLength : this.data.length), bos, false);
	
	if (authLen > 0)
		bos.write(this.authData);
	
	bos.write(Trap.useBinary ? this.data : String.fromUTF8ByteArray(this.data));
};

Trap.Message.prototype.serialize7bit = function(bos)
{
	if (this.data.length >= Math.pow(2, 28))
		throw "Asked to serialize more than 2^28 bytes data into a 7-bit Trap message";
	
	var b = 0;
	
	// First byte: |0|0| MESSAGEOP |
	b |= this.op;
	bos.write(b);
	
	var authLen = (this.authData != null ? this.authData.length : 0);
	
	// Second byte: First two bits of authLen
	bos.write(this.getBits(authLen, 17, 18));
	
	// Third byte: Bits 3 - 9 of authLen
	bos.write(this.getBits(authLen, 19, 25));
	
	// Fourth byte: Bits 10 - 16 of authLen
	bos.write(this.getBits(authLen, 26, 32));
	
	// Transport ID!
	this.writeInt7(this.getMessageId(), bos, true);
	this.writeInt7(this.transportId, bos, true);
	this.writeInt7((this.data.byteLength ? this.data.byteLength : this.data.length), bos, false);
	
	// This will corrupt non-US-ASCII authData. Trap spec forbids it, so we're correct in doing so. 
	if (authLen > 0)
		bos.write(this.authData);

	bos.write(Trap.useBinary ? this.data : String.fromUTF8ByteArray(this.data));
	
};
	
	/**
	 * Attempts to deserialize a TrapMessage.
	 * 
	 * @param rawData
	 * @param length
	 * @param offset
	 * @return -1 if it could not parse a message from the data, the number of
	 *         bytes consumed otherwise.
	 * @throws UnsupportedEncodingException
	 *             if the message encoding is not supported
	 */
Trap.Message.prototype.deserialize = function(rawData, offset, length)
{

	
	if ((offset + length) > rawData.length)
		throw "Offset and length specified exceed the buffer";
	
	if (length < 16)
		return -1;
	
	var authLen;
	var contentLen;
	
	if ((rawData[offset + 0] & 0x80) != 0)
	{
		// 8-bit
		this.format = Trap.Message.Format.REGULAR;
		this.op = Trap.Message.Operation.getType(rawData[offset + 0] & 0x3F);
		
		authLen = rawData[offset + 2] << 8 | rawData[offset + 3];
		this.messageId = rawData[offset + 4] << 24 | rawData[offset + 5] << 16 | rawData[offset + 6] << 8 | rawData[offset + 7];
		this.transportId = rawData[offset + 8] << 24 | rawData[offset + 9] << 16 | rawData[offset + 10] << 8 | rawData[offset + 11];
		contentLen = rawData[offset + 12] << 24 | rawData[offset + 13] << 16 | rawData[offset + 14] << 8 | rawData[offset + 15];
	}
	else
	{
		// 7-bit
		this.format = Trap.Message.Format.SEVEN_BIT_SAFE;
		this.op = Trap.Message.Operation.getType(rawData[offset + 0] & 0x3F);
		
		authLen = ((rawData[offset + 1] & 0x03) << 14) | ((rawData[offset + 2] & 0x7F) << 7) | ((rawData[offset + 3] & 0x7F) << 0);
		this.messageId = ((rawData[offset + 4] & 0x7F) << 21) | ((rawData[offset + 5] & 0x7F) << 14) | ((rawData[offset + 6] & 0x7F) << 7) | ((rawData[offset + 7] & 0x7F) << 0);
		this.transportId = ((rawData[offset + 8] & 0x7F) << 21) | ((rawData[offset + 9] & 0x7F) << 14) | ((rawData[offset + 10] & 0x7F) << 7) | ((rawData[offset + 11] & 0x7F) << 0);	
		contentLen = ((rawData[offset + 12] & 0x7F) << 21) | ((rawData[offset + 13] & 0x7F) << 14) | ((rawData[offset + 14] & 0x7F) << 7) | ((rawData[offset + 15] & 0x7F) << 0);
	}
	
	// Verify that there's enough remaining content to read the message.
	var messageSize = 16 + authLen + contentLen;
	
	if (length < messageSize)
		return -1; // Cannot successfully read the remaining values.
		
	// Range of authHeader = (12, authLen)
	var startByte = offset + 16;
	
	// We have an authentication header!
	if (authLen > 0)
	{
		this.authData = Trap.subarray(rawData, startByte, startByte + authLen);
		
		// AuthData is a string, we should decode it...
		this.authData = String.utf8Decode(this.authData);
		
		startByte += authLen;
	}
	else
	{
		this.authData = null;
	}
	
	// Copy the data
	// We won't UTF-8 decode at this stage. If we do, it'll be harder to construct the .data and .string
	// properties when we dispatch the event. Instead, store data as an array and leave it to higher ups
	// to decide the representation
	this.data = Trap.subarray(rawData, startByte, startByte + contentLen);
	
	// The number of bytes consumed. This allows multiple messages to be parsed from the same data block.
	return messageSize;
};
Trap.ClientEndpoint = function(configuration, autoConfigure)
{
	
	this.autoConfigure = (typeof(autoconfigure) == "boolean" ? autoConfigure : true);
	this.cTransport;

	/**
	 * The list of transports that have not been tried before or after all
	 * transports failed and being tried again.
	 */
	this.transportsToConnect	= new Trap.List();

	/**
	 * The transports that have failed in some non-fatal way. There will be an
	 * attempt taken in the future to recover them.
	 */
	this.failedTransports	= new Trap.List();

	this.activeTransports = new Trap.List();

	this.recovering			= false;

	Trap.Endpoint.prototype.constructor.call(this);
	this._maxActiveTransports 	= 1;

	this.trapID = 0; // Allow the server to override our trap ID.

	// Load the appropriate transports
	for (var tName in Trap.Transports)
	{
		var t = Trap.Transports[tName];

		if (t.prototype && typeof(t.prototype.setTransportPriority) == "function" ) // is a transport 
		{
			var transport = new t();
			this.logger.trace("Initialising new Transport for client: {}", transport.getTransportName());

			if (!transport.canConnect())
			{
				this.logger.trace("Skipping it; it cannot connect");
				continue;
			}
			
			if (Trap.useBinary && !transport.supportsBinary)
			{
				this.logger.info("Skipping it; Trap Binary Mode requested, but transport only supports text");
				continue;
			}
			
			// Unlike Java, TrapEndpoint only defines one addTransport, and that one sets
			// this object as delegate. Thus, we're done.
			this.addTransport(transport);
		}
	}
	
	if (this.transports.size() == 0)
		throw "No transports could be initialised; either no transports could connect, or transports did not support binary mode (if requested)";
	
	if ((configuration != null) && (configuration.trim().length > 0))
	{
		
		// Check if we need to redo the configuration.
		if (configuration.startsWith("ws://") || configuration.startsWith("wss://"))
		{
			// WebSocket Transport
			configuration = "trap.transport.websocket.wsuri = " + configuration;
		}
		else if (configuration.startsWith("socket://"))
		{
			// TODO: Socket URI
		}
		else if (configuration.startsWith("http://"))
		{
			configuration = "trap.transport.http.url = " + configuration;
		}
		else if (!configuration.startsWith("trap"))
			throw "Unknown configuration; invalid format or garbage characters entered";
		
	}
	
	this.configure(configuration);
	
	this.transportRecoveryTimeout	= 15 * 60 * 1000;

	var mt = this;
	setTimeout(function() {
		
		mt.logger.trace("##### CLIENT OPEN ####");
		mt.logger.trace("Config is: {}", mt.config.toString());
		for (var i = 0; i < mt.transports.size(); i++)
		{
			var t = mt.transports.get(i);
			mt.logger.trace("Transport [{}] is enabled: {}", t.getTransportName(), t.isEnabled());
		}
		
		mt.setState(Trap.Endpoint.State.OPENING);
		mt.doOpen();
		
		// Also start recovery
		var recoveryFun = function()
		{
			
			mt.failedTransports.clear();
			
			for (var i=0; i<mt.transports.size(); i++)
			{
				if (mt.getState() == Trap.Endpoint.State.CLOSING || mt.getState() == Trap.Endpoint.State.CLOSED || mt.getState() == Trap.Endpoint.State.CLOSED)
					return;
				
				var t = mt.transports.get(i);
				
				// Check if t is active
				var active = false;
				for (var j=0;j<mt.activeTransports.size(); j++)
				{
					if (mt.activeTransports.get(j) == t)
					{
						active = true;
						break;
					}
				}
				
				if (!active)
					mt.transportsToConnect.add(t);
			}
			
			if (!mt.recovering)
				mt.kickRecoveryThread();
			
			setTimeout(recoveryFun, mt.transportRecoveryTimeout);
		}
		
		setTimeout(recoveryFun, mt.transportRecoveryTimeout);
		
	}, 0);
};

Trap.ClientEndpoint.prototype = new Trap.Endpoint;
Trap.ClientEndpoint.prototype.constructor = Trap.ClientEndpoint;

Trap.ClientEndpoint.prototype.parseConfiguration = function(configuration)
{
	return new Trap.CustomConfiguration(configuration);
};

Trap.ClientEndpoint.prototype.open = function()
{

};

Trap.ClientEndpoint.prototype.doOpen = function()
{
	// If the list of transports that still can be used and is empty -> die!
	if (this.transports.size() == 0)
	{
		this.setState(Trap.Endpoint.State.ERROR);
		throw "No transports available";
	}
	// Clean all the failed transports so far, we'll retry all of them anyway.
	this.failedTransports.clear();
	this.activeTransports.clear();
	this.availableTransports.clear();
	this.transportsToConnect.clear();

	// Let transportsToConnect be the list of transports that we haven't tried.
	this.transportsToConnect.addAll(this.transports);

	// Pick the first untested transport (the one with the highest priority)
	this.kickRecoveryThread();
};

//One of our transports has changed the state, let's see what happened...
Trap.ClientEndpoint.prototype.ttStateChanged = function(newState, oldState, transport)
{

	this.logger.debug("Transport {} changed state to {}", transport.getTransportName(), newState);
	// Super will manage available transports. All we need to consider is what action to take.
	Trap.Endpoint.prototype.ttStateChanged.call(this, newState, oldState, transport);

	if (this.getState() == Trap.Endpoint.State.CLOSED || this.getState() == Trap.Endpoint.State.CLOSING || this.getState() == Trap.Endpoint.State.ERROR)
		return;

	// This is fine. We're not interested in disconnecting transports; super has already managed this for us.
	if (oldState == Trap.Transport.State.DISCONNECTING)
		return;

	// What to do if we lose a transport
	if (newState == Trap.Transport.State.DISCONNECTED || newState == Trap.Transport.State.ERROR)
	{

		this.activeTransports.remove(transport);

		// This was an already connected transport. If we have other transports available, we should silently try and reconnect it in the background
		if (oldState == Trap.Transport.State.AVAILABLE || oldState == Trap.Transport.State.UNAVAILABLE || oldState == Trap.Transport.State.CONNECTED)
		{

			if (this.activeTransports.size() != 0)
			{
				this.transportsToConnect.add(transport);
				this.kickRecoveryThread();
				return;
			}

			if (this.getState() == Trap.Endpoint.State.OPENING)
			{
				// The current transport failed. Just drop it in the failed transports pile.
				// (Failed transports are cycled in at regular intervals)
				this.failedTransports.add(transport);

				// Also notify recovery that we have lost a transport. This may schedule another to be reconnected.
				this.kickRecoveryThread();
				return;
			}
			else
			{

				var openTimeout = 1000;

				if (this.getState() == Trap.Endpoint.State.OPEN)
				{
					// We have to report that we've lost all our transports.
					this.setState(Trap.Endpoint.State.SLEEPING);

					// Adjust reconnect timeout
					this.canReconnectUntil = new Date().valueOf() + this.reconnectTimeout;

					// This is the first time, just reconnect immediately
					openTimeout = 0;
				}

				if (this.getState() != Trap.Endpoint.State.SLEEPING)
				{
					// We have nothing to do here
					return;
				}
				
				var mt = this;

				if (new Date().valueOf() < this.canReconnectUntil)
				{
					setTimeout(function() {

						try
						{
							mt.doOpen();
						}
						catch (e)
						{
							mt.logger.error("Error while reconnecting after all transports failed", e);
							return;
						}
						
					}, openTimeout);
					
				}
				
			}
		}
		else if (oldState == Trap.Transport.State.CONNECTING)
		{
			this.cycleTransport(transport, "connectivity failure");
		}
		else
		{
			// disconnecting, so do nothing
		}
	}

	if (newState == Trap.Transport.State.CONNECTED)
	{
		if (oldState == Trap.Transport.State.CONNECTING)
		{
			this.sendOpen(transport);
		}
		else
		{
			this.logger.error("Reached Trap.Transport.State.CONNECTED from a non-CONNECTING state. We don't believe in this.");
		}
	}
};

Trap.ClientEndpoint.prototype.ttMessageReceived = function(message, transport)
{
	if (transport == this.cTransport)
	{
		if (message.getOp() == Trap.Message.Operation.OPENED)
		{
			this.cTransport = null;
			// received configuration from the server
			if (this.autoConfigure && message.getData().length > 0)
				this.config.setStaticConfiguration(message.getData());
		}
		else
		{
			this.cycleTransport(transport, "illegal open reply message op");
			return;
		}
	}
	Trap.Endpoint.prototype.ttMessageReceived.call(this, message, transport);
};

Trap.ClientEndpoint.prototype.sendOpen = function(transport)
{
	var m = this.createMessage().setOp(Trap.Message.Operation.OPEN);
	var body = new Trap.Configuration();
	if (this.autoConfigure)
	{
		try
		{
			body.setOption(Trap.Configuration.CONFIG_HASH_PROPERTY, "not/yet/done");
		}
		catch (e)
		{
			this.logger.warn("Could not compute client configuration hash", e);
		};
	}
	
	if (this.connectionToken == null)
		this.connectionToken = Trap._uuid();
	
	body.setOption("trap.connection-token", this.connectionToken);
	m.setData(body.toString());
	
	try
	{
		transport.send(m, false);
	}
	catch (e)
	{
		this.cycleTransport(transport, "open message send failure");
	}
};

Trap.ClientEndpoint.prototype.cycleTransport = function(transport, reason)
{
	this.logger.debug("Cycling transports due to {} {}...", transport.getTransportName(), reason);
	transport.onmessage = function(){};
	transport.onstatechange = function(){};
	transport.onfailedsending = function(){};
	transport.disconnect();
	
	this.activeTransports.remove(transport);
	this.failedTransports.add(transport);
	
	// Recover only if we have active transports. Otherwise do open...
	if (this.transportsToConnect.size() == 0)
	{
		
		if (this.activeTransports.size() > 0)
		{
			// Let recovery take care of reopening.
			return;
		}
		
		if (this.getState() == Trap.Endpoint.State.OPENING)
		{
			this.logger.error("Could not open a connection on any transport...");
			this.setState(Trap.Endpoint.State.ERROR);
			return;
		}
		
		var mt = this;
		
		// Don't recycle!
		if (this._cycling)
			return;
		
		this._cycling = setTimeout(function()
		{
			try
			{
				this._cycling = null;
				mt.doOpen();
			}
			catch (e)
			{
				mt.logger.warn(e);
			}
		}, 1000);
	}
	else
		this.kickRecoveryThread();
};

Trap.ClientEndpoint.prototype.kickRecoveryThread = function()
{
	if (this.recovering)
		return;

	var mt = this;

	this.recovering = setTimeout(function() {

		// Don't reconnect transports if the endpoint doesn't want them to be.
		if (mt.state == Trap.Endpoint.State.CLOSED || mt.state == Trap.Endpoint.State.CLOSING || mt.state == Trap.Endpoint.State.ERROR)
			return;

		try
		{
			for (;;)
			{

				// Sort the connecting transports 
				// This ensures we always get the first transport

				mt.transportsToConnect.sort(function(o1, o2) {
					return o1.getTransportPriority() - o2.getTransportPriority();
				});

				var first = null;
				if (mt.transportsToConnect.size() > 0)
				{
					try
					{
						
						first = mt.transportsToConnect.remove(0);
						
						if (first != null)
						{
							
							var t = first;
							
							mt.logger.trace("Now trying to connect transport {}", t.getTransportName());
							
							if (!t.canConnect())
							{
								mt.logger.trace("Skipping: Transport cannot connect");
								continue;
							}
							
							if (!t.isEnabled())
							{
								mt.logger.trace("Skipping: Transport is disabled");
								continue;
							}
							
							 /* // Disable this code. This should really configure maxConnectingTransports and respect that...
							// Abort connection attempts if head transport is downprioritised.
							var downPrioritised = false;
							for (var i=0; i<mt.activeTransports.size(); i++)
								if (mt.activeTransports.get(i).getTransportPriority() < t.getTransportPriority())
									downPrioritised = true;
							
							if (downPrioritised)
							{
								mt.transportsToConnect.add(0, t);
								mt.logger.trace("Skipping: Transport is downprioritised (we'll try a higher prio transport first)");
								break;
							} // */
							
							t.init();	// Hook the delegate methods
							
							t.onmessage = function(e) { mt.ttMessageReceived(e.message, e.target, null); };
							t.onstatechange = function(e) { mt.ttStateChanged(e.newState, e.oldState, e.target, null); };
							t.onfailedsending = function(e) { mt.ttMessagesFailedSending(e.messages, e.target, null); };

							t.setAuthentication(mt.authentication);
							t.setTrapID(mt.trapID);
							t.setConfiguration(mt.config);
							
							mt.activeTransports.add(t);
							t.connect();
							
						}
					}
					catch (e)
					{
						if (!!first)
						{
							mt.failedTransports.add(first);
							mt.activeTransports.remove(first);
						}
					}
					
				}

				if (mt.transportsToConnect.size() == 0 || first == null)
				{
					mt.recovering = null;
					return;
				}
			}
		}
		catch (t)
		{
			mt.logger.warn(t);
			mt.recovering = null;
		}
		mt.recovering = null;
	}, 0);
};

Trap.ClientEndpoint.prototype.reconnect = function(timeout)
{
	// On the client, we'll use the transports list in order to reconnect, so we have to just d/c and clear available transports.
	for (var i = 0; i < this.transports.size(); i++)
		this.transports.get(i).disconnect();

	// After having jettisonned all transports, create new data structs for them
	this.availableTransports = new Trap.List();

	// Restart connection attempts
	this.doOpen();

	// Set a timeout reconnect
	var mt = this;
	if (timeout > 0)
		this.reconnectFunTimer = setTimeout(function() {

			if (mt.getState() != Trap.Endpoint.State.OPEN)
				mt.setState(Trap.Endpoint.State.CLOSED);

			mt.reconnectFunTimer = null;

		}, timeout);
};

Trap.ClientEndpoint.prototype.onOpened = function(message, transport)
{

	var rv = Trap.Endpoint.prototype.onOpened.call(this, message, transport);
	
	if (this.trapID != 0 && this.autoConfigure)
	{
		if (!!message.string && message.string.length > 0)
		{
			// Message data should contain new configuration
			this.logger.debug("Received new configuration from server...");
			this.logger.debug("Configuration was [{}]", message.string);
			this.configure(message.string);
			
			// Any transport that is currently non-active should be scheduled to connect
			// This includes transports that weren't connected in the first place (transport priorities may have changed)
			this.failedTransports.clear();
			
			for (var i=0; i<this.transports.size(); i++)
			{
				var t = this.transports.get(i);
				
				// Check if t is active
				var active = false;
				for (var j=0;j<this.activeTransports.size(); j++)
				{
					if (this.activeTransports.get(j) == t)
					{
						active = true;
						break;
					}
				}
				
				if (!active)
					this.transportsToConnect.add(t);
			}
			
			// Now make them connect
			this.kickRecoveryThread();
					
		}
	}
	
	return rv;

};

/**
 * Defines the methods available for interacting with the various Trap
 * transports.
 * <p>
 * Applications should not need to spend too much effort in configuring the
 * specifics of the Trap transports. At most, applications should suffice with
 * using the enable/disable functionality, and leave Trap to manage the rest.
 * 
 * @author Vladimir Katardjiev
 */
Trap.Transport = function(){};

Trap.Transport.Options = 
{
		Enabled: "enabled",
		ENABLED: "enabled",
		Priority: "priority",
};

Trap.Transport.State =
{
		DISCONNECTED: "trap.transport.state.DISCONNECTED",
		CONNECTING: "trap.transport.state.CONNECTING",
		CONNECTED: "trap.transport.state.CONNECTED",
		AVAILABLE: "trap.transport.state.AVAILABLE",
		UNAVAILABLE: "trap.transport.state.UNAVAILABLE",
		DISCONNECTING: "trap.transport.state.DISCONNECTING",
		ERROR: "trap.transport.state.ERROR",
};

/**
 * Checks whether the given Trap transport is enabled (i.e. it will react to
 * any calls other than configuration).
 * 
 * @return <i>true</i> if the transport is enabled, <i>false</i> otherwise.
 */
Trap.Transport.prototype.isEnabled = function(){};

/**
 * Enables this transport. Does not imply that this transport should
 * connect; {@link #connect()} must be called separately for that to happen.
 */
Trap.Transport.prototype.enable = function(){};

/**
 * Disables this transport, preventing it from participating in the
 * transport abstraction. Unlike {@link #enable()}, disable <b>does imply
 * the transport must close</b> and refuse to carry other messages. Disable
 * may not fail.
 */
Trap.Transport.prototype.disable = function(){};

/**
 * Checks if this transport is currently connected to the other end. Does
 * not imply whether or not it is possible for this transport to connect.
 * 
 * @return <i>true</i> if this transport object represents an active
 *         connection to the other end, <i>false</i> otherwise.
 */
Trap.Transport.prototype.isConnected = function(){};

/**
 * Signals to this transport that it should attempt to connect to the remote
 * endpoint. The transport may attempt to connect synchronously,
 * asynchronously or not at all according to its own configuration.
 * <p>
 * Not all transport instances are able to open an outgoing connection (e.g.
 * server instances) and, as such, some instances may throw an exception
 * when calling this method. If the transport does not support outgoing
 * connections, it must throw an exception immediately.
 * 
 * @throws TrapException
 *             If this transport does not support outgoing connections.
 */
Trap.Transport.prototype.connect = function(){};

/**
 * Signals to this transport that it must disconnect. The transport must
 * immediately take all measures to close the connection, must clean up as
 * much as it can, and may not throw any exceptions while doing so.
 * <p>
 * May NOT block.
 */
Trap.Transport.prototype.disconnect = function(){};

/**
 * Fetches this transport's priority, which is used in the comparable
 * implementation to sort transports, if needed. Currently unused.
 * 
 * @return The transport's priority
 */
Trap.Transport.prototype.getTransportPriority = function(){};

/**
 * Sets this transport's priority.
 * 
 * @param priority
 */
Trap.Transport.prototype.setTransportPriority = function(priority){};

/**
 * Gets this transport's name. The transport name is used for, among other
 * things, log outputs and configuration settings, must be alphanumeric and
 * contain no spaces.
 * 
 * @return The transport's name.
 */
Trap.Transport.prototype.getTransportName = function(){};

/**
 * Configures a specific transport setting (key/value)
 * 
 * @param configurationKey
 * @param configurationValue
 * @throws TrapException
 */
Trap.Transport.prototype.configure = function(configurationKey, configurationValue){};

/**
 * Configures a specific transport setting (key/value)
 * 
 * @param configurationKey
 * @param configurationValue
 * @throws TrapException
 */
Trap.Transport.prototype.configure = function(configurationKey, configurationValue){};

/**
 * Sets the Transport's configuration object. This configuration object is
 * shared with the parent.
 * 
 * @param configuration
 */
Trap.Transport.prototype.setConfiguration = function(configuration){};

/**
 * Returns a configuration string representing this transport's
 * configuration.
 * 
 * @return A String representation of the configuration of this
 *         TrapTransport.
 */
Trap.Transport.prototype.getConfiguration = function(){};

/**
 * Set an authentication instance for this transport, to be used for
 * authenticating any messages that need authentication.
 * 
 * @param authentication
 * @throws TrapException
 *             If the transport and Authentication instances are not
 *             mutually compatible. This transport should then be discarded.
 */
Trap.Transport.prototype.setAuthentication = function(authentication){};

/**
 * Queries if this transport can perform a connection, i.e. if it can act as
 * a client transport.
 * 
 * @return <i>true</i> if this transport can perform an outgoing connection,
 *         <i>false</i> otherwise.
 */
Trap.Transport.prototype.canConnect = function(){};

/**
 * Queries if this transport can accept incoming connections, i.e. if it can
 * act as a server.
 * 
 * @return <i>true</i> if this transport can receive incoming connections,
 *         <i>false</i> otherwise.
 */
Trap.Transport.prototype.canListen = function(){};

/**
 * Attempts to send a message with this transport. If the transport cannot
 * send this message, in full, right now, it MUST throw an exception. The
 * transport MUST NOT buffer messages if the <i>expectMore</i> flag is
 * false. The transport MAY buffer messages if <i>expectMore</i> is
 * <i>true</i> but this is not required.
 * 
 * @param message
 *            The message to send.
 * @param expectMore
 *            A flag signifying to the transport that more messages will be
 *            sent in a short timespan (less than 1ms). Some transports may
 *            wish to buffer these messages before sending to optimise
 *            performance.
 * @throws TrapException
 *             If an error occurred during the sending of the message(s).
 *             The exception MUST contain the message(s) that failed
 *             sending. If it contains more than one message, the order must
 *             be in the same order that send() was called.
 */
Trap.Transport.prototype.send = function(message, expectMore){};

/**
 * Asks if the transport is available for sending. Effectively checks the
 * transport's state for available, but this way is faster.
 * 
 * @return <i>true</i> if the transport can be used to send a message,
 *         <i>false</i> otherwise.
 */
Trap.Transport.prototype.isAvailable = function(){};

/**
 * Sets the Trap ID of this transport.
 * 
 * @param id
 */
Trap.Transport.prototype.setTrapID = function(id){};

/**
 * Returns the Trap ID of this transport.
 * 
 * @return The Trap ID.
 */
Trap.Transport.prototype.getTrapID = function(){};

/**
 * Fetches the transport's current state
 * 
 * @return The transport's current state.
 */
Trap.Transport.prototype.getState = function(){};

/**
 * Fetches the last known liveness timestamp of the transport. This is the
 * last time it received a message from the other end.
 * 
 * @return The timestamp of the last message received from the remote side.
 */
Trap.Transport.prototype.lastAlive = function(){};

/**
 * Attempts to verify if the transport is alive, or has been alive within a
 * certain number of milliseconds. Effectively, this can be used to trigger
 * a keepalive check of the transport if used with a <i>within</i> parameter
 * of 0 and a <i>check</i> parameter of true.
 * <p>
 * This function has a two-part purpose. The first is for the upper layer to
 * be able to check the last known liveness of the transport, to reduce the
 * discovery time of a dead connection. The second is to trigger a check for
 * a dead transport, when the application needs to know that it has active
 * connectivity.
 * <p>
 * Note that in normal operation, the transport itself will report when it
 * has disconnected; the upper layer does not need to concern itself with
 * this detail unless it specifically needs to know that it has connectivity
 * right now.
 * 
 * @param within
 *            Within how many milliseconds the last activity of the
 *            transport should have occurred before the transport should
 *            question whether it is alive.
 * @param check
 *            Whether the transport should attempt to check for liveness, or
 *            simply return false if the last known activity of the
 *            transport is not later than within.
 * @param timeout
 *            If check is true, how many milliseconds at most the liveness
 *            check should take before returning false anyway. The
 *            application can use this value if it has a time constraint on
 *            it.
 * @return <i>true</i> if the connection is currently alive (including if
 *         this function successfully re-established the connection),
 *         <i>false</i> otherwise.
 */
Trap.Transport.prototype.isAlive = function(within, check, timeout, callback){};

/**
 * Called when a Trap Transport has received a TrapMessage.
 * 
 * @param message
 */
Trap.Transport.prototype.onmessage = function(evt){};

/**
 * Called when the Trap Transport changes state.
 * 
 * @param newState
 * @param oldState
 */
Trap.Transport.prototype.onstatechange = function(evt){};

/**
 * Called when the Trap Transport knows that it has failed to send message(s)
 * 
 * @param messages
 */
Trap.Transport.prototype.onfailedsending = function(evt){};
Trap.AbstractTransport = function()
{

	Trap.EventObject.call(this);

	this._headersMap		= new Trap.Map();
	this._configuration		= new Trap.Configuration();
	this._prefix 			= "trap.transport." + this.getTransportName().toLowerCase();
	this._authentication		= new Trap.Authentication();

	this._delegate			= null;
	this._delegateContext	= null;

	this._availableKeys		= [];
	this._contextKeys		= [];
	this._contextMap		= new Trap.Map();

	this._transportPriority	= 0;

	this.logger = Trap.Logger.getLogger(this.getTransportName());
	this.fillAuthenticationKeys(this.availableKeys);

	Trap._compat.__defineSetter(this, 'transportPriority', function(newPrio) {
		this._transportPriority = newPrio;
	});
	Trap._compat.__defineGetter(this, 'transportPriority', function() {
		return this._transportPriority;
	});

	Trap._compat.__defineSetter(this, 'configuration', function(newConfig){
		this._configuration = newConfig;
		this.updateConfig();
	});

	Trap._compat.__defineGetter(this, 'configuration', function() {
		return this._configuration.toString();
	});

	Trap._compat.__defineGetter(this, 'state', function() {
		return this._state;
	});

	Trap._compat.__defineSetter(this, 'trapID', function(newID){
		this._trapID = newID;
	});

	Trap._compat.__defineGetter(this, 'trapID', function() {
		return this._trapID;
	});

	Trap._compat.__defineGetter(this, "enabled", function() {
		return this._enabled;
	});

	Trap._compat.__defineSetter(this, "enabled", function(b) {

		if (typeof(b) != "boolean")
			throw "Cannot set to a non-boolean value. Please set enabled to true or false";

		if (b)
			this.enable();
		else
			this.disable();
	});

	Trap._compat.__defineGetter(this, 'keepaliveInterval', function() {
		return this._keepalivePredictor.getKeepaliveInterval();
	});

	Trap._compat.__defineSetter(this, 'keepaliveInterval', function(newInterval) {
		this._keepalivePredictor.setKeepaliveInterval(newInterval);

		if (this.state == Trap.Transport.State.CONNECTED || this.state == Trap.Transport.State.AVAILABLE)
			this._keepalivePredictor.start();
	});

	Trap._compat.__defineGetterSetter(this, 'keepalivePredictor', '_keepalivePredictor');

	Trap._compat.__defineGetterSetter(this, 'keepaliveExpiry', null, function() {
		return this._keepalivePredictor.getKeepaliveExpiry();
	}, function(newExpiry) {
		this._keepalivePredictor.setKeepaliveExpiry(newExpiry);
	});

	Trap.AbstractTransport.prototype.init.call(this);
};

Trap.AbstractTransport.prototype = new Trap.EventObject;
Trap.AbstractTransport.prototype.constructor = Trap.AbstractTransport;

Trap.AbstractTransport.prototype.init = function()
{
	this._enabled			= true;
	this._state				= Trap.Transport.State.DISCONNECTED;
	this._trapID			= 0;

	this.lastAlive			= 0;
	this._livenessCheckData	= null;

	this.connectTimeout 	= 30000;

	// Used by the receive method to buffer as needed

	this._bos	= new Trap.ByteArrayOutputStream();

	// Keepalive information
	if (this._keepalivePredictor)
		this._keepalivePredictor.stop();

	this._keepalivePredictor = new Trap.Keepalive.StaticPredictor();
	this._keepalivePredictor.setDelegate(this);

};

/* **** ABSTRACT METHODS!!! MUST BE SUBCLASSED!!! */

/**
 * Asks the transport to fill the set with the available context keys it can
 * provide for authentication. These keys will be offered to the
 * authentication provider, and can not be changed after the call to this
 * function. The keys are set on a per-transport basis.
 * <p>
 * This function MUST NOT throw.
 * 
 * @param keys
 *            The keys to fill in. The transport should only add keys to
 *            this set.
 */
Trap.AbstractTransport.prototype.fillAuthenticationKeys = function(keys) {};

/**
 * Asks the subclass to update the context map, filling in the keys. This
 * can be called, for example, when a new authentication method is set that
 * may have modified contextKeys.
 */
Trap.AbstractTransport.prototype.updateContext = function() {};

/**
 * Performs the actual sending of a TrapMessage. This method MUST NOT
 * perform any checks on the outgoing messages. It may still perform checks
 * on the transport, and throw appropriately.
 * 
 * @param message
 *            The message to send.
 * @throws TrapTransportException
 *             If an error occurred while trying to send the message. Before
 *             this exception is thrown, the transport MUST change its state
 *             to ERROR, as it means this transport can no longer be used.
 */
Trap.AbstractTransport.prototype.internalSend = function(message, expectMore) {};


/**
 * Triggers the connect call for the transport (if available). May throw if it cannot connect.
 */
Trap.AbstractTransport.prototype.internalConnect = function(){};

Trap.AbstractTransport.prototype.internalDisconnect = function(){};

Trap.AbstractTransport.prototype.getTransportName = function(){ return "abstract"; };

/*
 * Implementation follows. Feel free to ignore.
 */

Trap.AbstractTransport.prototype.isEnabled = function()
{
	return this._enabled;
};

Trap.AbstractTransport.prototype.isConnected = function()
{
	return this.getState() == Trap.Transport.State.CONNECTED || this.getState() == Trap.Transport.State.AVAILABLE;
};

Trap.AbstractTransport.prototype.configure = function(configurationKey, configurationValue) 
{
	if (!configurationKey.startsWith(this._prefix))
		configurationKey = this._prefix + "." + configurationKey;
	this._configuration.setOption(configurationKey, configurationValue);
	this.updateConfig();
};

Trap.AbstractTransport.prototype.updateConfig = function()
{
	var eString = this.getOption(Trap.Transport.Options.Enabled);
	if (eString != null)
	{
		try
		{
			this._enabled = ("true" == eString);
		}
		catch (e)
		{
			this.logger.warn("Failed to parse transport {} enabled flag; {}", this.getTransportName(), e);
		}
	}

	this.transportPriority = this._configuration.getIntOption(Trap.Transport.Options.Priority, this.transportPriority);

	this.keepaliveInterval = this._configuration.getIntOption("trap.keepalive.interval", this.keepaliveInterval);
	this.keepaliveExpiry = this._configuration.getIntOption("trap.keepalive.expiry", this.keepaliveExpiry);

};

Trap.AbstractTransport.prototype.canConnect = function()
{
	return false;
};

Trap.AbstractTransport.prototype.canListen = function()
{
	return false;
};

Trap.AbstractTransport.prototype.setAuthentication = function(authentication)
{
	this._authentication = authentication;
	this.contextKeys = authentication.getContextKeys(this.availableKeys);
	this.updateContext();
};

Trap.AbstractTransport.prototype.isAvailable = function()
{
	return this.state == Trap.Transport.State.AVAILABLE;
};

/**
 * Changes the state of the transport, and notifies the listener.
 * 
 * @param newState
 *            The state to change to.
 */
Trap.AbstractTransport.prototype.setState = function(newState)
{
	if (newState == this._state)
		return;

	var oldState = this._state;
	this._state = newState;

	this.logger.trace("Transport {} changed state from {} to {}", this.getTransportName(), oldState, newState );

	this._dispatchEvent({type: "statechange", newState:newState, oldState:oldState});

	// Autostart keepalives, if applicable.
	if (newState == Trap.Transport.State.CONNECTED)
	{
		this._keepalivePredictor.start();
	}

	// Autostart keepalives, if applicable.
	if ((newState == Trap.Transport.State.DISCONNECTED) || (newState == Trap.Transport.State.DISCONNECTING) || (newState == Trap.Transport.State.ERROR))
	{
		this._keepalivePredictor.stop();
	}
};

Trap.AbstractTransport.prototype.enable = function()
{
	try
	{
		this.configure(Trap.Transport.Options.ENABLED, "true");
	}
	catch (e)
	{
		// Cannot happen.
		this.logger.warn(e.getMessage(), e);
	}
};

Trap.AbstractTransport.prototype.disable = function()
{
	try
	{
		this.configure(Trap.Transport.Options.ENABLED, "false");
	}
	catch (e)
	{
		this.logger.warn(e);
	}
	this.disconnect();
};

Trap.AbstractTransport.prototype.connect = function()
{
	if (!this.isEnabled())
		throw"Transport "+this.getTransportName()+" is unavailable...";

	if (!this.canConnect())
		throw "Transport "+this.getTransportName()+" cannot act as a client";

	if (this.getState() != Trap.Transport.State.DISCONNECTED)
		throw "Cannot connect from state that is not DISCONNECTED";

	var mt = this;

	if (this.__timeoutConnect)
		clearTimeout(this.__timeoutConnect);

	this.__timeoutConnect = setTimeout(function() {
		if (mt.getState() == Trap.Transport.State.CONNECTING)
		{
			mt.setState(Trap.Transport.State.ERROR);
			mt.internalDisconnect();
		}
	}, this.connectTimeout);

	this.setState(Trap.Transport.State.CONNECTING);
	this.internalConnect();
};

Trap.AbstractTransport.prototype.disconnect = function()
{
	if (this.state == Trap.Transport.State.DISCONNECTING || this.state == Trap.Transport.State.DISCONNECTED || this.state == Trap.Transport.State.ERROR)
		return; // Cannot re-disconnect

	this.setState(Trap.Transport.State.DISCONNECTING);
	this.internalDisconnect();
};

/* Transport (Abstract) logic follows! This logic will refer to the MOST PARANOID TRANSPORT and MUST be overridden by LESS PARANOID transports */

/**
 * Send checks if the transport is in the correct state, if the message is
 * authenticated (otherwise adds authentication) and performs additional
 * checks when needed.
 */
Trap.AbstractTransport.prototype.send = function(message, expectMore) 
{
	if (this.state != Trap.Transport.State.AVAILABLE && this.state != Trap.Transport.State.CONNECTED)
		throw {message: message, state: this.state};

		message.setAuthData(this._authentication.createAuthenticationResponse(null, this.headersMap, message.getData(), this.contextMap));

		this.internalSend(message, expectMore);
};

/**
 * Call this when data is received.
 * 
 * @param data
 */
Trap.AbstractTransport.prototype.receive = function(data, offset, length)
{
	try
	{
		// We need to handle the case where message data is spread out over two or more incoming data blobs (e.g. socket, udp, etc)...
		// Therefore, we'll need to do some buffer shuffling.

		this._bos.write(data, offset, length);
		var dataArray = this._bos.toArray();
		var consumed = 0;

		do
		{
			var m = new Trap.Message();
			var thisLoop = m.deserialize(dataArray, consumed, dataArray.length - consumed);

			if (thisLoop == -1)
			{
				break;
			}

			this.receiveMessage(m);

			consumed += thisLoop;
		} while (consumed < dataArray.length);

		if (consumed > 0)
		{
			this._bos = new Trap.ByteArrayOutputStream();
			try
			{
				this._bos.write(dataArray, consumed, dataArray.length - consumed);
			}
			catch (t)
			{
				this.logger.warn(t);
			}
		}
	}
	catch (e)
	{
		this.logger.warn(e);
		try
		{
			this.send(new Trap.Message().setOp(Trap.Message.Operation.END), false);
		}
		catch (e1)
		{
			this.logger.warn(e1);
		}

		// Close the transport, since it's invalid
		// It's illegal to raise an UnsupportedEncodingException at this point in time.
		this.disconnect();
	}
};

/**
 * Called when a message is received, in the most general case.
 * 
 * @param message
 */
Trap.AbstractTransport.prototype.receiveMessage = function(message)
{
	this.lastAlive = new Date().getTime();
	// Authenticated message.

	var propagate = true;

	// Note to leo: I hate retarded, k?
	switch (message.getOp())
	{
	case 1:
		propagate = this.onOpen(message);
		break;

	case 2:
		propagate = this.onOpened(message);
		break;

	case 3:
		propagate = this.onClose(message);
		break;

	case 4:
		propagate = this.onEnd(message);
		break;

	case 5:
		propagate = this.onChallenge(message);
		break;

	case 6:
		propagate = this.onError(message);
		break;

	case 8:
		propagate = this.onMessage(message);
		break;

	case 16:
		propagate = this.onOK(message);
		break;

	case 17:
		propagate = this.onPing(message);
		break;

	case 18:
		propagate = this.onPong(message);
		break;

	case 19:
		propagate = this.onTransport(message);
		break;

	default:
		return;

	}

	if (propagate)
		this._dispatchEvent({type: "message", data: message, message: message});
};

/**
 * Transport messages are most often handled by the Trap layer, then
 * repropagated down. The transport CAN attempt to intercept some but it is
 * NOT recommended.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onTransport = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{

	}

	return authed;
};

/**
 * Ping/Pong should be left to Trap.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onPong = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{
		if (this.livenessCheck)
			this.livenessCheck(message.getData());

		var bs = message.getData();
		var type = bs[0];
		var data = bs.substring(7);

		var timer = parseInt(bs.substring(1, 7));

		if (isNaN(timer))
			timer = 30;


		if (type != '3')
			this._keepalivePredictor.keepaliveReceived(false, type, timer, data);
		else if (this.livenessCheck)
			this.livenessCheck(data);
	}

	return authed;
};

/**
 * Ping/Pong should be left to Trap.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onPing = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{
		
		// Prevent a silly error where an old PING would trigger a PONG while disconnecting
		if (this.getState() == Trap.Transport.State.DISCONNECTING || this.getState() == Trap.Transport.State.DISCONNECTED)
			return authed;
		
		try
		{
			var bs = message.string;
			var type = bs.substring(0, 1);
			var timer = parseInt(bs.substring(1, 7));
			var data = bs.substring(7);

			if (isNaN(timer))
				timer = 30;

			if (type != '3')
				this._keepalivePredictor.keepaliveReceived(true, type, timer, data);
			else
				// isAlive() call
				this.sendKeepalive(false, type, timer, data);
		}
		catch (e)
		{
			this.logger.warn(e);
		}
	}

	return authed;
};

Trap.AbstractTransport.prototype.padTimer = function(timerStr)
{
	while (timerStr.length < 6)
	{
		if (timerStr.startsWith("-"))
			timerStr = "-0" + timerStr.substring(1);
		else
			timerStr = "0" + timerStr;
	}
	return timerStr;
};

/**
 * General ack. Used by Trap; the transport need not apply.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onOK = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{

	}

	return authed;
};

/**
 * Transport should not care for these.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onMessage = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{

	}

	return authed;
};

/**
 * Transport MAY inspect these.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onError = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{

	}

	return authed;
};

/**
 * Transport MUST intercept these.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onChallenge = function(message)
{
	// We received a challenge.

	try
	{
		var original = new Trap.Message(message.getData());
		var response = this._authentication.createAuthenticationResponse(message.getAuthData(), this.headersMap, original.getData(), this.contextMap);
		original.setAuthData(response);
		this.send(original, false);
	}
	catch (e)
	{
		this.logger.warn(e);
	}

	return false;
};

/**
 * Transport MUST NOT intercept these
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onEnd = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{

	}

	return authed;
};

/**
 * Transport MUST intercept these.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onClose = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{
		this.disconnect();
	}

	return false;
};

/**
 * Transport MUST intercept these.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onOpened = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{
		this.setState(Trap.Transport.State.AVAILABLE);
	}

	return authed;
};

/**
 * Transport MUST intercept these.
 * 
 * @param message
 * @return
 */
Trap.AbstractTransport.prototype.onOpen = function(message)
{
	var authed = this.checkAuthentication(message);

	if (authed)
	{
		this.setState(Trap.Transport.State.AVAILABLE);
	}
	else
	{
		// The challenge will have been sent by checkAuth
		// We don't really need to do anything; we'll receive a new
		// OPEN event...
	}

	return authed;
};

Trap.AbstractTransport.prototype.checkAuthentication = function(message)
{
	var authed = this._authentication.verifyAuthentication(message.getAuthData(), this.headersMap, message.getData(), this.contextMap);

	if (!authed)
	{
		// Challenge
		var authChallenge = this._authentication.createAuthenticationChallenge(this.contextMap);
		var challenge = new Trap.Message();
		challenge.setOp(Trap.Message.Operation.CHALLENGE);
		challenge.setAuthData(authChallenge);
		challenge.setTransportId(this.getTrapID());

		try
		{
			challenge.setData(message.serialize());
			this.internalSend(challenge, false);
		}
		catch (e)
		{
			this.logger.warn("Something happened: {}", e);
		}
	}

	return authed;
};

Trap.AbstractTransport.prototype.getOption = function(option)
{
	if (!option.startsWith(this._prefix))
		option = this._prefix + "." + option;

	return this._configuration.getOption(option);
};

Trap.AbstractTransport.prototype.isAlive = function(within, check, timeout, callback)
{
	if (new Date().getTime() - within < this.lastAlive)
	{
		callback(true);
		return;
	}

	if (!check)
	{
		callback(false);
		return;
	}


	if (this.livenessCheckData == null)
	{
		var mt = this;
		this.livenessCheckData = "" + new Date().getTime();
		this.livenessCheck = function(data)
		{
			if (mt.livenessCheckData == data)
			{
				clearTimeout(mt.livenessCheckTimeout);
				callback(true);
			}
		};

		// Don't allow multiple calls to time us out
		if (this.livenessCheckTimeout)
			clearTimeout(this.livenessCheckTimeout);

		this.livenessCheckTimeout = setTimeout(function() {
			callback(false);
		}, timeout);
	}

	this.sendKeepalive(true, '3', this._keepalivePredictor.getNextKeepalive(), this.livenessCheckData);

};

Trap.AbstractTransport.prototype.sendKeepalive = function(ping, type, timer, data)
{

	if (typeof(type) == "undefined" || typeof(timer) == "undefined" || typeof(data) == "undefined")
		throw "Invalid call; Bug.";

	if (type.length != 1)
		throw "Invalid type";

	timer = ""+timer;

	// Now perform the blaady check
	try
	{

		var m = new Trap.Message();

		// TODO: This format MUST propagate from somewhere. Preferably parent (endpoint).
		m.setFormat(Trap.Message.Format.SEVEN_BIT_SAFE);

		if (ping)
			m.setOp(Trap.Message.Operation.PING);
		else
			m.setOp(Trap.Message.Operation.PONG);

		// Prepare the data. Start with padding timer (0-padded to exactly six characters)
		timer = this.padTimer(timer);

		data = type + timer + data;
		m.setData(data);

		this.send(m, false);

	}
	catch (e)
	{
		this.logger.error(e);
	}


};

Trap.AbstractTransport.prototype.predictedKeepaliveExpired = function(predictor, msec)
{
	this.logger.debug("Keepalive timer for {} expired. Moving to DISCONNECTED.", this.getTransportName());
	this.setState(Trap.Transport.State.DISCONNECTED);
};

Trap.AbstractTransport.prototype.shouldSendKeepalive = function(isPing, type, timer, data)
{
	this.logger.trace("Sending keepalive: {} | {} | {} | {}", isPing, type, timer, data);
	this.sendKeepalive(isPing, type, timer, data);
};

Trap.AbstractTransport.prototype.forceError = function()
{
		this.setState(Trap.Transport.State.ERROR);
};
Trap.Transports.WebSocket = function()
{
	Trap.AbstractTransport.call(this);
	this._transportPriority	= 0;
};

Trap.Transports.WebSocket.prototype = new Trap.AbstractTransport;
Trap.Transports.WebSocket.prototype.constructor = new Trap.Transports.WebSocket;

Trap.Transports.WebSocket.CONFIG_URI = "wsuri";

if (Trap.useBinary)
    Trap.Transports.WebSocket.prototype.supportsBinary = false;
	//try { Trap.Transports.WebSocket.prototype.supportsBinary = typeof new WebSocket("ws://127.0.0.1").binaryType === "string"; } catch(e){}

Trap.Transports.WebSocket.prototype.canConnect = function()
{
	// Check for WebSocket interface
	return (typeof(WebSocket) != "undefined" && WebSocket.prototype && WebSocket.prototype.send ? true : false);
};

Trap.Transports.WebSocket.prototype.getTransportName = function()
{
	return "websocket";
};

Trap.Transports.WebSocket.prototype.internalSend = function(message, expectMore) 
{
	var data = message.serialize(Trap.useBinary);
	this.ws.send(data.buffer ? data.buffer : data);
};

Trap.Transports.WebSocket.prototype.internalConnect = function()
{
		var uri = this.getOption(Trap.Transports.WebSocket.CONFIG_URI);
		
		if (!uri)
		{
			this.logger.debug("WebSocket Transport not properly configured... Unless autoconfigure is enabled (and another transport succeeds) this transport will not be available.");
			this.setState(Trap.Transport.State.ERROR);
			return;
		}
		
		this.logger.debug("WS Transport Opening");
		this.ws = new WebSocket(uri);
		this._initWS();
};

Trap.Transports.WebSocket.prototype.internalDisconnect = function()
{
	if (this.ws)
		this.ws.close();
	
};

//TODO: Expose IP information on websocket level...
Trap.Transports.WebSocket.prototype.fillAuthenticationKeys = function(keys)
{
};

Trap.Transports.WebSocket.prototype.updateContext = function()
{
	// TODO Auto-generated method stub
	
};

Trap.Transports.WebSocket.prototype._initWS = function()
{
	var mt = this;
	this.ws.onopen = function() { mt.notifyOpen(); };
	this.ws.onerror = function() { mt.notifyError(); };
	this.ws.onclose = function() { mt.notifyClose(); };
	this.ws.onmessage = function(e) { mt.notifyMessage(e.data); };
	
	if (Trap.useBinary && this.supportsBinary)
		this.ws.binaryType = "arraybuffer";
};

Trap.Transports.WebSocket.prototype.notifyError = function()
{
	this.setState(Trap.Transport.State.ERROR);
};

Trap.Transports.WebSocket.prototype.notifyOpen = function()
{
	this.logger.debug("WS Transport Connected");
	this.setState(Trap.Transport.State.CONNECTED);
};

Trap.Transports.WebSocket.prototype.notifyClose = function()
{
	this.ws = null;
	if(this.getState() != Trap.Transport.State.ERROR)
		this.setState(Trap.Transport.State.DISCONNECTED);
	this.logger.debug("WS Transport Disconnected");
};

Trap.Transports.WebSocket.prototype.notifyMessage = function(data)
{
	if (typeof(data) == "string")
	{
		// Data will be a Unicode string (16-bit chars). notifyData expects bytes though
		// Encode data as UTF-8. This will align the bytes with the ones expected from the server.
		data = data.toUTF8ByteArray();
		
		this.receive(data, 0, data.length);
	}
	else
	{
		this.receive(new Uint8Array(data));
	}
};
Trap.Transports.HTTP = function()
{
	Trap.AbstractTransport.call(this);
	this._transportPriority	= 100;
	this.expirationDelay = 28000;
	this.connectionTimeout = 10000;
	this.latencyEstimate = 1000; // Start with a reasonably generous latency estimate

	this._buf = [];
};

Trap.Transports.HTTP.prototype = new Trap.AbstractTransport;
Trap.Transports.HTTP.prototype.constructor = new Trap.Transports.HTTP;

Trap.Transports.HTTP.CONFIG_URL = "url";

if (Trap.useBinary)
	Trap.Transports.HTTP.prototype.supportsBinary = typeof new XMLHttpRequest().responseType === 'string';

Trap.Transports.HTTP.prototype.canConnect = function()
{
	return true;
};

Trap.Transports.HTTP.prototype.getTransportName = function()
{
	return "http";
};

Trap.Transports.HTTP.prototype.updateConfig = function()
{
	Trap.AbstractTransport.prototype.updateConfig.call(this);
	this.expirationDelay = this._configuration.getIntOption(this._prefix + ".expirationDelay", this.expirationDelay);
	this.connectionTimeout = this._configuration.getIntOption(this._prefix + ".connectionTimeout", this.connectionTimeout);
};

Trap.Transports.HTTP.prototype.openConnection = function(type)
{
	var x = new XMLHttpRequest();
	x.open(type, this.url + "?expires=" + this.expirationDelay , true);
	x.aborted = false;
	x.responseType === 'arraybuffer';
	
	var mt = this;

	function abort(error)
	{
		x.isAborted = true;
		x.abortState = x.readyState;
		
		x.abort();
	}

	var pollTimeout =  null;
	var connTimeoutFun = function() {
		if (x.readyState == 1)
		{
			abort();
			mt.logger.warn("XHR longpoll failed to connect...");
		}
	};
	x.connectionTimer = setTimeout(connTimeoutFun, this.expirationDelay + this.latencyEstimate*3);
	
	var latencyRecorded = false;
	var start = new Date().valueOf();
	
	// Also used to clear the connection timeout, since latency implies connection.
	function recordLatency()
	{
		if (latencyRecorded)
			return;
		
		latencyRecorded = true;
		
		var end = new Date().valueOf();
		var latency = end - start;
		mt.latencyEstimate = (mt.latencyEstimate + latency)/2;
	}
	
	// Handles timeouts for an upload.
	x.upload.addEventListener("loadstart", function() 
	{
		
		// We can't wait for the connection timeout when we're uploading...
		clearTimeout(x.connectionTimer);
		// Cannot record latency on an upload since the headers will return only after the body is uploaded.
		latencyRecorded = true;
		
		var progressed = false;
		var granularity = 1000;
		var done = false;
		
		// Add progress handlers
		x.upload.addEventListener("progress", function() {
			progressed = true;
		}, true);
		
		x.upload.addEventListener("error", function() {
			x.hasError = true;
		}, true);
		
		x.upload.addEventListener("timeout", function() {
			x.hasTimeout = true;
		}, true);
		
		x.upload.addEventListener("load", function() {
			clearTimeout(pFunTimeout);
			done = true;
			
			// Restart connectionTimeout -- we're waiting for headers now!
			x.connectionTimer = setTimeout(connTimeoutFun, mt.connectionTimeout);
		}, true);
		
		x.upload.addEventListener("loadend", function() {
			if (!done)
			{
				mt.logger.warn("Incomplete upload: loadend without load");
				x.hasError = true;
			}
		}, true);

		var pFun = function() {

			if (!mt.running)
				return;
			
			if (x.readyState == 4)
				return;

			if (!progressed)
			{
				// Timeout has occurred.
				abort();
				return;
			}
			progressed = false;
			setTimeout(pFun, granularity);

		};

		var pFunTimeout = setTimeout(pFun, mt.connectionTimeout);
		
	}, true);
	
	x.addEventListener("loadstart", function() {
		mt.logger.trace("XHR load started...");
	});

	x.addEventListener("readystatechange", function()
	{
		switch(x.readyState)
		{
		
		case 0:
			break;
		case 1:
			break;
		
		case 2:
			mt.logger.debug("XHR switched state to headers received (we have connection to server). Stopping connectionTimeout, starting pollTimeout");
			// We have connected (connTimeout unnecessary)
			clearTimeout(x.connectionTimer);
			recordLatency();
			
			// Just keep track of the polling time.
			pollTimeout = setTimeout(function() {

				// Guard against timeout incorrectly set.
				if (!mt.running)
					return;

				switch(x.readyState)
				{
				case 0:
				case 1:
					// This should be impossible
					abort();
					mt.logger.warn("XHR ended in an inconsistent state...");
					mt.setState(Trap.Transport.State.ERROR);
					return;

				case 2:
					// Headers received but no body. Most likely network failure
					abort();
					mt.logger.debug("Loading failed after headers loaded");
					return;

				case 3:
					// Body in process of being received
					// Do nothing; subsequent code will take care of it.
					break;

				case 4:
					// Should not happen.
					mt.logger.error("HTTP transport in inconsistent state");
					mt.setState(Trap.Transport.State.ERROR);
					return;

				}

				var progressed = false;

				x.onprogress = function() {
					progressed = true;
				};

				var pFun = function() {

					if (!mt.running)
						return;
					
					if (x.readyState == 4)
						return;

					if (!progressed)
					{
						// Timeout has occurred.
						abort();
						return;
					}
					progressed = false;
					setTimeout(pFun, 100);

				};

				setTimeout(pFun, 100);

//			}, this.expirationDelay + this.latencyEstimate * 3); // Add some spare time for expiration delay to kick in/transfer to occur.
			}, 2000); // Add some spare time for expiration delay to kick in/transfer to occur.

			break;

		case 3:
			mt.logger.debug("XHR switched state to Receiving (data incoming from server)");
			break;

		case 4:
			// Prevent timeout function from being called
			clearTimeout(pollTimeout);
			
			// Handle error cases
			if (x.hasError || x.hasTimeout)
			{
				mt.setState(Trap.Transport.State.ERROR);
			}
			break;
		}
	}, true);
	
	var done = false;
	
	x.addEventListener("error", function() {
		x.hasError = true;
	}, true);
	
	x.addEventListener("timeout", function() {
		x.hasTimeout = true;
	}, true);
	
	x.addEventListener("load", function() {
		done = true;
	}, true);
	
	x.addEventListener("loadend", function() {
		if (!done)
		{
			mt.logger.warn("Incomplete download: loadend without load");
			x.hasError = true;
		}
	}, true);
	
	return x;
};

Trap.Transports.HTTP.prototype.internalSend = function(message, expectMore) 
{

	var mt = this;
	
	mt._sendQueued = true;

	if (!!message)
		this._buf.push(message);

	if (expectMore)
	{
		if (mt._sendTimer)
			clearTimeout(mt._sendTimer);
		
		mt._sendTimer = setTimeout(function() {
			mt.internalSend(null, false);
		}, 1000);
		
		return;
	}
	
	if (mt._sendTimer)
	{
	    clearTimeout(mt._sendTimer);
	    mt._sendTimer = null;   
	}
	
	if (this._buf.length == 0)
		return; // Erroneous call.

	// Slam the messages
	
	var bos = new Trap.ByteArrayOutputStream();
	for (var i=0; i<this._buf.length; i++)
		bos.write(this._buf[i].serialize(Trap.useBinary));
	
	var data = (Trap.useBinary ? bos.toArray() : bos.toString());
	
	if (mt.getState() == Trap.Transport.State.AVAILABLE || mt.getState() == Trap.Transport.State.CONNECTED)
		mt.setState(Trap.Transport.State.UNAVAILABLE);
	
	var x = this.openConnection("POST");
	x.setRequestHeader("Content-Type", "x-trap");

	x.send(data.buffer ? data.buffer : data);
	
	x.onreadystatechange = function()
	{
		if (x.readyState == 4)
		{ 
			if (x.hasError || x.hasTimeout || x.isAborted)
			{
				mt._dispatchEvent({type: "failedsending", messages: mt._buf});
				mt.setState(Trap.Transport.State.ERROR);
			}
			else
			{
				mt._buf = [];
				
				// Prevent state to go to AVAILABLE when we're actually DISCONNECTED.
				if (mt.getState() == Trap.Transport.State.UNAVAILABLE || mt.getState() == Trap.Transport.State.CONNECTED)
					mt.setState(Trap.Transport.State.AVAILABLE);
			}
			
			mt._sendQueued = false;
		}
	}

};

Trap.Transports.HTTP.prototype.internalConnect = function()
{
	
	this.logger.debug("HTTP Transport Opening...");
	this.url = this.getOption(Trap.Transports.HTTP.CONFIG_URL);

	// Check for proper configuration
	if (!this.url || typeof(this.url) != "string" || this.url.length < 4)
	{
		this.logger.debug("HTTP Transport not properly configured... Unless autoconfigure is enabled (and another transport succeeds) this transport will not be available.");
		this.setState(Trap.Transport.State.ERROR);
		return;
	}
	
	var mt = this;

	var x = this.openConnection("GET")
	x.responseType = "text";
	x.onreadystatechange = function()
	{
		if (x.readyState == 4)
		{
			
			if (x.status == 200 && !x.hasError && !x.hasTimeout && !x.isAborted)
			{
				if ('/' == mt.url.charAt(mt.url.length-1))
					mt.url = mt.url + x.responseText;
				else
					mt.url = mt.url + '/' + x.responseText;

				mt.running = true;
				mt.poll();
				mt.setState(Trap.Transport.State.CONNECTED);
			}
			else
			{
				mt.logger.warn("HTTP transport failed with state ", x.status);
				mt.setState(Trap.Transport.State.ERROR);
				return true;
			}
		}

		return false;
	};
	try
	{
		x.send();
	}
	catch(e)
	{
		this.logger.warn("HTTP transport failed to connect due to ", e);
		if(e.stack)
			this.logger.debug(e.stack);
		this.setState(Trap.Transport.State.ERROR);
		return;
	}
};

Trap.Transports.HTTP.prototype.poll = function()
{
	
	if (!this.running)
		return;
	
	var x = this.openConnection("GET");
	var mt = this;
	
	x.onreadystatechange = function()
	{
		if (x.readyState == 4)
		{
			if (x.isAborted)
			{
				if (x.abortState == 2)
				{
					mt.poll();
				}
				else
				{
					mt.setState(Trap.Transport.State.ERROR);
				}
			}
			else
			{
				if (x.status == 200)
				{
					// TODO: New XHR features to download raw data?
					if (x.responseType == "arraybuffer")
					{
						var data = new Uint8Array(x.response);
						mt.receive(data);
						mt.poll();
					}
					else
					{
						var data = x.responseText;
						// Data will be a Unicode string (16-bit chars). notifyData expects bytes though
						// Encode data as UTF-8. This will align the bytes with the ones expected from the server.
						data = data.toUTF8ByteArray();
						mt.receive(data, 0, data.length);
						
						mt.poll();
					}
				}
				else
				{
					if (mt.getState() != Trap.Transport.State.DISCONNECTING && mt.getState() != Trap.Transport.State.DISCONNECTED)
						mt.setState(Trap.Transport.State.ERROR);
				}
			}
		}
	};

	x.send();

	this._longpoll = x;
};
Trap.Transports.HTTP.prototype.internalDisconnect = function()
{

	var mt = this;
	
	if (mt._sendQueued)
	{
		setTimeout(function() { mt.internalDisconnect(); }, 100);
		return;
	}
	
	var x = new XMLHttpRequest();
	x.open("POST", this.url, true);

	// The disconnect should succeed whether or not the XHR does.
	// Two ways to call done
	var done = function() {
		mt.running = false;

		if(mt.getState() == Trap.Transport.State.DISCONNECTING)
			mt.setState(Trap.Transport.State.DISCONNECTED);
	};

	// State change -- connection done!
	x.onreadystatechange = function()
	{
		if (x.readyState == 4)
			done();
	};
	
	x.send();

};
Trap.Transports.HTTP.prototype.setState = function()
{
	if (this.getState() == Trap.Transport.State.DISCONNECTED || this.getState() == Trap.Transport.State.ERROR)
		this.running = false;

	Trap.AbstractTransport.prototype.setState.apply(this, arguments);
};

//TODO: Expose IP information on websocket level...
Trap.Transports.HTTP.prototype.fillAuthenticationKeys = function(keys)
{
};

Trap.Transports.HTTP.prototype.updateContext = function()
{
	// TODO Auto-generated method stub

};
var _checkLoaded = function() {
	if(_loadcount == 0) {
		_dispatchEvent({ type : "load" });
    }
};





if (!Warp.log) Warp.log = function(){};
if (!Warp.warn) Warp.warn = Warp.log;
if (!Warp.error) Warp.error = Warp.log;

var _prefixUrl = function(url) {
    if(typeof(Warp.config.gateway) == "string")
        url = Warp.config.gateway + url;
    return url;
};

var _postfixUrl = function(url) {
    var mod = [];
    if(Warp.config.debug === true)
        mod.push("debug");
    //else
    //    mod.push(new Date().getTime().toString());  // Why was THIS a great idea? If NOT debug, then do NOT cache???
    if(Warp.config.websocket === true)
        mod.push("websocket");
    if(Warp.config.slam === true)
        mod.push("slam");
    if(Warp.config.workers === true)
        mod.push("workers");
    if(Warp.config.headless === true)
        mod.push("headless");
    if(Warp.config.securekey === true)
        mod.push("securekey");
    if(Warp.config.binary === true)
        mod.push("binary");
    if(!undef(Warp.config.storage))
        mod.push("storage=" + Warp.config.storage);
    if(mod.length > 0)
        url += "?" + mod.join("&");
    return url;
};

function undef(v) { return typeof(v) == "undefined"};

if(typeof(Warp.config.gateway) != "string")
    Warp.config.gateway = "http://75.55.107.100:8080/Core-Gateway-View";
if(typeof(Warp.config.debug) != "boolean")
    Warp.config.debug = true;

function _load() {
    console.log("loading...");
    
    if (undef(Warp.application))
        Warp.application = {};
    if (undef(Warp.application.name))
        Warp.application.name = "Fritzy Test";
    if (undef(Warp.config.slam))
        Warp.config.slam = false;
    if (undef(Warp.config.debug))
        Warp.config.debug = false;
    if (undef(Warp.config.workers))
        Warp.config.workers = false;
    if (undef(Warp.config.binary))
        Warp.config.binary = typeof(ArrayBuffer) != "undefined";
    else
        Warp.config.binary = typeof(ArrayBuffer) != "undefined" && Warp.config.binary;

    if (Warp.config.guid)
    {
        Warp.application.guid = Warp.config.guid;
        delete Warp.config.guid;
    }
    if (Warp.config.secret)
    {
        Warp.application.secret = Warp.config.secret;
        delete Warp.config.secret;
    }

    // TODO: Evaluate IE compatibility with this level
//FRITZY REM OUT
/*
    if(!window.postMessage)
        Warp.config.slam = true;
    
    if(!window.Worker || !window.SharedWorker)
        Warp.config.workers = false;
*/    
/*

    if(Warp.config.slam === true) {
        var _loadcss = function (css) {
            var link = document.createElement("link");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("type", "text/css");
            link.setAttribute("href", css);
            document.getElementsByTagName("head")[0].appendChild(link);
        };
        _loadcss(_prefixUrl("/style.css"));
        _loadcss(_prefixUrl("/jquery-ui.css"));
    }
    var script = document.createElement("script");
    script.type = "text/javascript";
    
    if (Warp.onerror && typeof(Warp.onerror) == "function")
        script.onerror = Warp.onerror;
    script.src = _postfixUrl(_prefixUrl("/warp-api.js"));
    document.getElementsByTagName("head")[0].appendChild(script);
*/
}

//var _eventlistenersMap = {};

// Carry it over as a public object. warp-api.js will delete this property
// This allows me to define addEventListener and removeEventListener in warp.js
// so they can be used immediately by JS apps.
Warp._eventlistenersMap = _eventlistenersMap;

/**
 * Register an event listener.
 * 
 * @param {String} type The event type the listener triggers on.
 * @param {Function} listener The event listener to unregister.
 *
 * @see Warp#removeEventListener
 */
if (!Warp.addEventListener) // Prevents these functions from overwriting previously defined ones (in loader)
Warp.addEventListener = function(type, listener) {
    if (!_eventlistenersMap[type])
        _eventlistenersMap[type] = [];
    var eventlisteners = _eventlistenersMap[type];
    for (var i = 0; i<eventlisteners.length; i++) {
        if(listener === eventlisteners[i])
            return;
    }
    eventlisteners[i] = listener;
};

/**
 * Unregister previously registered event listener.
 * 
 * @param {String} type The event type the listener triggers on.
 * @param {Function} listener The event listener to unregister.
 *
 * @see Warp#addEventListener
 */
if (!Warp.removeEventListener) // Prevents these functions from overwriting previously defined ones (in loader)
Warp.removeEventListener = function(type, listener) {
    if (!_eventlistenersMap[type])
        return;
    var eventlisteners = _eventlistenersMap[type];
    for (var i = 0; i < eventlisteners.length; i++) {
        if (listener === eventlisteners[i]) {
            eventlisteners.splice(i,1);
            break;
        }
    }
};

var _dispatchEvent = function(evt) {
    var listeners = _eventlistenersMap[evt.type];
    
    //console.log(evt);
    if(!!listeners)
        for (var i = 0; i < listeners.length; i++)
            listeners[i](evt);
    
    // Support Warp.onXXX handlers natively
    var f = Warp["on"+evt.type];
    if (f && typeof(f) == "function") f(evt);
    
    return true;
};

/*
if (!window.wb && !Warp.config.delayLoad)
    _load();
else {
    Warp._forceLoad = function() {
        delete Warp._forceLoad;
        _load();
    }
    
    Warp.load = function(config, handlers) {
        
        if (!Warp.application)
            Warp.application = {};
        
        if (config.resource)
            Warp.application.resource = config.resource;
        
        delete config.resource;
        
        for (var arg in config)
            Warp.config[arg] = config[arg];
        
        Warp.load = function() { if (self.console && self.console.warn) self.console.warn("Warp is already loaded..."); };

        Warp.rootResource = new Warp.RootResource(Warp.application.resource);
        
        if (typeof(handlers) == "object")
            Warp.on(handlers);
        
        Warp._forceLoad();
    }
}
*/
    Warp._forceLoad = function() {
        delete Warp._forceLoad;
        _load();
    }
    Warp.load = function(config, handlers) {
        
        if (!Warp.application)
            Warp.application = {};
        
        if (config.resource)
            Warp.application.resource = config.resource;
        
        delete config.resource;
        
        for (var arg in config)
            Warp.config[arg] = config[arg];
        
        if (self.console && self.console.warn) self.console.warn("Warp is already loaded...");
        Warp.load = function() { if (self.console && self.console.warn) self.console.warn("Warp is already loaded..."); };

        Warp.rootResource = new Warp.RootResource(Warp.application.resource);
        
        if (typeof(handlers) == "object") {
            Warp.on(handlers);
        }
        
        Warp._forceLoad();
    }

try {self["ß"]=Warp;} catch(e){}; // if jQuery can, we can!

/**
 * Construct a new Warp Message.
 * 
 * @class <code>Warp.Message</code> class is the model of the Warp message
 *        communicated over the Warp network. Warp message consists of a set of
 *        headers and a body. For convenience, commonly used header names are
 *        provided in the {@link Warp.Message.HeaderName} enumeration.
 *        <p>
 * 
 * @constructor
 * 
 * @property {Object} headers The object containing the message headers (NOTE:
 *           this property should be accessed via dynamically injected functions
 *           <code>Warp.Message.getHeaders()</code> and
 *           <code> Warp.Message.setHeaders()</code> if compatibility with IE
 *           is required). The properties of this object represent header names
 *           and property values are the values of the corresponding headers.
 *           Both header names and header values are of type <code>String</code>.
 *           One can conveniently access the most commonly used headers by using
 *           the {@link Warp.Message.HeaderName} enumeration. For example:
 *           <p>
 * 
 * <pre>
 * var h = message.getHeader(Warp.Message.HeaderName.From);
 * </pre>
 * 
 * @property {ArrayBuffer|String} data The body of this Warp message. If binary
 *           support is enabled, data will be an ArrayBuffer when receiving.
 *           Data may be sent as either ArrayBuffer or String.
 * @property {String} text <i>(readonly)</i> The body of this Warp message,
 *           interpreted as a UTF-8 string.
 * @property {Object} object <i>(readonly)</i> The body of this Warp message,
 *           parsed as a JSON object. Returns null if parsing failed.
 * @property {String} to Alias for the To header of the message.
 * @property {String} from Alias for the From header of the message.
 * @property {String} method Alias for the Method header of the message.
 * @property {String} statusCode Alias for Status Code To header of the message.
 * @property {String} contentType Alias for the Content Type header of the
 *           message.
 * @property {String} contentLength Alias for the Content Length header of the
 *           message.
 * 
 * @return A new Warp message.
 * @type Warp.Message
 * 
 * @see Warp.Resource
 * @see Warp.RootResource
 */
Warp.Message = function() {

    var mt = this;

    __defineGetter(this, "headers", function() {
        return mt._headers;
    });

    __defineSetter(this, "headers", function(headers) {
        mt._headers = headers;
    });

    __defineGetter(this, "data", function() {
        return mt._data;
    });

    __defineGetter(this, "dataAsString", function() {
        if (typeof (mt._data) == "string")
            return mt._data;
        else if (ArrayBuffer.prototype.isPrototypeOf(mt._data))
            return String.fromUTF8ByteArray(new Uint8Array(mt._data));
        else
            return mt._data;
    });

    __defineGetter(this, "text", function() {
        return mt.getDataAsString();
    });

    __defineGetter(
            this,
            "object",
            function() {

                if (!mt._object) {
                    try {
                        var ct = mt.getContentType();
                        if (!ct || ct.indexOf("application/json") != 0)
                            Warp
                                    .warn(
                                            "Loading message body as JSON when content type is [",
                                            ct,
                                            "]. You should set the content type.");
                        mt._object = JSON.parse(mt.getDataAsString());
                    } catch (e) {
                        // Assume data is corrupt and log an error.
                        Warp
                                .warn(
                                        "Message specified content type 'application/json' but body was invalid JSON. Message was: [",
                                        mt, "]");
                    }
                    ;
                }

                return mt._object;
            });

    __defineSetter(this, "data", function(data) {

        if (typeof (data) == "undefined" || data == null)
            mt._data = "";
        else if (typeof (data.byteLength) != "undefined")
            mt._data = data;
        else if (typeof (data) == "string")
            mt._data = data;
        else if (typeof (data) == "number")
            mt._data = data;
        else if (typeof (data) == "object") {
            mt._data = JSON.stringify(data);
            mt.setContentType("application/json");
        } else
            throw "Unknown data format";
    });

    function defineHeaderAccessors(name, headerStr) {
        __defineGetter(mt, name, function() {
            return mt.getHeader(headerStr);
        });

        __defineSetter(mt, name, function(val) {
            mt.setHeader(headerStr, val);
        });
    }

    defineHeaderAccessors("to", Warp.Message.HeaderName.To);
    defineHeaderAccessors("from", Warp.Message.HeaderName.From);
    defineHeaderAccessors("method", Warp.Message.HeaderName.Method);
    defineHeaderAccessors("statusCode", Warp.Message.HeaderName.StatusCode);
    defineHeaderAccessors("contentType",
            Warp.Message.HeaderName.HTTPContentType);
    defineHeaderAccessors("contentLength",
            Warp.Message.HeaderName.HTTPContentLength);

    this._headers = {};
    this._data = "";

};

/**
 * @private
 */
Warp.Message.prototype.toJSON = function() {
    return {
        _headers : this._headers,
        _data : this._data
    };
};

Warp.Message.prototype._parseHeaders = function(headerString) {
    var rawHeaders = headerString.split("\r\n");
    for (hNum in rawHeaders) {
        var strHeader = rawHeaders[hNum];
        if (strHeader && strHeader.indexOf) // Fix for ERGO-706; prototype.js
        {
            var separatorIndex = strHeader.indexOf(":");
            var hName = strHeader.substring(0, separatorIndex).toLowerCase();
            // TODO: fix the header filtering in the gateway instead
            do {
                separatorIndex++;
            } while (strHeader.charAt(separatorIndex) == ' ');
            if (hName != Warp.Message.HeaderName.Authorization) {
                var hValue = strHeader.substring(separatorIndex,
                        strHeader.length);
                this.setHeader(hName, hValue);
            }
        }
    }
};

Warp.Message.prototype._fromWireString = function(wireString, offset) {

    if (!offset)
        offset = 0;

    if (typeof (wireString) == "string") {
        var headerPos = wireString.indexOf('\r\n\r\n');
        var headerSource = wireString.substring(offset, headerPos);
        this._parseHeaders(headerSource);
        this.setData(wireString.substring(offset + headerPos + 4,
                wireString.length));
    } else {
        // ArrayBuffer!
        var array = new Uint8Array(wireString);

        var idx = Array.prototype.indexOf.call(array, 13, offset);

        do {
            if (array[idx + 1] == 10 && array[idx + 2] == 13
                    && array[idx + 3] == 10) {
                // Found delimiter!
                break;
            }
            idx = Array.prototype.indexOf.call(array, 13, idx + 1);
        } while (idx > -1)

        if (idx <= -1)
            return;

        var headers = String.fromUTF8ByteArray(array, offset, idx);
        this._parseHeaders(headers);
        this._data = array.buffer.slice(idx + 4);
    }

};

Warp.Message.prototype._toWireString = function() {
    var out = "";
    for ( var name in this._headers)
        out += name + ":" + this.getHeader(name) + "\r\n";
    out += "\r\n" + this.getData();
    return out;
};

/**
 * Get the value of the header <i>name</i>. This is an Internet Explorer-safe
 * way of accessing headers.
 * 
 * @param {String}
 *            name The name of the header.
 * @type String
 * @return {String} The value of the header represented by <i>name</i>.
 */
Warp.Message.prototype.getHeader = function(name) {
    return this._headers[name.toLowerCase()];
};

/**
 * Set the value of the header <i>name</i> to <i>value</i>.
 * 
 * @param {String}
 *            name The name of the header.
 * @param {String}
 *            value The value to set.
 * 
 */
Warp.Message.prototype.setHeader = function(name, value) {
    this._headers[name.toLowerCase()] = value;
};

/**
 * Remove the header with the given <i>name</i>. This will completely remove
 * the header from the headers array.
 * 
 * @param {String}
 *            name The name of the header.
 * 
 */
Warp.Message.prototype.removeHeader = function(name) {
    delete this._headers[name.toLowerCase()];
};

/**
 * Convert this Warp message object to a string representation.
 * 
 * @function
 * @return {String} A string representation of the this Warp message.
 * 
 */
Warp.Message.prototype.toString = Warp.Message.prototype._toWireString;

/**
 * Convert a string/array representation of a {@link Warp.Message} into an
 * object. This will create a new message, and parse headers and body.
 * 
 * @param {String
 *            | ArrayBuffer} serialized The serialized representation of a
 *            message.
 * @type Warp.Message
 * @return {Warp.Message} The deserialized representation of <i>serialized</i>
 * 
 */
Warp.Message.fromString = function(string) {
    var msg = new Warp.Message();
    msg._fromWireString(string);
    return msg;
};

/**
 * Enumeration of commonly used Warp message header names. These headers are
 * intended to serve as a non-exhaustive list, allowing for easy access to the
 * most commonly encountered headers in Warp.
 * <p>
 * The headers are enumerated here by their proper (user-friendly)
 * capitalisation, but represented in all-lowercase.
 * 
 * 
 * 
 * The following values are defined: <i>To</i>, <i>From</i>, <i>Method</i>,
 * <i>StatusCode</i>, <i>Authenticate</i>, <i>Authorization</i>,
 * <i>ReasonLength</i>, <i>CSeq</i>, <i>HTTPContentType</i>,
 * <i>HTTPContentLength</i>, <i>HTTPAuthenticate</i>, <i>HTTPAuthorization</i>.
 * 
 * @namespace
 */
Warp.Message.HeaderName = {

    /**
     * The recipient of the message.
     * 
     * @memberof Warp.Message.HeaderName
     */
    To : "x-warp-to",
    From : "x-warp-from",
    Uaid : "x-warp-uaid",
    Method : "x-warp-method",
    StatusCode : "x-warp-status-code",
    Authenticate : "x-warp-authenticate",
    Authorization : "x-warp-authorization",
    ReasonLength : "x-warp-reason-length",
    CSeq : "x-warp-cseq",
    Originator : "x-warp-originator",

    HTTPContentType : "content-type",
    HTTPContentLength : "content-length",
    HTTPAuthenticate : "www-authenticate",
    HTTPAuthorization : "authorization"
};

var lowercase_headername = {};
for ( var prop in Warp.Message.HeaderName)
    lowercase_headername[prop.toLowerCase()] = Warp.Message.HeaderName[prop];

lowercase_headername["status"] = Warp.Message.HeaderName.StatusCode;

/**
 * Converts an arbitrary JavaScript object into a Warp Message. Can be invoked
 * on an existing Warp.Message or Warp.MessageEvent. This method is used by
 * {@link Warp.send} and similar to ensure they have a correct message.
 * <p>
 * When used on an object, it will first look for the <i>obj._headers</i>
 * property. If defined, it will assume that the passed object follows the
 * Warp.Message field syntax, and make a shallow clone. Modifying either object
 * will modify the contents of both.
 * <p>
 * If <i>obj._headers</i> is undefined, it will iterate over the properties of
 * <i>obj</i> and use them as lowercase keys to the
 * {@link Warp.Message.HeaderName HeaderNames} enumeration.
 * 
 * @example
 * 
 * <pre>
 * var m = Warp.Message.fromObject({
 *  to : &quot;...&quot;,
 *  from : &quot;...&quot;,
 *  method : &quot;...&quot;
 * });
 * 
 * m.getHeader(Warp.Message.HeaderName.From) == &quot;...&quot;; // This is true
 * </pre>
 * 
 * @param {Object|Warp.Message}
 *            obj The object to convert into a message
 * @return {Warp.Message} <i>obj</i>, as represented by a Warp.Message. Any
 *         data sent in is either referenced or shallow cloned.
 */
Warp.Message.fromObject = function(o) {
    var m = new Warp.Message();

    if (o._headers) {
        m._headers = o._headers;
        m._data = o._data;
    } else {

        for ( var prop in o) {
            var pName = prop.toLowerCase();
            var header = lowercase_headername[pName];

            if (header) {
                m.setHeader(header, o[prop]);
            } else if ("body" != pName && "data" != pName) {
                // Only set it as a header if it is not "body" or "data". These
                // two
                // are synonyms
                m.setHeader(prop, o[prop]);
            }
        }

        if (o["body"])
            m.setData(o["body"]);
        else if (o["data"])
            m.setData(o["data"]);

    }

    return m;
};

Warp.Message.prototype.toRpcObject = function() {
    return {
        _data : this._data,
        _headers : this._headers
    };
};
/**
 * 
 * A <code>Warp.ErrorEvent</code> is generated when an error has occurred in
 * the network and is returned to the client to be handled. The
 * <code>Warp.ErrorEvent</code> event includes references to the original
 * request, the error reply, and the resource that originally sent the request.
 * 
 * @class This constructor is not supposed to be called directly.
 * @constructor
 * @event
 * @property {Warp.Message} request The original message, which caused the
 *           error.
 * @property {Warp.Message} response The response message received from the
 *           remote side.
 * @property {Warp.Resource} context A reference to the <i>context</i> object
 *           of the {@link Warp.Resource} that is <i>currently</i> dispatching
 *           the event.
 *           <p>
 *           For example, if the event was targeted at the resource /app/foo/bar
 *           then the context object will represent <i>bar</i>'s context when
 *           dispatched to the event handlers for <i>bar</i>. If none of those
 *           handlers report they have handled the event, it bubbles up to
 *           <i>foo</i>'s event handlers. At this point, <i>context</i> will
 *           refer to foo.context and not bar.context.
 * @property {String} origin Alias for
 *           <code>response.getHeader(Warp.Message.HeaderName.From)</code>
 *           allowing a handler to conveniently verify the source of an error
 *           event.
 * @property {Warp.Resource} target The resource where the event originated. In
 *           the <i>context</i> example, <i>target</i> would always refer to
 *           <i>bar</i>.
 * 
 */
Warp.ErrorEvent = function() {
};

/**
 * The original message which caused the error.
 * 
 * @memberof Warp.ErrorEvent
 * @type Warp.Message
 */
Warp.ErrorEvent.prototype.request = null;

/**
 * The remote error response message.
 * 
 * @type Warp.Message
 */
Warp.ErrorEvent.prototype.response = null;

/**
 * A reference to the <i>context</i> object of the {@link Warp.Resource} that
 * is <i>currently</i> dispatching the event.
 * <p>
 * For example, if the event was targeted at the resource /app/foo/bar then the
 * context object will represent <i>bar</i>'s context when dispatched to the
 * event handlers for <i>bar</i>. If none of those handlers report they have
 * handled the event, it bubbles up to <i>foo</i>'s event handlers. At this
 * point, <i>context</i> will refer to foo.context and not bar.context.
 * 
 * @type Object
 */
Warp.ErrorEvent.prototype.context = null;

/**
 * Alias for <code>response.getHeader(Warp.Message.HeaderName.From)</code>
 * allowing a handler to conveniently verify the source of an error event.
 * 
 * @type String
 */
Warp.ErrorEvent.prototype.origin = null;

/**
 * The resource where the event originated. In the <i>context</i> example,
 * <i>target</i> would always refer to <i>bar</i>.
 * 
 * @type Warp.Resource
 */
Warp.ErrorEvent.prototype.target = null;
/**
 * A <code>Warp.MessageEvent</code> is dispatched when a message is received
 * on a resource without an error code. This means new data has been received
 * and the handler(s) are free to handle it as they wish.
 * <p>
 * In addition to the fields below, the MessageEvent supports all the fields
 * in the Message class, and thus can be used to directly access a json object,
 * the text representation, etc. 
 * 
 * @constructor
 * @event
 * @see Warp.Message
 * @property {String} origin Alias for
 *           <code>response.getHeader(Warp.Message.HeaderName.From)</code>
 *           allowing a handler to conveniently verify the source of a message.
 * @property {String} type The event type for a {@link Warp.MessageEvent} is
 *           always "message".
 * @property {Object} [object] <i>(readonly)</i> A field that will
 *           contain the JavaScript object representing the message data, if the
 *           message content type was <code>application/json</code> when
 *           received and if the message body contained a correct JSON document.
 */
Warp.MessageEvent = function(warpMessage) {

    Warp.Message.prototype.constructor.call(this);

    this._headers = warpMessage._headers;
    this._data = warpMessage._data;
    this.origin = warpMessage.getFrom();
    this.type = "message";

    __defineGetter(this, "object", function() {
        return warpMessage.getObject()
    });
};

Warp.MessageEvent.prototype = new Warp.Message;
Warp.MessageEvent.prototype.constructor = Warp.MessageEvent;
/**
 * This constructor is not intended to be used directly to instantiate Warp
 * resources, rather by using {@link Warp.Resource#createResource} on an
 * associated Warp root resource or on an existing instance of the Warp resource.
 * 
 * @class <code>Warp.Resource</code> represents a RESTful resource in a client
 * web application. Warp resources can send and receive Warp messages via Warp
 * network through the associated Warp root resource and create Warp resources.
 * Every Warp resource is assigned a name that represents one path segment in
 * the URI of the client's web application.<p>
 * 
 * @constructor
 * @param {Warp.Resource} parent The parent of the Warp resource being created.
 * @param {String} name The name of the Warp resource being created.
 * 
 * @property {String} name The name of this Warp resource.
 * @property {Warp.Resource} parent The parent of this Warp resource.
 * @property {Array} children The list of Warp resources that are immediate
 *                            ancestors of this Warp resource.
 * @property {String} luid The LUID of the client this resource belongs to.
 * @property {String} guid The GUID of the client this resource belongs to.
 * @property {String} path The path to this Warp resource relative to the
 *                         client's LUID.
 * @property {String} uri The absolute Warp URI to this resource.
 * @property {Boolean} inorderdelivery The flag telling that this resource
 *                                     should perform strict ordering of the
 *                                     sent and received messages.
 * @property {Number} senderbuffersize The size of the buffer for outgoing
 *                                     messages in messages (default=1000).
 * @property {Number} senderwindowsize Number of messages that can be sent
 *                                     directly without acknowledgements
 *                                     (default=10).
 * @property {Number} resendingdelay Time period in milliseconds before
 *                                   resending an unacknowledged message
 *                                   (default=5000).
 * @property {Number} resendingretries Number of times resending should
 *                                     take place before giving up
 *                                     (default=20).
 * @property {Number} receiverwindowsize Number of messages that are allowed
 *                                       to be buffered internally during
 *                                       reordering (default=10).
 *
 * @return The new Warp resource.
 * @type Warp.Resource
 * 
 * @see Warp.RootResource
 * @see Warp.Message
 */
Warp.Resource = function(parent, name) {

    var mythis = this;
     
    __defineGetter(this, "name", function() {
        return name;
    });
    
    this.__rename__ = function(n) { name=n; };

    __defineGetter(this, "parent", function() {
        return parent;
    });

    __defineGetter(this, "children", function() {
        var out = [];
        for(var idx in this._resources)
            out.push(this._resources[idx]);
        return out;
    });

    __defineGetter(this, "luid", function() {
        return parent.getLuid();
    });

    __defineGetter(this, "guid", function() {
        return parent.getGuid();
    });

    __defineGetter(this, "uaid", function() {
        return parent.getUaid();
    });

    __defineGetter(this, "path", function() {
        if (!parent || !parent.getPath())
            return undefined;
        return parent.getPath() + "/" + this.getName();
    });

    __defineGetter(this, "uri", function() {
        var base = this.getUaid();
        if (!base)
            base = this.getLuid();
        else
            while(base.charAt(base.length-1)=='/')
                base = base.substr(0, base.length-1);
        if (!base)
            return undefined;
        return base + this.getPath();
    });

    this._sessions = {};

    var _inorderdelivery = false;
    var _maxsequencenumberplusone = 100000;
    var _senderbuffersize = 1000;
    var _senderwindowsize = 10;
    var _resendingdelay = 5000;
    var _resendingretries = 20;
    var _receiverwindowsize = 10;
    var _resendingtask = -1;

    __defineGetter(this, "inorderdelivery", function() {
        return _inorderdelivery;
    });
    
    __defineSetter(this, "inorderdelivery", function(_iod) {
        if(_inorderdelivery == _iod)
            return;
        _inorderdelivery = _iod;
        this._sessions = {};
        if(_inorderdelivery)
            this.addEventListener("error", this._errorListener);
        else
            this.removeEventListener("error", this._errorListener);
        this._setResendingTask();
    });
    
    __defineGetter(this, "maxsequencenumberplusone", function() {
        return _maxsequencenumberplusone;
    });
    
    __defineGetter(this, "senderbuffersize", function() {
        return _senderbuffersize;
    });
    
    __defineSetter(this, "senderbuffersize", function(_sbs) {
        _senderbuffersize = _sbs;
        if(_senderwindowsize > _senderbuffersize)
            _senderwindowsize = _senderbuffersize;
    });

    __defineGetter(this, "senderwindowsize", function() {
        return _senderwindowsize;
    });
    
    __defineSetter(this, "senderwindowsize", function(_sws) {
        _senderwindowsize = _sws;
    });
    
    __defineGetter(this, "resendingdelay", function() {
        return _resendingdelay;
    });
    
    __defineSetter(this, "resendingdelay", function(_rd) {
        if(_resendingdelay == _rd)
            return;
        _resendingdelay = _rd;
        this._setResendingTask();
    });
 
    __defineGetter(this, "resendingretries", function() {
        return _resendingretries;
    });
    
    __defineSetter(this, "resendingretries", function(_rr) {
        if(_resendingretries == _rr)
            return;
        _resendingretries = _rr;
    });
    
    __defineGetter(this, "receiverwindowsize", function() {
        return _receiverwindowsize;
    });
    
    __defineSetter(this, "receiverwindowsize", function(_rws) {
        _receiverwindowsize = _rws;
    });
    
    this._setResendingTask = function() {
        if(_resendingtask != -1)
            clearInterval(_resendingtask);
        if(mythis.getInorderdelivery())
            _resendingtask = setInterval(mythis._resendingTask, mythis.getResendingdelay() / 10, mythis);
    };    
    
    /**
     * The context object associated with this Warp resource.
     * 
     * @type Object
     */
    this.context = {};

    this._eventlistenersMap = {};
    this._resources = {};

    
    this.addEventListener("message", function(evt) {return mythis.onmessage(evt);});
    this.addEventListener("error", function(evt) {return mythis.onerror(evt);} );
    this.addEventListener("challenge", function(evt) {return mythis.onchallenge(evt);} );
    this.addEventListener("beforesend", function(evt) {return mythis.onbeforesend(evt);} );
    this.addEventListener("redirect", function(evt) {return mythis.onredirect(evt);} );
    this.addEventListener("get", function(evt) {if (mythis.onget) return mythis.onget(evt); else return true;});
    this.addEventListener("put", function(evt) {if (mythis.onput) return mythis.onput(evt); else return true;});
    this.addEventListener("post", function(evt) {if (mythis.onpost) return mythis.onpost(evt); else return true;});
    this.addEventListener("delete", function(evt) {if (mythis.ondelete) return mythis.ondelete(evt); else return true;});
    
};

/**
 * @private
 */
Warp.ResourceSession = function() {
    
    this.sBuffer = [];
    this.sLastAckReceived = -1;
    this.sLastFrameSent = -1;
    this.sWindowSize = 1;
    this.rBuffer = {};
    this.rLastFrameReceived = -1;
    this.rLargestAcceptableFrame = -1;
    this.rLastFirst = -1;
    
};

/**
 * @private
 */
Warp.BufferEntry = function() {
    
    this.message;
    this.cseq = -1;
    this.expires = -1;
    this.retries = -1;
    
};

Warp.Resource.prototype._resendingTask = function(mythis) {
    for(var idx in mythis._sessions) {
        var session = mythis._sessions[idx];
        for(var i = 0; i < session.sBuffer.length; i++) {
            var entry = session.sBuffer[i];
            var current = new Date().getTime();
            if(entry.expires > -1 && entry.expires < current)
                if(mythis._within(entry.cseq, session.sLastAckReceived, session.sLastFrameSent) && entry.retries > 0) {
                    entry.expires = current + mythis.getResendingdelay();
                    entry.retries--;
                    //Warp.warn("Resending {"+entry.cseq+"} to "+entry.message.getTo()+"]. "+entry.retries+" more retries left");
                    mythis._send(entry.message);
                } else
                    if(entry.cseq > -1) {
                        //Warp.log("Killing {"+entry.cseq+"} to "+entry.message.getTo()+"]");
                        session.sBuffer.splice(i,1);
                        i--;
                        Warp.warn("Message {"+entry.cseq+"} was not delivered to ["+entry.message.getTo()+"] after allowed number of retries");
                    }
        }
    }
};

Warp.Resource.prototype._errorListener = function(evt) {
    if(evt.response.getStatusCode() == 404) {
        var from = evt.response.getFrom();
        if(from && evt.target._sessions[from]) {
            delete evt.target._sessions[from];
            Warp.warn("Removed session ["+from+"], remote resource returned 404");
        }
    }
};

/**
 * Synonym for {@link Warp.Resource#on}.
 *
 * @see Warp.Resource#on
 * @see Warp.Resource#removeEventListener
 *
 */
Warp.Resource.prototype.addEventListener = function(type, listener) {
    if (!this._eventlistenersMap[type])
        this._eventlistenersMap[type] = [];
    var eventlisteners = this._eventlistenersMap[type];
    for (var i = 0; i<eventlisteners.length; i++) {
        if(listener === eventlisteners[i])
            return;
    }
    eventlisteners[i] = listener;
};

/**
 * Unregister previously registered event listener.
 * 
 * @param {String} type The event type the listener triggers on.
 * @param {Function} listener The event listener to unregister.
 *
 * @see Warp.Resource#addEventListener
 */
Warp.Resource.prototype.removeEventListener = function(type, listener) {
    if (!this._eventlistenersMap[type])
        return;
    var eventlisteners = this._eventlistenersMap[type];
    for (var i = 0; i < eventlisteners.length; i++) {
        if (listener === eventlisteners[i]) {
            eventlisteners.splice(i,1);
            break;
        }
    }
};

Warp.Resource.prototype._dispatchEvent = function(evt) {
    evt.context = this.context;
    if(!evt.target)
        evt.target = this;
    evt.luid = this.getLuid();
    var ret = true;
    var listeners = this._eventlistenersMap[evt.type];
    if (!listeners) {
        if(evt.type != "beforeSend")
            Warp.warn("No listeners of {"+evt.type+"} registered for ["+this.getPath()+"]");
        return ret;
    }
    //Warp.log("Dispatching {"+evt.type+"} to ["+this.path+"]");
    for (var i = 0; i < listeners.length && ret; i++) {
        var rv = listeners[i](evt);
        var handled = rv !== true;
        if(handled)
            Warp.log("Event {"+evt.type+"} has been handled by resource ["+this.getPath()+"]");
        ret = !handled && ret;
    }
    return ret;
};

Warp.Resource.prototype._add = function(to, num) {
    return (to + num) % this.getMaxsequencenumberplusone();
};

Warp.Resource.prototype._subtract = function(from, num) {
    return from - num + (from >= num ? 0 : this.getMaxsequencenumberplusone());
};

Warp.Resource.prototype._within = function(n, begin, end) {
    if(begin < 0 || end < 0)
        return false;
    if(end>begin)
        return begin < n && n <= end;
    if(end<begin)
        return n >= 0 && n <= end || n > begin && n < this.getMaxsequencenumberplusone();
    return false;
};

/**
* Send a Warp message from this Warp resource.
*
* @param {Warp.Message} message The Warp message to send.
*
* @see Warp.Resource#sendTo
*/
Warp.Resource.prototype.send = function(message) {
    
    // Double back to Warp.send to convert a message into a valid object.
    if (!message.setFrom)
    {
        message.from = this.getPath();
        Warp.send(message);
        return;
    }
    
    message.setFrom(this.getPath());
    Warp.log("Sending message ["+message.getFrom()+"] -> ["+message.getTo()+"]");
    if(this.getInorderdelivery()) {
        var session = this._getSession(message.getTo());
        if(session) {
            if(this.getSenderbuffersize() > 0 && session.sBuffer.length >= this.getSenderbuffersize()) {
                Warp.warn("Maximum size of the send buffer is exceeded");
                return;
            }
            var entry = new Warp.BufferEntry;
            entry.message = message;
            session.sBuffer.push(entry);
            this._inorderSend(entry, session);
        }
    } else
        this._send(message);
};

Warp.Resource.prototype._inorderSend = function(entry, session) {
    var first = session.sLastAckReceived == -1;
    if(first) {
        if(session.sLastFrameSent == -1)
            session.sLastFrameSent = Math.floor(Math.random() * this.getMaxsequencenumberplusone());
        session.sLastAckReceived = this._subtract(session.sLastFrameSent, 1);
    } else
        if(this._subtract(session.sLastFrameSent, session.sLastAckReceived) < session.sWindowSize)
            session.sLastFrameSent = this._add(session.sLastFrameSent, 1);
        else
            return false;
    entry.message.setHeader(Warp.Message.HeaderName.CSeq, (first ? "F:" : "") + session.sLastFrameSent);
    entry.cseq = session.sLastFrameSent;
    //entry.message.data += " - C#"+entry.cseq;
    //Warp.log("Sending {"+session.sLastFrameSent+"} to ["+entry.message.getTo()+"]");
    this._send(entry.message);
    entry.expires = new Date().getTime() + this.getResendingdelay();
    entry.retries = this.getResendingretries()-1;
    return true;
};

Warp.Resource.prototype._getSession = function(uri) {
    var key = new Warp.URI(uri).toString();
    if(key) {
        var session = this._sessions[key];
        if(!session) {
            session = new Warp.ResourceSession;
            this._sessions[key] = session;
        }
        return session;
    }
    Warp.error("Could not obtain session for ["+uri+"]");
    return undefined;
};

Warp.Resource.prototype._resetSessions = function() {
    this._sessions = {};
    for(var idx in this._resources)
        this._resources[idx]._resetSessions();
};

Warp.Resource.prototype._send = function(message) {
    var evt = {"type": "beforesend"};
    evt.message = message;
    this._dispatchEvent(evt);
    if (this.getParent())
        this.getParent()._send(message);
};

/**
* Send data chunk from this Warp resource to the given destination. This is a
* convenience method that initializes the <i>X-Warp-To</i> header with the given
* destination address, <i>X-Warp-Method</i> header with the given method, the 
* message body with the given data and the <i>Content-Type</i> header with the
* given content type.
*
* @param {String} toAddress The destination address to send the data to.
* @param {String} [method] The method header value. If unspecified, defaults
*                          to <code>POST</code>.
* @param {String} [data] The data to send. If <i>data</i> is specified,
*                        <i>method</i> must be specified. <i>data</i> may be an
*                        Object. If so, it will be serialized into JSON format,
*                        and <i>contentType</i> is ignored.
* @param {String} [contentType] The content type of the data.
*
* @see Warp.Resource#send
*/
Warp.Resource.prototype.sendTo = function(toAddress, method, data, contentType) {
    if(typeof(toAddress) != "string") {
        Warp.warn("Invalid argument in sendTo(), address must be a string");
        return;
    }
    var message = new Warp.Message;
    message.setTo(toAddress);
    if (method)
        message.setMethod(method);
    else
        message.setMethod("POST");
    if (data) {
        if(typeof(data) != "string") {
            message.setData(JSON.stringify(data));
            message.setContentType("application/json");
        } else {
            message.setData(data);
            if (contentType) {
                if (typeof(contentType) != "string") {
                    // Treat contentType as a keyed object a la jQuery
                    for (var hn in contentType)
                        if (contentType.hasOwnProperty(hn))
                            message.setHeader(hn, contentType[hn]);
                } else
                    message.setContentType(contentType);
            }
        }
    }
    this.send(message);
};

Warp.Resource.prototype.get = function(toAddress, data, headers)
{
    this.sendTo(toAddress, "GET", data, headers);
}

Warp.Resource.prototype.put = function(toAddress, data, headers)
{
    this.sendTo(toAddress, "PUT", data, headers);
}

Warp.Resource.prototype.post = function(toAddress, data, headers)
{
    this.sendTo(toAddress, "POST", data, headers);
}

Warp.Resource.prototype.del = function(toAddress, data, headers)
{
    this.sendTo(toAddress, "DELETE", data, headers);
}

/**
* Executes a "synchronous request", by creating a temporary sub-resource of this
* resource, sending a message from that resource, and waiting for a reply. When a
* reply is received, it removes the temporary resource and invokes the supplied
* callback function.
* 
* @param {String} toAddress The destination address to send the data to. If
*                           <i>toAddress</i> contains a {@link Warp.Message} object
*                           instead of a string, the latter is sent and the
*                           <i>method</i>, <i>data</i>, and <i>contentType</i>
*                           arguments are ignored.
* @param {String} [method] The method header value. If unspecified, defaults to
*                          <code>GET</code>.
* @param {String} [data] The data to send. If <i>data</i> is specified, <i>method</i>
*                        must be specified. <i>data</i> may be an Object. If so, it
*                        will be serialized into JSON format, and <i>contentType</i>
*                        is ignored.
* @param {String} [contentType] The content type of <i>data</i>.
* @param {Function} callback The function to call when a response is received. The
*                   function must accept a single argument of type
*                   {@link Warp.MessageEvent}. The callback function will receive both error
*                   and message events!
*
* @see Warp.Resource#sendTo
*/
Warp.Resource.prototype.request = function() {
    var i = 0;
    var args = new Array();
    for (i=0; i < arguments.length-1; i++)
        args.push(arguments[i]);
    var listener = arguments[arguments.length-1];
    var rr = this.createResource();
    var cb = function(message) {
        try
        {
            rr.remove();
            listener(message);
        }
        catch(e)
        {
            if (e.stack)
                Warp.warn(e.stack);
            else
                Warp.warn(e);
        }
        return false;
    }
    rr.onmessage = cb;
    rr.onerror = cb;
    if (args.length == 1 && typeof(args[0]) == "object")
        rr.send(args[0]);
    else {
        if (args.length == 1) // method unspecified
            args.push("GET");
        rr.sendTo.apply(rr, args);
    }
};

/**
 * Create an ancestor of this Warp resource. The argument contains the path to
 * the ancestor being created relative to this Warp resource. The path may
 * contain several segments. All the intermediate ancestors will be created if
 * they do not already exist.
 * <p>
 * If called without a resourcePath, it will create a random, unique, subresource.
 *
 * @param {String} resourcePath The path to the Warp resource ancestor being
 *                 created relative to this Warp resource.
 *
 * @return A new Warp resource ancestor.
 * @type Warp.Resource
 *
 * @see Warp.Resource#removeResource
 * @see Warp.Resource#remove
 * @see Warp.Resource#children
 */
Warp.Resource.prototype.createResource = function(resourcePath) {
    
    if (!resourcePath)
        resourcePath = uuid();
    
    if (resourcePath.startsWith("/"))
        resourcePath = resourcePath.substring(1);
    
    if (resourcePath.length == 0)
        return this;
    
    return this._doCreateResource(resourcePath.split("/"));
};

Warp.Resource.prototype._doCreateResource = function(resourcePathParts) {
    var resourcePath = resourcePathParts[0];
    if (!this._resources[resourcePath]) {
        this._resources[resourcePath] = new Warp.Resource(this, resourcePath);
        Warp.log("Registered resource ["+resourcePath+"] as a subresource of ["+this.getName()+"]");
    } else {
        if (resourcePathParts.length == 1) {
            Warp.warn("Resource with the path ["+this.getPath()+"/"+resourcePath+"] already exists");
            return this._resources[resourcePath]; // We should either throw or return valid items. 
            // I changed the behaviour to return so we match the Java API (naming still to be normalised)
        }
    }
    if (resourcePathParts.length == 1)
        return this._resources[resourcePath];
    resourcePathParts.splice(0, 1);
    return this._resources[resourcePath]._doCreateResource(resourcePathParts);
};

/**
 * Remove given Warp resource from the list of immediate ancestors of this Warp
 * resource.
 *
 * @param {Warp.Resource} resource The Warp resource to remove.
 *
 * @see Warp.Resource#createResource
 * @see Warp.Resource#remove
 * @see Warp.Resource#children
 */
Warp.Resource.prototype.removeResource = function(resource) {
    if (!this._resources[resource.getName()]) {
        Warp.warn("Resource ["+resource.getName()+"] is not a subresource of ["+this.getName()+"]");
        return;
    }
    delete this._resources[resource.getName()];
    Warp.log("Unregistered resource ["+resource.getName()+"] from ["+this.getName()+"]");
};

Warp.Resource.prototype._dispatch = function(evt, resourcePathParts) {
    if (resourcePathParts && resourcePathParts.length > 0) {
        var child = this._resources[resourcePathParts[0]];
        if (child) {
            resourcePathParts.splice(0,1);
            child._dispatch(evt, resourcePathParts);
        } else
        {
            Warp.warn("Could not dispatch {"+evt.type+"} event to an nonexistent resource ["+this.getPath()+"/"+resourcePathParts[0]+"]");
            
            // Send a 404...
            var reply = new Warp.Message();
            reply.to = evt.origin;
            reply.from = evt.to;
            reply.statusCode = 404;
            reply.data = evt.toString();
            
            this._send(reply);
        }
        return;
    }
    this._receiveMessage(evt);
};

Warp.Resource.prototype._answer = function(from, to, answer) {
    var ack = new Warp.Message;
    ack.setMethod("POST");
    ack.setFrom(from);
    ack.setTo(to);
    ack.setHeader(Warp.Message.HeaderName.CSeq, answer);
    //ack.data = answer;
    //Warp.log("Answering {"+answer+"} to ["+to+"]");
    var parent = this;
    while(parent.getParent())
        parent = parent.getParent();
    parent._send(ack);
};

Warp.Resource.prototype._receiveMessage = function(evt) {
    if(this.getInorderdelivery() && evt.type == "message") {
        var scseq = evt.getHeader(Warp.Message.HeaderName.CSeq);
        evt.removeHeader(Warp.Message.HeaderName.CSeq);
        if(scseq) {
            var from = evt.getFrom();
            //Warp.log("Received {"+scseq+"} from ["+from+"]");
            var session = this._getSession(from);
            if(session) {
                var cseq = parseInt(scseq.substring(scseq.lastIndexOf(":")+1));
                if(!isNaN(cseq)) {
                    if(scseq.indexOf("N:") >= 0) {
                        if(this._within(cseq, session.sLastAckReceived, session.sLastFrameSent)) {
                            session.sLastFrameSent = this._add(session.sLastFrameSent, this.getReceiverwindowsize());
                            session.sLastAckReceived = -1;
                            session.sWindowSize = 1;
                            for(var i = 0; i < session.sBuffer.length; i++) {
                                var entry = session.sBuffer[i];
                                if(!this._inorderSend(entry, session)) {
                                    if(entry.cseq == -1)
                                        break;
                                    entry.cseq = -1;
                                }
                            }
                        } //else
                            //Warp.warn("Skipped {"+scseq+"} from ["+from+"], expected interval is ("+session.sLastAckReceived+","+session.sLastFrameSent+"]");
                    } else
                        if(scseq.indexOf("A:") >= 0) {
                            if(this._within(cseq, session.sLastAckReceived, session.sLastFrameSent)) {
                                session.sLastAckReceived = cseq;
                                session.sWindowSize = this.getSenderwindowsize();
                                while(session.sBuffer.length > 0) {
                                    var entry = session.sBuffer[0];
                                    if(this._within(entry.cseq, this._subtract(session.sLastAckReceived, session.sWindowSize), session.sLastAckReceived))
                                        session.sBuffer.splice(0,1);
                                    else
                                        break;
                                }
                                for(var i = 0; i < session.sBuffer.length; i++) {
                                    var entry = session.sBuffer[i];
                                    if(entry.cseq == -1 && !this._inorderSend(entry, session))
                                        break;
                                }
                            } //else
                                //Warp.warn("Skipped {"+scseq+"} from ["+from+"], expected interval is ("+session.sLastAckReceived+","+session.sLastFrameSent+"]");
                        } else {
                            var to = evt.getTo();
                            if(scseq.indexOf("F:") >= 0) {
                                if(session.rLastFrameReceived == -1 || cseq != session.rLastFirst) {
                                    session.rLastFirst = cseq;
                                    session.rLastFrameReceived = this._subtract(cseq, 1);
                                    session.rLargestAcceptableFrame = this._add(session.rLastFrameReceived, this.getReceiverwindowsize());
                                    session.rBuffer = {};
                                } //else
                                    //Warp.warn("Skipped {"+scseq+"} from ["+from+"], suspected duplicate first");
                            } else
                                if(session.rLastFrameReceived == -1) {
                                    this._answer(to, from, "N:"+cseq);
                                    return;
                                }
                            if(this._within(cseq, session.rLastFrameReceived, session.rLargestAcceptableFrame)) {
                                //Warp.log("Accepted {"+cseq+"} from ["+from+"], fits in ("+session.rLastFrameReceived+","+session.rLargestAcceptableFrame+"]");
                                session.rBuffer[cseq] = evt;
                                var next = this._add(session.rLastFrameReceived, 1);
                                var last = next;
                                while(session.rBuffer[last])
                                    last = this._add(last, 1);
                                last = this._subtract(last, 1);
                                session.rLastFrameReceived = last;
                                session.rLargestAcceptableFrame = this._add(session.rLastFrameReceived, this.getReceiverwindowsize());
                                this._answer(to, from, "A:"+last);
                                while(session.rBuffer[next]) {
                                    evt = session.rBuffer[next];
                                    delete session.rBuffer[next];
                                    //Warp.log("Handling {"+next+"} from ["+from+"]");
                                    this._handleMessage(evt);
                                    next = this._add(next, 1);
                                }
                            } else {
                                //Warp.warn("Skipped {"+cseq+"} from ["+from+"], expected interval is ("+session.rLastFrameReceived+","+session.rLargestAcceptableFrame+"]");
                                this._answer(to, from, "A:"+session.rLastFrameReceived);
                            }
                        }
                    return;
                } else
                    Warp.warn("Skipped malformed header "+Warp.Message.HeaderName.CSeq+": "+evt.getHeader(Warp.Message.HeaderName.CSeq));
            }
        }
    }
    this._handleMessage(evt);
};

Warp.Resource.prototype._handleMessage = function(evt) {
    try {
        var bubble = true;
        if (evt.type == "message" && evt.getMethod())
        {
            evt.type = evt.getMethod().toLowerCase();
            bubble = this._dispatchEvent(evt);
            evt.type = "message";
        }
        if(bubble && this._dispatchEvent(evt) && this.getParent())
            this.getParent()._handleMessage(evt);
    } catch(e) {
        // Handle_error(e)
        Warp.error("Failed to dispatch a message: ", e, "(", e.number, "|", e.name, "|", e.description, ")");
    }
};

/**
 * Remove this Warp resource from the list of immediate ancestors of its parent
 * Warp resource.
 *
 * @see Warp.Resource#createResource
 * @see Warp.Resource#removeResource
 * @see Warp.Resource#children
 */
Warp.Resource.prototype.remove = function() {
   this.getParent().removeResource(this);
};


/**
 * Create and send a new Warp message specifying an error. Accepts status code and
 * a string message to send. All arguments must be specified.
 * 
 * @param {Warp.Message} cause The Warp message that caused this error.
 * @param {Number} code The status code of this error.
 * @param {String} message A string that the receiving side can use to determine
 *                         what the error was. This string may be application specific
 *                         (i.e. it can be machine-readable) but should preferably
 *                         also include a user-readable part.
 */
Warp.Resource.prototype.sendError = function(cause, code, message)
{
    var reply = new Warp.Message();
    reply.setData(message + cause.toString());
    reply.setStatusCode(code);
    reply.setTo(cause.getFrom());
    reply.setMethod("POST");
    reply.setHeader(Warp.Message.HeaderName.ReasonLength, message.length);
    this.send(reply);
};

/**
 * Called when the "message" event is dispatched.
 * 
 * @param {Warp.MessageEvent} evt The dispatched event.
 */
Warp.Resource.prototype.onmessage = function(evt) { return true; };

/**
 * Called when the "challenge" event is dispatched.
 * 
 * @param {Warp.ErrorEvent} evt The dispatched event.
 */
Warp.Resource.prototype.onchallenge = function(evt) { return true; };

/**
 * Called when the "redirect" event is dispatched.
 * 
 * @param {Warp.ErrorEvent} evt The dispatched event.
 */
Warp.Resource.prototype.onredirect = function(evt) { return true; };

/**
 * Called when the "error" event is dispatched.
 * 
 * @param {Warp.ErrorEvent} evt The dispatched event.
 */
Warp.Resource.prototype.onerror = function(evt) { return true; };

/**
 * Called when the "beforesend" event is dispatched.
 * 
 * @param {Event} evt The dispatched event.
 */
Warp.Resource.prototype.onbeforesend = function(evt) { return true; };

Warp.Resource.Type = {};
Warp.Resource.Type.Inorder = "InorderResourceType";
Warp.Resource.Type.Stream = "StreamMessageResourceType";

/**
 * This constructor is not supposed to be called directly. Instead fetch the
 * Warp root resource by accessing the field <code>Warp.rootResource</code>.
 * 
 * The following events are triggered on the Warp root resource:
 * 
 * <ul>
 *   <li><b>connect</b> - the Warp root resource has been successfully connected
 *                        to a Warp network. The <i>luid</i> property of the
 *                        the Warp root resource has been assigned an actual
 *                        client's LUID. It is <u>IMPORTANT</u> to observe an
 *                        <b>onConnect</b> event <u>BEFORE</u> any of
 *                        {@link Warp.Resource#send},
 *                        {@link Warp.Resource#sendTo} or
 *                        {@link Warp.Resource#request} are invoked.</li><p>
 *
 *   <li><b>disconnect</b> - the Warp root resource has been permanently
 *                           disconnected from the Warp network. The
 *                           <i>luid</i> property of the Warp root resource has
 *                           been set to <code>null</code>. The <i>status</i>
 *                           property of the event object contains the
 *                           status code and the <i>statusText</i> property -
 *                           an explanation string of the reason the Warp
 *                           root resource has been disconnected.</li><p>
 * </ul>
 *
 * Every Warp root resource has two event listeners registered. One has the type
 * <b>challenge</b> to handle <i>401 Unauthorized</i> responses from the
 * Warp services which stores a password that is received in the response
 * body. The second listener is of type <b>beforesend</b> that, if applicable,
 * computes and adds the <i>Authorization</i> header to the outgoing messages
 * based on passwords observed by the first listener.
 *
 * @class <code>Warp.RootResource</code> is a special (root) Warp resource that
 * manages the connectivity between a client web application and the Warp
 * network. The messages addressed to the client web application that owns this
 * Warp root resource are dispatched to it accordingly by the underlying transport
 * framework based on the name of this Warp root resource. Warp root resource is a
 * full-fledged Warp resource and the container of the client web application's
 * Warp resources.<p>
 *
 * @augments Warp.Resource
 * @constructor
 *
 * @param {String} name The name of the Warp root resource being created.
 *
 * @return A new Warp root resource.
 * @type Warp.RootResource
 *
 * @see Warp.Resource
 * @see Warp.Message
 *
 */
Warp.RootResource = function(name) {

    var mt = this;
    this._luid = null;

    Warp.Resource.prototype.constructor.call(this, undefined, name);

    __defineGetter(this, "path", function() {
        return "/" + mt.getName();
    });

    __defineGetter(this, "luid", function() {
        return mt._luid;
    });

    __defineGetter(this, "guid", function() {
        return mt._guid;
    });

    __defineGetter(this, "uaid", function() {
        return mt._uaid;
    });
    
    this.addEventListener("connect", function(evt) { return mt.onconnect(evt); return true; });
    this.addEventListener("disconnect", function(evt) { return mt.ondisconnect(evt); return true; });
    
    // These hooks will propagate the event to Warp namespace. 
    // I don't see why we can't do that, and it simplifies initialisation a lot for apps
    // that do not care about the optimisations
    this.addEventListener("connect", function(evt) { return _dispatchEvent(evt); });
    this.addEventListener("disconnect", function(evt) { return _dispatchEvent(evt); });
    
    this.addEventListener("challenge", this._handleWWWAuthenticate);
    this.addEventListener("beforesend", this._handleAuthorization);
    
    this._outBuf = [];

};

Warp.RootResource.prototype = new Warp.Resource;
Warp.RootResource.prototype.constructor = Warp.RootResource;

/**
 * Called when this Warp.RootResource is considered "connected"; that is, when it is ready to send and receive messages.
 * @param evt Placeholder
 */
Warp.RootResource.prototype.onconnect = function(evt) { return true; };

/**
 * Called when the Warp.RootResource object is no longer capable of sending or receiving messages. A disconnect is always considered "temporary",
 * and thus there is always the possibility that the root resource will be reconnected in the future, but there is no guarantee that this will occur.
 * @param evt Placeholder
 */
Warp.RootResource.prototype.ondisconnect = function(evt) { return true; };

/**
 * Reconnects previously closed root resource.
 */
Warp.RootResource.prototype.connect = function() {
    if(this._luid) {
        Warp.warn("Already connected (connect() command had no effect)");
        return;
    }
    Warp.warpManager.connect();
};

/**
 * Close this root resource and disconnect it from the underlying framework
 * for the Warp network transport. Closing an already closed root resource has no
 * effect.
 */
Warp.RootResource.prototype.close = function() {
    if(!this._luid) {
        Warp.warn("Root resource ["+this.getName()+"] is not initialized (close() command had no effect)");
        return;
    }
    Warp.warpManager.disconnect();
};

Warp.RootResource.prototype._onConnect = function(name, luid, guid, uaid) {
    
    this.__rename__(name);
    
    // If the onconnect call is redundant, ignore it.
    if (this._luid == luid && this._guid == guid && (!uaid || this._uaid == uaid))
        return;
    
    this._resetSessions();
    this._luid = luid;
    this._guid = guid;
    this._uaid = uaid;
    if (!!uaid)
        Warp.log("Authenticated as ["+uaid+"]");
    
    while(this._outBuf.length > 0)
    {
        var msg = this._outBuf.shift();
        this._send(msg);
    }
    
    var evt = {"type" : "connect"};
    this._dispatchEvent(evt);
};

Warp.RootResource.prototype._onDisconnect = function(status, statusText) {
    this._luid = null;
    this._resetSessions();
    var evt = {"type" : "disconnect"};
    evt.status = status;
    evt.statusText = statusText;
    this._dispatchEvent(evt);
};

Warp.RootResource.prototype._send = function(message) {
    if(!this._luid) {
        if (Warp.config.nobuffer)
        {
            Warp.warn("Root resource ["+this.getName()+"] is not initialized; an outgoing message was discarded.");
        }
        else
        {
            this._outBuf.push(message);
        }
        return;
    }
    
    if (message.getFrom().startsWith("/undefined"))
        message.setFrom(this.getPath() + message.getFrom().substring(10));
    
    Warp.Resource.prototype._send.call(this, message);
    Warp.connectionManager.send(message);
};

Warp.RootResource.prototype._dispatch = function(message, resourcePath) {
    var msg = new Warp.Message;
    msg.setData(message._data);
    msg.setHeaders(message._headers);
    
    var hStatus = msg.getStatusCode();
    if (hStatus && hStatus >= 300 && hStatus < 600) {
        var reason = new Warp.Message;
        var hReasonLength = msg.getHeader(Warp.Message.HeaderName.ReasonLength);
        if(hReasonLength && hReasonLength > 0) {
            reason._fromWireString(msg.getDataAsString().substring(hReasonLength));
            msg.setData(msg.getDataAsString().substring(0, hReasonLength));
        } else {
            reason._fromWireString(msg.getData());
            msg.setData(null);
        }
        
        var evt = new Warp.ErrorEvent;
        
        if (hStatus < 400)
            evt.type = "redirect";
        else if (hStatus == 401)
            evt.type = "challenge";
        else if (hStatus < 600)
            evt.type = "error";
        
        msg.removeHeader(Warp.Message.HeaderName.ReasonLength);
        evt.request = reason;
        evt.response = msg;
    } else {
        var evt = new Warp.MessageEvent(msg);
    }
    Warp.Resource.prototype._dispatch.call(this, evt, (resourcePath.length > 0 ? resourcePath.split("/") : null));
};

Warp.RootResource.prototype._handleWWWAuthenticate = function(evt) {
    var challenge = evt.response.getHeader(Warp.Message.HeaderName.HTTPAuthenticate);
    if (!challenge)
        return true;
    
    var from = evt.response.getFrom();
    var domain = from.split("/", 3)[2] + "/";
    if (challenge.search(/(\s)*PLAINTEXT(\s)+/) == 0) {
        if (evt.context[domain]) {
            Warp.warn("You should provide another password");
            //ask_for_password();
            return true;
        } else {
            evt.context[domain] = evt.response.getData();
            evt.target.send(evt.request);
        }
    } else
        if (challenge.search(/(\s)*Digest(\s)+/) == 0) {
            var httpDigest;
            //var realm = httpDigest.getRealm(challenge);
            if (!evt.context[domain])
                httpDigest = new Warp.HTTPDigest;
            else {
                httpDigest = evt.context[domain];
                if (!httpDigest.isStale(challenge)) {
                    Warp.warn("You should provide another password");
                    //ask_for_password();
                    return true;
                }
            }
            var callback = function(decrypted) {
                httpDigest.setChallenge(challenge);
                httpDigest.setCredentials(evt.luid, decrypted);
                evt.context[domain] = httpDigest;
                evt.target.send(evt.request);
            };
            
            // TODO: This will not merge with Wheeldroid well
            Warp.warpManager.decrypt(evt.response.getData(), callback);
        } else
            return true;
    return false;
};

Warp.RootResource.prototype._handleAuthorization = function(evt) {
    var to = evt.message.getTo();
    if (!to)
        return true;
    
    if (!to.startsWith("warp://"))
        to = "warp://" + to;
    
    var domain = to.split("/", 3);
    if (!domain || domain.length < 3)
        return true;
    domain = (domain[2]+"/").toLowerCase();
    var cResponse = evt.context[domain];
    if (!cResponse)
        return true;
    if (cResponse.computeResponse && cResponse.authCredentials)
        cResponse = cResponse.computeResponse(evt.message.getMethod(), to, evt.message.getData());
    else
        cResponse = "PLAINTEXT " + cResponse;
    evt.message.setHeader(Warp.Message.HeaderName.HTTPAuthorization, cResponse);
    return false;
};

if (Warp.application)
    Warp.rootResource = new Warp.RootResource(Warp.application.resource);
Warp.URI = function(str) {

    __defineGetter(this, "provider", function() {
        return this._provider;
    });

    __defineSetter(this, "provider", function(provider) {
        if(typeof(provider) == "string" && /[0-9a-zA-Z\\-_.+]+/.test(provider))
            this._provider = provider.toLowerCase();
        else
            this._provider = undefined;
    });

    __defineGetter(this, "type", function() {
        return this._type;
    });

    __defineSetter(this, "type", function(type) {
        if(type == ":" || type == "?")
            this._type = type;
        else
            this._type = ":";
    });

    __defineGetter(this, "service", function() {
        return this._service;
    });

    __defineSetter(this, "service", function(service) {
        if(typeof(service) == "string" && /[0-9a-zA-Z\\-_.+]+/.test(service))
            this._service = service.toLowerCase();
        else
            this._service = undefined;
    });
    
    __defineGetter(this, "resource", function() {
        return this._resource;
    });

    __defineSetter(this, "resource", function(resource) {
        if(typeof(resource) == "string") {
            if(resource.indexOf("/")!=0)
                resource = "/"+resource;
            if(/(\/.)*/.test(resource)) {
                //TODO: resolve all ".." to parents but not outside of the scope
                this._resource = resource;
                return;
            }
        }
        this._resource = "/";
    });
    
    this._provider;
    this._type;
    this._service;
    this._resource;
    
    this.fromString(str);
    
};

Warp.URI.prototype.fromString = function(s) {
    if (typeof(s) == "string") {
        var exp = /((warp):\/\/)?([0-9a-zA-Z\\-_.+]+)(:|\?)([0-9a-zA-Z\\-_.+]+)((\/(.)+)*)/;
        exp = exp.exec(s);
        if(exp) {
            this.setProvider(exp[3]);
            this.setType(exp[4]);
            this.setService(exp[5]);
            this.setResource(exp[6]);
            return;
        }
    }
    this.setProvider(null);
    this.setType(null);
    this.setService(null);
    this.setResource(null);
};

Warp.URI.prototype.valid = function() {
    if(typeof(this.getProvider()) != "string" || typeof(this.getType()) != "string" || typeof(this.getService()) != "string" || typeof(this.getResource()) != "string")
        return false;
    return this.getProvider().length > 0 && (this.getType() == ":" || this.getType() == "?") && this.getService().length > 0;
};

Warp.URI.prototype.toString = function() {
    if(this.valid())
        return "warp://"+this.getProvider()+this.getType()+this.getService()+this.getResource();
    return undefined;
};

/*
This file defines convenience methods for Warp/JS. Compare with WarpConvenienceMethods.java. Signatures are kept equivalent where possible.
 */

/**
 * Convenience method to quickly send a message.
 * 
 * @example Warp.send({to: "warp://example:service/test", data: "hello"});
 * 
 * @method
 * @param {Object}
 *            message An object representing a message to send. A number of
 *            predefined properties exist on the message format. Any unknown
 *            property will be directly added as a message header. The known
 *            properties list (in addition to the ones listed below) is the
 *            lowercase versions of {@link Warp.Message.HeaderName}.
 * @param {String}
 *            message.to The destination URI to send the message to.
 * @param {String}
 *            [message.from=/] The path to send the message from (e.g. "/" to
 *            send from the root resource, or "/foo/bar" to send from /foo/bar).
 * @param {String}
 *            [message.method=POST] The method to use while sending. Commonly
 *            GET, PUT, POST or DELETE, but may be any string.
 * @param {ArrayBuffer|String}
 *            [message.data=""] The data to send.
 * @param {Integer}
 *            [message.status] The status code of the message. Should be between
 *            100 and 700
 */
Warp.send = function(message, options) {

    if (!message.from)
        message.from = "/";

    if (!message.from.startsWith("/"))
        message.from = "/" + message.from;

    if (typeof (message.to) != "string")
        throw "Must supply a recipient URI, and said URI must be a string.";

    var res = Warp.at(message.from);

    if (!message.method)
        message.method = "POST";

    var msg = Warp.Message.fromObject(message);

    res.send(msg);

};

/**
 * Sends a message, and calls a callback handler on any eventual replies.
 * 
 * @method request
 * @memberof Warp
 * @param {Object}
 *            message The message to send as a request. See {@link Warp.send}
 *            for the properties acceptable on a message.
 * @param {Object}
 *            options A set of options to the request function.
 * @param {Function}
 *            options.callback The function to call when a message is received.
 *            The argument will be a single {@link Warp.MessageEvent}.
 * @param {Integer} [options.timeout=30000]
 *            [NYI] The number of milliseconds to wait before timing out
 *            (dispatching an errorEvent to the callback function).
 * @param {Integer}
 *            [options.replies=1] The number of expected replies. The callback
 *            will be automatically removed after reaching this number of
 *            replies. Set to 0 to never expire.
 */

/**
 * Convenience method to send a request without options. This function expects a
 * single reply, and will not call the callback method more than once.
 * 
 * @param {Object}
 *            message A Message object to send
 * @param {Function}
 *            callback The function to call when a message is received.
 * @return {Warp.Resource} The resource the request is being made from. If no
 *         longer interested in the response, call resource.remove();
 * @example
 * 
 * <pre>
 * Warp.request({
 *  to : &quot;warp://echo:service/echo&quot;,
 *  data : &quot;hello&quot;
 * }, function(m) {
 *  console.log(m.text);
 * });
 * </pre>
 */
Warp.request = function(message, arg1, arg2) {
    var callback = (typeof (arg1) == "function" ? arg1 : arg2);
    var options = (typeof (arg1) == "function" ? arg2 : arg1);

    if (!callback)
        callback = options.callback;

    if (!callback)
        throw "Must supply a callback for request";

    if (!options)
        options = {};

    if (typeof (options.replies) == "undefined")
        options.replies = 1;

    var rr = Warp.rootResource.createResource();
    var cb = function(message) {
        try {
            if ((--options.replies) == 0)
                rr.remove();
            callback(message);
        } catch (e) {
            if (e.stack)
                Warp.warn(e.stack);
            else
                Warp.warn(e);
        }
        return false;
    }
    rr.onmessage = cb;
    rr.onerror = cb;

    if (!message.method)
        message.method = "GET";

    var msg = Warp.Message.fromObject(message);

    rr.send(msg);

    return rr;

};

/**
 * Convenience method for performing a subscribe operation (sending a message,
 * then calling the callback function an infinite number of times).
 * 
 * @param {Object}
 *            message The message to send. See {@link Warp.send} for the full
 *            parameters list.
 * @param {String}
 *            message.to The URI to send to
 * @param {String}
 *            [message.method=PUT] The method to use.
 * @param {Function}
 *            callback The callback function to call. It will receive a
 *            {@link Warp.MessageEvent} for every message received.
 * @return {Warp.Resource} The resource the subscription is tied to. To
 *         unsubscribe, send a message from this resource and/or call
 *         resource.remove();
 */
Warp.subscribe = function(message, callback) {
    if (!message.method)
        message.method = "PUT";
    return Warp.request(message, {
        callback : callback,
        replies : 0
    });
};

Warp.reply = function(src, message, options) {
    var msg = Warp.Message.fromObject(message);
    msg.to = src.from;
    msg.from = src.to;
    Warp.rootResource._send(msg);
};

Warp.resourceAt = function(path) {
    return Warp.rootResource.createResource(path);
};

/**
 * Accesses a resource at a given path. Use "/" for the root resource. If the
 * resource doesn't exist, it will automatically be created. Intermediary paths
 * are also allowed, e.g. "/foo/bar" will create both "foo" and "bar" if
 * necessary. If the resource already exists, returns the existing resource.
 * <p>
 * Accessing resources is necessary for implementing more advanced use cases,
 * such as dividing up the application into components, or using reliable
 * in-order delivery. See the {@tutorial resources} tutorial for how to make a
 * resource tree.
 * 
 * @method
 * @param {String}
 *            path The path to get the resource of
 * @returns {Warp.Resource} The resource at the given path
 */
Warp.at = Warp.resourceAt;

/**
 * The URI of the root resource. Warp must have been connected for this to
 * return a meaningful value.
 * 
 * @member uri
 * @memberof Warp
 * @readonly
 * @type String
 */

__defineGetter(Warp, "uri", function() {
    return Warp.rootResource.getUri();
});

Warp.uriOf = function(path) {
    return Warp.at(path).getUri();
};

// @formatter:off
/**
 * Add a number of event listeners using a single call. This function will
 * iterate over all the properties of the passed object, interpret them as event
 * names and add the values of those properties as callback functions for those
 * events.
 * 
 * @param {Object}
 *            events An object whose fields represent the event names to listen
 *            to, and the values of those fields are callback functions.
 * 
 * 
 * @example
 * 
 * <pre>
 * this.on({
 *  message : function(m) {
 *      console.log(m.text);
 *  },
 *  post : function(m) {
 *      console.warn(m.text);
 *  }
 * });
 * </pre>
 * 
 */
// @formatter:on
Warp.Resource.prototype.on = function(arg1, arg2) {
    if (typeof (arg1) == "object") {
        for ( var name in arg1) {
            this.on(name, arg1[name]);
        }
    } else if (typeof (arg1) == "string" && typeof (arg2) == "function") {
        this.addEventListener(arg1, arg2);
    } else
        throw "Invalid call to on";
};

Warp.Resource.prototype.off = function(arg1, arg2) {
    if (typeof (arg1) == "object") {
        for ( var name in arg1) {
            this.off(name, arg1[name]);
        }
    } else if (typeof (arg1) == "string" && typeof (arg2) == "function") {
        this.removeEventListener(arg1, arg2);
    } else
        throw "Invalid call to off";
};

Warp.on = function() {
    Warp.rootResource.on.apply(Warp.rootResource, arguments);
};

Warp.off = function() {
    Warp.rootResource.off.apply(Warp.rootResource, arguments);
};
if (!Warp.util)
    Warp.util = {};

Warp.util.timeouts = {};
Warp.util.timeoutNum = 1;

Warp.util.timeout = function(time, object) {
    var tn = "t"+Warp.util.timeoutNum++;
    Warp.util.timeouts[tn] = object;
    setTimeout("Warp.util.doTimeout(\"" + tn + "\");", time);
};

Warp.util.doTimeout = function(timeout) {
    var obj = Warp.util.timeouts[timeout];
    delete Warp.util.timeouts[timeout];
    obj.ontimeout();
};

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}

if (typeof String.prototype.trim != 'function')
{
    String.prototype.trim = function(str)
    {
        var s = str.replace(/^\s\s*/, ''),
            ws = /\s/,
            i = s.length;
        while (ws.test(s.charAt(--i)));
        return s.slice(0, i + 1);
        
    };
}

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

if (typeof String.prototype.contains != 'function')
{
    String.prototype.contains = function(target)
    {
        return this.indexOf(target) != -1;
    };
};

// Calculates the length of the string in utf-8
if (typeof String.prototype.utf8ByteLength != 'function')
{
    String.prototype.utf8ByteLength = function()
    {
        // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
        var m = encodeURIComponent(this).match(/%[89ABab]/g);
        return this.length + (m ? m.length : 0);
    };
};

String.prototype.toUTF8ByteArray = function() {
    var bytes = [];

    var s = unescape(encodeURIComponent(this));

    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        bytes.push(c);
    }

    return bytes;
};

String.fromUTF8ByteArray = function(arr, offset, length)
{
    var str = "";
    if (typeof(offset) == "undefined")
    {
        offset = 0; length = arr.length;
    }
    
    for (var i=offset; i<length; i++)
        str += String.fromCharCode(arr[i]);
    
    return String.utf8Decode(str);
};

String.utf8Encode = function(src)
{
    return unescape( encodeURIComponent( src ) );
};

String.utf8Decode = function(src)
{
    return decodeURIComponent( escape( src ) );
};

function capitalise(str)
{
    return str.substr(0,1).toUpperCase() + str.substr(1);
}

function __defineSetter(object, setterName, cb)
{
    
    var newName = "set" + capitalise(setterName);
    
    if (object.__defineSetter__)
    {
        try
        {
            object.__defineSetter__(setterName, function()
            {
                if (Warp.config.debug && Warp.config.iewarn != false)
                {
                    Warp.warn("Using setter [", setterName, "] as field. This code will fail in Internet Explorer. Use " + newName + "() instead (if compatibility is desired)");
                }
                return cb.apply(object, arguments);
            });
        } catch(e){}
    }

    // Also create the getter function as a property of the object
    object[newName] = cb;
}

function __defineGetter(object, getterName, cb)
{
    
    var newName = "get" + capitalise(getterName);
    
    if (object.__defineGetter__)
    {
        try
        {
            object.__defineGetter__(getterName, function()
            {
                if (false && Warp.config.debug && Warp.config.iewarn != false)
                {
                    Warp.warn("Using getter [", getterName, "] as field. This code will fail in Internet Explorer. Use " + newName + "() instead (if compatibility is desired)");
                }
                return cb.apply(object, arguments);
            });
        } catch(e){}
    }
    
    // Also create the getter function as a property of the object
    object[newName] = cb;
}

function __addEventListener(object, event, listener)
{
    
    function ie() { object.attachEvent("on"+event, listener); }
    
    if (object.addEventListener)
        try
        {
            object.addEventListener(event, listener, false);
        } catch(e) { ie(); } // Yes, Internet Explorer supports AddEventListener... YET STILL THROWS. What's the logic? Really?
    else if (object.attachEvent)
        ie();
    else
        Warp.warn("Could not add listener for ", event, " to object ", object);
}

// Random, unique, unpredictable
// Both uuidCounter++ are needed and Math.random.
// uuidCounter++ ensures unique
// Math.random() ensures unpredictable
// Prints it out as hex with no other punctuation (looks neater)
var uuidCounter = 0;
var uuid = function()
{
    return Math.random().toString(16).substring(2) + (uuidCounter++).toString(16);
};
(function(){
      // Only apply settimeout workaround for iOS 6 - for all others, we map to native Timers
    return;
      if (!navigator.userAgent.match(/OS 6(_\d)+/i)) return;
      
      // Abort if we're running in a worker. Let's hope workers aren't paused during scrolling!!!
      if (typeof(window) == "undefined")
          return;
     
      (function (window) {
          
          // This library re-implements setTimeout, setInterval, clearTimeout, clearInterval for iOS6.
          // iOS6 suffers from a bug that kills timers that are created while a page is scrolling.
          // This library fixes that problem by recreating timers after scrolling finishes (with interval correction).
        // This code is free to use by anyone (MIT, blabla).
        // Author: rkorving@wizcorp.jp

          var timeouts = {};
          var intervals = {};
          var orgSetTimeout = window.setTimeout;
          var orgSetInterval = window.setInterval;
          var orgClearTimeout = window.clearTimeout;
          var orgClearInterval = window.clearInterval;


          function createTimer(set, map, args) {
                  var id, cb = args[0], repeat = (set === orgSetInterval);

                  function callback() {
                          if (cb) {
                                  cb.apply(window, arguments);

                                  if (!repeat) {
                                          delete map[id];
                                          cb = null;
                                  }
                          }
                  }

                  args[0] = callback;

                  id = set.apply(window, args);

                  map[id] = { args: args, created: Date.now(), cb: cb, id: id };

                  return id;
          }


          function resetTimer(set, clear, map, virtualId, correctInterval) {
                  var timer = map[virtualId];

                  if (!timer) {
                          return;
                  }

                  var repeat = (set === orgSetInterval);

                  // cleanup

                  clear(timer.id);

                  // reduce the interval (arg 1 in the args array)

                  if (!repeat) {
                          var interval = timer.args[1];

                          var reduction = Date.now() - timer.created;
                          if (reduction < 0) {
                                  reduction = 0;
                          }

                          interval -= reduction;
                          if (interval < 0) {
                                  interval = 0;
                          }

                          timer.args[1] = interval;
                  }

                  // recreate

                  function callback() {
                          if (timer.cb) {
                                  timer.cb.apply(window, arguments);
                                  if (!repeat) {
                                          delete map[virtualId];
                                          timer.cb = null;
                                  }
                          }
                  }

                  timer.args[0] = callback;
                  timer.created = Date.now();
                  timer.id = set.apply(window, timer.args);
          }


          window.setTimeout = function () {
                  return createTimer(orgSetTimeout, timeouts, arguments);
          };


          window.setInterval = function () {
                  return createTimer(orgSetInterval, intervals, arguments);
          };

          window.clearTimeout = function (id) {
                  var timer = timeouts[id];

                  if (timer) {
                          delete timeouts[id];
                          orgClearTimeout(timer.id);
                  }
          };

          window.clearInterval = function (id) {
                  var timer = intervals[id];

                  if (timer) {
                          delete intervals[id];
                          orgClearInterval(timer.id);
                  }
          };

          window.addEventListener('scroll', function () {
                  // recreate the timers using adjusted intervals
                  // we cannot know how long the scroll-freeze lasted, so we cannot take that into account

                  var virtualId;

                  for (virtualId in timeouts) {
                          resetTimer(orgSetTimeout, orgClearTimeout, timeouts, virtualId);
                  }

                  for (virtualId in intervals) {
                          resetTimer(orgSetInterval, orgClearInterval, intervals, virtualId);
                  }
          });

    }(window));
    })();
if (!this.JSON) {
    JSON = {};
}
(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z';
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());

Warp.MD5 = function (string) {
 
    function RotateLeft(lValue, iShiftBits) {
        return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
    }
 
    function AddUnsigned(lX,lY) {
        var lX4,lY4,lX8,lY8,lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    }
 
    function F(x,y,z) { return (x & y) | ((~x) & z); }
    function G(x,y,z) { return (x & z) | (y & (~z)); }
    function H(x,y,z) { return (x ^ y ^ z); }
    function I(x,y,z) { return (y ^ (x | (~z))); }
 
    function FF(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };
 
    function GG(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };
 
    function HH(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };
 
    function II(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };
 
    function ConvertToWordArray(string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWords_temp1=lMessageLength + 8;
        var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
        var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
        var lWordArray=Array(lNumberOfWords-1);
        var lBytePosition = 0;
        var lByteCount = 0;
        while ( lByteCount < lMessageLength ) {
            lWordCount = (lByteCount-(lByteCount % 4))/4;
            lBytePosition = (lByteCount % 4)*8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount-(lByteCount % 4))/4;
        lBytePosition = (lByteCount % 4)*8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
        lWordArray[lNumberOfWords-2] = lMessageLength<<3;
        lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
        return lWordArray;
    };
 
    function WordToHex(lValue) {
        var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
        for (lCount = 0;lCount<=3;lCount++) {
            lByte = (lValue>>>(lCount*8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
        }
        return WordToHexValue;
    };
 
    function Utf8Encode(string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
 
        for (var n = 0; n < string.length; n++) {
 
            var c = string.charCodeAt(n);
 
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
 
        }
 
        return utftext;
    };
 
    var x=Array();
    var k,AA,BB,CC,DD,a,b,c,d;
    var S11=7, S12=12, S13=17, S14=22;
    var S21=5, S22=9 , S23=14, S24=20;
    var S31=4, S32=11, S33=16, S34=23;
    var S41=6, S42=10, S43=15, S44=21;
 
    string = Utf8Encode(string);
 
    x = ConvertToWordArray(string);
 
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
 
    for (k=0;k<x.length;k+=16) {
        AA=a; BB=b; CC=c; DD=d;
        a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
        d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
        c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
        b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
        a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
        d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
        c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
        b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
        a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
        d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
        c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
        b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
        a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
        d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
        c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
        b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
        a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
        d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
        c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
        b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
        a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
        d=GG(d,a,b,c,x[k+10],S22,0x2441453);
        c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
        b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
        a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
        d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
        c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
        b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
        a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
        d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
        c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
        b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
        a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
        d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
        c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
        b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
        a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
        d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
        c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
        b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
        a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
        d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
        c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
        b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
        a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
        d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
        c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
        b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
        a=II(a,b,c,d,x[k+0], S41,0xF4292244);
        d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
        c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
        b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
        a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
        d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
        c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
        b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
        a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
        d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
        c=II(c,d,a,b,x[k+6], S43,0xA3014314);
        b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
        a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
        d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
        c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
        b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
        a=AddUnsigned(a,AA);
        b=AddUnsigned(b,BB);
        c=AddUnsigned(c,CC);
        d=AddUnsigned(d,DD);
    }
 
    var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);
 
    return temp.toLowerCase();
};

Warp.HTTPDigest = function() {
    this.algorithm = "MD5";
};

Warp.HTTPDigest.prototype._parse = function(string, key, regexp) {
    var out = string.match((regexp?new RegExp(regexp):new RegExp(key+"=\\\"[^\\\"]+\\\"")));
    if(out && out[0] && out[0].length>0)
        return out[0].substring(key.length+2, out[0].length-1);
    return null;
};

Warp.HTTPDigest.prototype.getRealm = function(challenge) {
    return this._parse(challenge, "realm");
};

Warp.HTTPDigest.prototype.isStale = function(challenge) {
    var st = this._parse(challenge, "stale", "stale=\\\"(true|false)\\\"");
    if (st === "true")
        return true;
    var non = this._parse(challenge, "nonce");
    if(this.nonce != non)
        return true;    
    return false;
};

Warp.HTTPDigest.prototype.setCredentials = function(username, password) {
    if (!this.algorithm)
        return;
    var A1 = username + ":" + this.realm + ":" + password;
    this.username = username;
    if(this.algorithm=="MD5")
        this.authCredentials = Warp.MD5(A1);
    else
        this.authCredentials = A1;
};

Warp.HTTPDigest.prototype.setChallenge = function(challenge) {
    if(!challenge || challenge.search(/(\s)*Digest(\s)+/)!=0)
        return;
    var non = this._parse(challenge, "nonce");
    if(!non)
        return;
    if(this.nonce!=non) {
        this.nonce = non;
        this.nc = 1;
    }
    this.realm = this.getRealm(challenge);
    if(!this.realm)
        return;
    var token = "([^(\\x00-\\x1F\\x7F\\(\\)\\<\\>\\@\\,\\;\\:\\\\\"\\/\\[\\]\\?\\=\\{\\} \\t)])+";
    var qo = this._parse(challenge, "qop", "qop=\\\"(auth|auth-int|"+token+")\\\"");
    if(qo)
        this.qop = qo.split(/,/);
    this.opaque = this._parse(challenge, "opaque");
    var alg = this._parse(challenge, "algorithm", "algorithm=\\\"(MD5|MD5-sess|"+token+")\\\"");
    if(alg)
        this.algorithm = alg;
    this.cnonce = Warp.MD5("#"+Math.random()*new Date().getTime()).substring(24);
};

Warp.HTTPDigest.prototype.computeResponse = function(method, uri, data) {
    if(!method || !uri || !this.realm || !this.authCredentials || !this.algorithm || !this.nonce)
        return null;
    
    function contains(a, obj) {
        if(!a)
            return false;
        var i = a.length;
        while(i--)
            if(a[i] === obj)
                return true;
        return false;
    }

    var auth;
    if(contains(this.qop, "auth-int"))
        auth = "auth-int";
    else
        if(contains(this.qop, "auth"))
            auth = "auth";
    
    var HA1 = this.authCredentials;
    if(this.algorithm=="MD5-sess") {
        var A1 = HA1 + ":" + this.nonce + ":" + this.cnonce;
        HA1 = Warp.MD5(A1);
    }

    var A2 = method + ":" + uri;
    if(auth && auth=="auth-int")
        A2 += ":" + Warp.MD5(data);
        
    var HA2 = Warp.MD5(A2);

    var response = HA1 + ":" + this.nonce + ":";
    if(auth && (auth=="auth" || auth=="auth-int")) 
        response = Warp.MD5(response + this.nc.toString(16) + ":" + this.cnonce+ ":" + auth +":" + HA2);
    else
        response = Warp.MD5(response + HA2);
    
    return 'Digest username="'+this.username+
           '",realm="'+this.realm+
           '",nonce="'+this.nonce+
           '",uri="'+uri+
           (this.opaque?
           '",opaque="'+this.opaque:'')+
           ((auth && (auth=='auth' || auth=='auth-int'))?
           '",qop="'+auth+
           '",cnonce="'+this.cnonce+
           '",nc="'+(this.nc++).toString(16):'')+
           '",response="'+response+
           '"';
};

Warp.applicationManager = {};

Warp.applicationManager.notifyWarpReady = function() {
    try {Warp["Ω"]=Warp.rootResource;} catch(e){}; // if jQuery can, we can!
    _dispatchEvent({type:"beforeready"}); // Hook that libraries can use to extend/patch Warp
    _dispatchEvent({type:"ready"});
    
    // DEPRECATED: We should not use self namespace. Plus, this isn't a "true" event.
    if(typeof(self.onwarpready) == "function")
        self.onwarpready(); 
};

Warp.applicationManager.notifyError = function(evt, cb)
{
    _dispatchEvent(evt);
    
    if (!evt.handled)
        cb(); 
}

Warp.addEventListener("load", function() {
    console.log("going to check on Warp.application");
    
    // Verify input data (e.g., if Warp.application.guid is not a proper Warp URI, make it one.
    if (Warp.application.guid) 
        Warp.application.guid = new Warp.URI(Warp.application.guid).toString(); // normalise the guid
    
    // Second argument provides compatibility. Don't remove.
    Warp.warpManager.configureApplication(Warp.application, null);
    
    var ctrl=false, shift=false;
    self.onkeydown = function(e) {
        
        if (!e && self.event)
            e = self.event;
        
        if (!e)
        {
            Warp.warn("Received event onkeydown but couldn't find event object")
            return;
        }
        if (e.keyCode==17)
            ctrl=true;
        else if (e.keyCode==16)
            shift=true;
        else if (e.keyCode == 89 && shift && ctrl)
        {
            Warp.notifications.toggle();
            return false;
        }
    };
    self.onkeyup = function(e) {
        
        if (!e && self.event)
            e = self.event;
        
        if (!e)
        {
            Warp.warn("Received event onkeydown but couldn't find event object")
            return;
        }
        if (e.keyCode==17)
            ctrl=false;
        else if (e.keyCode==16)
            shift=false;
    };
    
    Warp.applicationManager.iframe = self.document && document.getElementById("warpiframe");
    //self.onresize();
});

Warp.applicationManager.setIframeSize = function(top, left, width, height)
{
    
    if (!Warp.applicationManager.iframe)
        return;
    
    if (width == 0 && height == 0)
    {
        Warp.applicationManager.iframe.style.display = "none";
        width = "100%";
        height = "100%";
        top = 0;
        left = 0;
        self.focus();
    }
    else
    {
        Warp.applicationManager.iframe.style.display = "block";
    
        if (width+100 >= Warp.applicationManager.windowSize.width)
            width = "100%";
        else
        {
            width += 2;
            left -= 2; // Adjust the left position to allow for extra pixels.
        }
        
        if (height+100 >= Warp.applicationManager.windowSize.height)
            height = "100%";
        else
            height += 2;
    
    }
    
    Warp.applicationManager.iframe.style.height = height; // Add 1 pixel on height to allow for selection boxes that will push it over.
    Warp.applicationManager.iframe.style.width = width;
    Warp.applicationManager.iframe.style.top = top;
    Warp.applicationManager.iframe.style.left = left;
};

/*
self.onresize = function()
{
    var width = 0;
    var height = 0;
    
    if (parseInt(navigator.appVersion)>3) {
        if (self.innerWidth && self.innerHeight) {
            width = self.innerWidth;
            height = self.innerHeight;
        }
        if (navigator.appName.indexOf("Microsoft")!=-1) {
            width = document.body.offsetWidth;
            height = document.body.offsetHeight;
        }
    }

    Warp.applicationManager.windowSize = {width:width, height:height};
    
    Warp.warpManager.setWindowSize(width, height);
}
*/






Warp.load({
    guid: "warp://warp:anon/fritzy",
    secret: "test"
},
{
    connect: function() {
        Warp.send({to: "warp://warp:netevents/public/user@server/some/room", data: {thingy: "Hello from Tutorial"}});
        console.log("Warp is connected!");
    },
    disconnect: function() {
        console.log("We have been disconnected");
    }
});
_checkLoaded();
Warp.on({
    message: function(m) {
        console.log("Received message with text: " + m.text); return true;
    },
    post: function(m) {
        console.log("POST data: " + m.text); return false;
    }
});

module.exports = {Warp: Warp, _checkLoaded: _checkLoaded};
/*
sub = Warp.subscribe({to: "warp://warp:netevents/public/user@server/some/"}, function(message) {
    console.log("GOT MESSAGE", message.object.thingy);
});
console.log(sub);
*/
