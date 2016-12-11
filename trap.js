var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var WebSocket    = require('ws');


var Trap = {useBinary: true};
var self = {};

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
    Trap.Transports.WebSocket.prototype.supportsBinary = true;
	//try {  = typeof new WebSocket("ws://127.0.0.1").binaryType === "string"; } catch(e){}


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

/*
if (Trap.useBinary)
	Trap.Transports.HTTP.prototype.supportsBinary = typeof new XMLHttpRequest().responseType === 'string';
    */

Trap.Transports.HTTP.prototype.supportsBinary = false;



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

module.exports = Trap;
