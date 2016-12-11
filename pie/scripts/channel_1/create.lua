local to, to_chan, from, from_chan, msg = unpack(ARGV);
msg = cjson.decode(msg);

if redis.call('SISMEMBER', to..'::'..'channels', to_chan) == 0 then
    redis.call('SADD', to..'::'..'channels', to_chan);
else
    return {"Already exists", cjson.encode({to=from..from_chan, from=to..to_chan, response={ns="http://otalk.com/p/create", error={text="Channel already exists."}}})};
end

for key, value in pairs(msg.query.config) do
    redis.call('HSET', to..'::'..'channel.config::'..to_chan, key, value);
end

--TODO publish to parent
--TODO bind to parent

return {false, cjson.encode({from=to..to_chan, to=from..from_chan, response={ns="http://otalk.com/p/create"}})};
