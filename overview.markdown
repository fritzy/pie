# oTalk Protocol Spec

#Overview
oTalk is a federated messaging, publishing, and eventing protocol written for the modern Internet and with the web platform in mind. It is based on the lessons and knowledge of, and designed to federate with, XMPP.
Since most features in XMPP can be distilled into a publish/store-subscribe pattern, oTalk establishes a flexible publish-subscribe system based on strong identity, and implements features like IM, roster, presence, service-discovery, and multi-user chat on conventions for creating, configuring, and using publish-subscribe channels.

# Identity URI
An identity uri consists of a user node, a server node, a channel path, and query parameters.
The only required node in an identity URI is the server node.

An example URI might look like:

    otalk:juliet@capulet.fam/chats/aabbcceeff?key=topic

Query parameters include key, config, and msgid.

# Establishing a Connection (Client to Server)

Servers should support connections over websocket or TCP socket.
UTF-8 encoded JSON stanzas seperated by null (\x00) characters.
A TCP socket connection may negotiate gzip steaming and TLS.

[in progress]

## Authentication

* SASL (PLAIN, SCRAM-SHA1, OAUTH)
* Session Binding

#Stanzas
All stanzas consist of an outer layer for routing.
Fields:

* to (required, identity URI)
* from (required, identity URI)

In these fields, the idenity URI prefix "otalk:" is assumed.

The "from" is *always* rewritten by the server when sending a message as the [user]@[server]/sess/[connected session]
If the server is rebroadcasting a message 


# Channels
Publish-Subscribe Channels, or just channels as we'll refer to them from here on, are the core of the oTalk protocol. All interactions between endpoints happen in channels. As such, channels need to be rather flexible.

Channels consist of the following components:

* message history
* keys
* sub-channels
* configuration

## Channel Patterns

## Channel Events

## Creating a Channel

OUT

    {to, from, id
        query: {
            ns: http://otalk.com/p/create,
            channel: otalk:user@server/channel/subchannel
            config: {
            }
        }
    }

IN

    {to, from, id
        response: {
        }
    }

OR

    {to, from, id
        error: {
        }
    }

Event for users of the parent channel:

    {to, from: user@server/channel, id,
        msg: {
            ns: http://otalk.com/p/event
            channel: otalk:user@server/channel/subchannel
            event: {
                ns: http://otalk.com/p/create
            }
        }
    }

## Deleting a Channel

OUT
    {to, from, id
        query: {
            ns: http://otalk.com/p/delete,
            channel: otalk:user@server/channel/subchannel
            config: {
            }
        }
    }

IN

    {to, from, id
        response: {
        }
    }

OR

    {to, from, id
        error: {
        }
    }

Event for users of the parent channel:

    {to, from: user@server/channel, id,
        msg: {
            ns: http://otalk.com/p/event
            channel: otalk:user@server/channel/subchannel
            event: {
                ns: http://otalk.com/p/delete
            }
        }
    }

## Getting Channel Contents

Send a "get" to the channel you'd like to get messages from. You may you use \* wildcards.
You may also specify ?keys ?channels ?messages, or a combination.
You may also get subscriptions, if you have permission, with ?subscriptions
You may also specify ?msgid= and ?key= to get a specific message.
You may filter by a specific message namespace with ?ns=
Each result will contain the fields "from", "time", "msg", "channel", and "id" and may contain "key" and "claim" sections

You can specify an offset, limit, since\_id, since\_time, until\_id, until\_time.

OUT
    
    {"to": "romeo@montague.com/channel/subchannel", "id": "getmsg1",
        "get": {
            "offset": 0,
            "limit": 50
        }
    }

IN

    {"to": "romeo@montague.com/sess/Window_aabb", "from": "romeo@montague.com/channel/subchannel", "id": "getsub1",
        "result": {
            "offset": 0,
            "limit": 50,
            "total": 2,
            "results": [
                {
                    msg: {
                        ns: http://otalk.com/p/chat,
                        body: "How's it going?"
                        lang: "En"
                    },
                    channel: "romeo@montague.com/channel/subchannel",
                    time:...,
                    id: asdfasdf,
                    from: juliet@capulet.com/sess/weeee
                },
                {
                    msg: {
                        ns: http://otalk.com/p/chat,
                        body: "Oh, not too shabby"
                        lang: "En"
                    },
                    channel: "romeo@montague.com/channel/subchannel",
                    time:....,
                    id: asddsff,
                    from: romeo@montague.com/sess/Window_aabb
                }
            ]
        }
    }


## Subscribing to a Channel

You can subscribe to a channel, or a pattern of channels using \* wildcards.
You may recieve an error, a result, or a pending notification.
If you specify a from, you are linking the from channel with the to channel. Meaning all messages will get sent to the from channel.
You may specify feature tags, which filters any wildcard channel subscriptions.

OUT

    {to: romeo@montague.com/channel/subchannel, id: sub1,
        query: {
            ns: http://otalk.com/p/subscribe,
            feature_tags: []
        }
    }

IN

    {from: romeo@montague.com/channel/subchannel, id: sub1,
        response: {
            ns: http://otalk.com/p/subscribe,
            result: ok
        }
    }

OR
    
    {from: romeo@montague.com/channel/subchannel, id: sub1,
        response: {
            ns: http://otalk.com/p/subscribe,
            result: error
            error: {
                code: xxx,
                text: error text
            }
        }
    }

OR
   
    {from: romeo@montague.com/channel/subchannel, id: sub1,
        response: {
            ns: http://otalk.com/p/subscribe,
            result: pending
            pending: {
                channel: romeo@montague.com/requests
                id: sdfjs
            }
        }
    }

