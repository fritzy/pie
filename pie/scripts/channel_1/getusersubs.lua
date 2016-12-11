local to, to_chan, from, from_chan, msg = unpack(ARGV);
msg = cjson.decode(msg);

local subs = redis.call('SMEMBERS', from..'::user.subscriptions');
return {false, subs};
