local function subscribe (to, to_chan, from, from_chan, msg)
    if from_chan == '' then
        redis.call('SADD', from..'::user.subscriptions', to_chan);
        redis.call('SADD', to..'::channel.subscriptions::'..to_chan, from);
    else
        redis.call('SADD', to..'::proxy_subscriptions::'..to_chan, from..'::'..from_chan);
    end
    return {false, cjson.encode({to=from..from_chan, from=to..to_chan, response={ns= "http://otalk.com/p/subscribe"}})};
end

local to, to_chan, from, from_chan, msg = unpack(ARGV);
msg = cjson.decode(msg);

if string.find(to_chan, '*') ~= nil then
   local pat = string.gsub(to_chan, '*/', "[%%w ]+/");
   pat = string.gsub(pat, '*', "[%%w ]+");
   --TODO loop through all of the user's channels

else if redis.call('SISMEMBER', to..'::'..'channels', to_chan) == 0 then
    return {true, cjson.encode({to=from..from_chan, from=to..to_chan, response={ns= "http://otalk.com/p/subscribe", error={text="Not Found"}}})};
else
    return subscribe(to, to_chan, from, from_chan, msg);
end

   