See the "Job and Queues" Section.

NOTE: when a subscription is successfully updated, your and the other endpoint's /subscriptions/ channels will be updated by the server, and you may get events from them.

## Unsubscribing a Channel

OUT

    {to: romeo@montague.com/channel/subchannel, id: sub1,
        query: {
            ns: http://otalk.com/p/unsubscribe,
        }
    }

IN

    {from: romeo@montague.com/channel/subchannel, id: sub1,
        response: {
            ns: http://otalk.com/p/unsubscribe,
            result: ok
        }
    }

## Getting Subscriptions

To get the subscriptions (at least the ones you have access to) from a channel see  "Getting Channel Contents"
To see all of your own subscriptions, get the messages from your own /subscriptions channel.
To see all of your subscriptions at a user@server node, query their /subscriptions channel for messages. You probably only have access to see your own subscriptions in there.

## Jobs, Claims, and Queues
### Keys
### Caching and Revisions

# / The Root Channel
# /sess/ The Session Channel
# /presence/ The Presence Channel
# /roster/ The Roster Channel  
# /discovery/ The Discovery Channel (wait, what?)
# /inbox/ The Inbox Channel
# The /requests/ Channel


### Example Channel Configuration

    channel_config: {
        subscriptions: {
            refresh_time: 0, //0 is forever
            presence: true, // you have to authorize the channel to have your presence as a sub_channel
            transient: false, //remove subscription if they go offline.. presence must be true for this to work
            allow_read: true, (allow other users to see the presence sub feeds are there)
            allow_subscribe: true (allow others to subscribe to the presence subfeed)
            presence_extensions: all, none, whitelist
            allow_override: true, //have user send presence directly, rather than subscription to presence
        },
        history: {
            persist: "mem", // mem, hdd, none
            count: 0,
            expire: "oldest", //oldest, newest, none (send errors if more than count)
            include: [msg, delete, claim, unclaim] // msg assumed
        },
        keys: {
            count: 0,
            sortable: false,
            keyspace: [] // allowed keys, empty or unspecified is any
            enabled: true
        },
        revision: {
            count: 40,
            time: 3600,
            diff: true,
            playback: true
        },
        queue: {
            finished_enabled: true,
            claim_enabled: true,
            delete_on_finish: true,
            claim_timeout,
            cancel_limit,
            failed_channel,
        },
        feature_tags: ["list", "of", "feature", "namespaces"],
        owner: user@server/channel/path,
        echo: false,
        channel_whitelist: []
        channel_blacklist: []
        channel_tempban: [{user: '', time: 0},]
        update: checksum/full/notify
    }

### Example Subscription Configuration

    {
        from_uri: "otalk:romeo@montague.com/sess/*/presence/*",
        to_uri: "otalk:juliet@capulet.com/roster/Romeo",
        limit_tags: ["list", "of", "acceptable", "feature", "tags"],
        sd_filter: true,
        mute: false,
        mute_on_offline: false,
        //this is a recursive subscription, but is limited to channels that include one of the feature tags listed
        //a server may update this list based on the service discovery profile
    }

# How to set up Presence and Roster

# How to have an ad-hoc Chat

# How to have a formal Chat or other Session

# How to have a multi-user Chat or other Session


# Example Wire


IN

    {"from": "montague.com/stream/aabbccddee", "version": "alpha1", "to": "aabbccddee",
        "msg": {
            "ns": "http://otalk.com/p/session-capabilities",
            "session_capabilities": [
                "SASL-PLAIN", "SASL-OAUTH"
            ]
        }
    }

OUT

    {"to": "montague.com/stream/aabbccddee", "id": "auth1",
        "query": {
            "ns": "SASL",
            "sasl-mech": "SASL-PLAIN", "response": "base64 thingy"
        }
    }

IN

    {"from": "montague.com/stream/aabbccddee", "id": "auth1",
        "response": {
            "ns": "SASL",
            "outcome": "ok"
        }
    }

IN

    {"from": "montague.com/stream/aabbccddee", "version": "alpha1", "to": "aabbccddee",
        "msg": {
            "ns": "http://otalk.com/p/session-capabilities",
            "session_capabilities": ["bind", "session-restore"]
        }
    }

OUT

    {"from" "aabbccddee", "to": "montague.com/stream/aabbccddee", "id": "bind1",
        "query": {
            "ns": "http://otalk.com/p/bind",
            "bind": "romeo@montague.com/sess/Window"
        }
    }

IN

    {"from": "montague.com/stream/aabbccddee", "to": "aabbccddee", "id": "bind1",
        "response": {
            "bind": "romeo@montague.com/sess/Window_aabb"
        }
    }

OUT
    
    {"to": "romeo@montague.com/subscriptions", "id": "getsub1",
        "get": {
            "offset": 0,
            "limit": 50
        }
    }

IN

    {"to": "romeo@montague.com/sess/Window_aabb", "from": "romeo@montague.com/subscriptions", "id": "getsub1",
        "result": {
            "offset": 0,
            "limit": 50,
            "total": 2,
            "results": [
                {
                    "id": "s0", "from": "romeo@montague.com/roster/*", "to": "romeo@montague.com", "last_id": "ablakjsdf", "last_update": "TZ", "status": "active"
                },
                {
                    "id": "s1", "from": "romeo@montague.com/inbox", "to": "romeo@montague.com", "last_id": "ablakjsdf", "last_update": "TZ", "status": "active"
                }
            ]
        }
    }
