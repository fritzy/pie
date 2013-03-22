local function subscribe (to, to_chan, from, from_chan, msg)
    if from_chan == '' then
        redis.call('SADD', from..'::user.subscriptions', to_chan);
        redis.call('SADD', to..'::channel.subscriptions::'..to_chan, from);
    else
        redis.call('SADD', to..'::proxy_subscriptions::'..to_chan, from..'::'..from_chan);
    end
    return {false, cjson.encode({to=from..from_chan, from=to..to_chan, response={ns= "http://otalk.com/p/subscribe"}})};
end

local function normalizeChannel (channel, tailing_slash)
    if (string.sub(channel, 0, 1) ~= '/') then
        channel = '/'..channel;
    end
    if ((tailing_slash == nil or tailing_slash == false) and string.sub(channel, -1) == '/') then
        return string.sub(channel, 0, -2);
    end
    if (tailing_slash == true and string.sub(channel, -1) ~= '/') then
        return channel..'/';
    end
    return channel;
end

local to, to_chan, from, from_chan, msg = unpack(ARGV);
msg = cjson.decode(msg);
to_chan = normalizeChannel(to_chan);
from_chan = normalizeChannel(from_chan);

if string.find(to_chan, '*') ~= nil then
    local pat = string.gsub(to_chan, '*/', "[%%w ]+/");
    pat = string.gsub(pat, '*', "[%%w ]+");
   --TODO loop through all of the user's channels
   redis.call('HSET', to..'::to_patterns', to_chan, from..from_chan);
   local found = {};
   for idx, chan in pairs(redis.call('SMEMBERS', to..'::'..'channels')) do
       local chan2 = nomalizeChannel(chan, true);
       if string.find(chan2, pat) ~= nil then
           subscribe(to, chan, from, from_chan, msg);
           table.insert(found, chan);
       end
   end
end

if redis.call('SISMEMBER', to..'::'..'channels', to_chan) == 0 then
    return {true, cjson.encode({to=from..from_chan, from=to..to_chan, response={ns= "http://otalk.com/p/subscribe", error={text="Not Found"}}})};
else
    return subscribe(to, to_chan, from, from_chan, msg);
end

   

