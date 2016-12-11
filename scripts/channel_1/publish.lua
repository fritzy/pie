local function publish(to, to_chan, from, from_chan, msg, id, time)
    redis.log(redis.LOG_WARNING, 'publishing to '..to..to_chan);
    if redis.call('SISMEMBER', to..'::'..'channels', to_chan) == 0 then
        return {"Channel does not exist", {}};
    end

    --persist message
    local max = redis.call('HGET', to..'::channel.config::'..to_chan, 'msg_count');
    if max then
        local delete_ids = redis.call('ZRANGE', to..'::channel.msg_ids::'..to_chan, 0, '-'..max);
        if #delete_ids ~= 0 then
            redis.call('ZREM', to..'::channel.msg_ids::'..to_chan, unpack(delete_ids));
            redis.call('HDEL', to..'::channel.msg_items::'..to_chan, unpack(delete_ids));
            redis.call('HDEL', to..'::channel.msg_meta::'..to_chan, unpack(delete_ids));
            for idx, id in ipairs(delete_ids) do
                --TODO publish deletions
            end
        end
    end
    local isnew = redis.call('ZADD', to..'::channel.msg_ids::'..to_chan, time, id) == 1;
    redis.call('HSET', to..'::channel.msg_items::'..to_chan, id, cjson.encode(msg.msg));
    local meta = {from = from..from_chan, time = time};
    redis.call('HSET', to..'::channel.msg_meta::'..to_chan, id, cjson.encode(meta));

    --pretty up the msg
    msg.from = to..to_chan;
    msg.to = nil;
    msg.event = {ns = "http://otalk.com/p/publish", from = from..from_chan, time = time};

    redis.call('PUBLISH', to..to_chan, cjson.encode(msg));
    local subchans = redis.call('SMEMBERS', to..'::proxy.subscriptions::'..to_chan);
    for idx, chan in ipairs(subchans) do
        local split = strfind(chan, '::');
        local subto = strsub(chan, 0, split);
        local subchan = strsub(chan, split + 2);
        publish(subto, subchan, to, to_chan, msg, id);
    end
    return {false, 'published'};
end

local to, to_chan, from, from_chan, msg, id, time = unpack(ARGV);
msg = cjson.decode(msg);

local result = publish(to, to_chan, from, from_chan, msg, id, time);
return {false, cjson.encode({to=from..from_chan, from=to..to_chan, response={ns= "http://otalk.com/p/publish"}})};
