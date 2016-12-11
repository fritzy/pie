//©2013 Ericsson AB. All Rights Reserved.

(function() {

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

function _load() {
	
	if (undef(Warp.application))
		Warp.application = {};
	if (undef(Warp.application.name))
		Warp.application.name = document.location.href;
	if (undef(Warp.config.slam))
		Warp.config.slam = false;
	if (undef(Warp.config.debug))
		Warp.config.debug = false;
	if (undef(Warp.config.workers))
		Warp.config.workers = true;
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
	if(!window.postMessage)
		Warp.config.slam = true;
	
	if(!window.Worker || !window.SharedWorker)
		Warp.config.workers = false;
	
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
}

var _eventlistenersMap = {};

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
    
    if(!!listeners)
    	for (var i = 0; i < listeners.length; i++)
    		listeners[i](evt);
    
    // Support Warp.onXXX handlers natively
    var f = Warp["on"+evt.type];
    if (f && typeof(f) == "function") f(evt);
    
    return true;
};

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
 *            | ArrayBuffer} serialized The serialized representation of a
 *            message.
 * @type Warp.Message
 * @return {Warp.Message} The deserialized representation of <i>serialized</i>
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
 * 	to : &quot;...&quot;,
 * 	from : &quot;...&quot;,
 * 	method : &quot;...&quot;
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
 * @param {Integer} [options.timeout=30000]
 *            [NYI] The number of milliseconds to wait before timing out
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
 * 	to : &quot;warp://echo:service/echo&quot;,
 * 	data : &quot;hello&quot;
 * }, function(m) {
 * 	console.log(m.text);
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
 * @returns {Warp.Resource} The resource at the given path
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
 * 	message : function(m) {
 * 		console.log(m.text);
 * 	},
 * 	post : function(m) {
 * 		console.warn(m.text);
 * 	}
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
	self.onresize();
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

})();