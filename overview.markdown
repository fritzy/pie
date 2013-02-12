# oTalk Protocol Spec

![](https://dl.dropbox.com/u/10292774/otalk.png)

#Overview
oTalk is a federated messaging, publishing, and eventing protocol written for the modern Internet and with the web platform in mind. It is based on the lessons and knowledge of, and designed to federate with, XMPP.
Since all features in XMPP can be distilled into a publish/store-subscribe pattern, oTalk establishes a flexible publish-subscribe system based on strong identity, and implements features like IM, roster, presence, service-discovery, and multi-user chat on conventions for creating, configuring, and using publish-subscribe channels.

# Identity URI
An identity uri consists of a user node, a server node, a channel path, and query parameters.
The only required node in an identity URI is the server node.

An example URI might look like:

    otalk:juliet@capulet.fam/chats/aabbcceeff?key=topic

Query parameters include key, config, and msgid.

# Encoding and Transports

Servers should support connections over websocket, REST, and STOMP.
UTF-8 encoded JSON.
Binary blobs should encoded as data URIs.

**Any of the examples here may be sent as HTTP POSTS or as Websocket Messages**

## Authentication

* SASL (PLAIN, SCRAM-SHA1, OAUTH)
* Session Binding

#Stanzas

All stanzas consist of an outer layer for routing.
Fields:

* to (required, identity URI)
* from (required, identity URI)

In these fields, the idenity URI prefix "otalk:" is assumed.

The "from" is *always* rewritten by the server to enfoce the base (user and server nodes) of the URI. If a from is not specified, then one is written as [user]@[server]/sess/[bound session]
If the server is rebroadcasting a message 

# Channels

Publish-Subscribe Channels, or just channels as we'll refer to them from here on, are the core of the oTalk protocol. All interactions between endpoints happen in channels. As such, channels need to be rather flexible.

Channels consist of the following components:

* message history
* keys
* sub-channels
* configuration

## Channel Patterns

The channel portion of the identity URI may include wildcards to indicate more than one possible channel. \*/ indicates only one level of wildcard channel, while \* without a trailing slash indicates a recursive reference.

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
To filter messages by namespace, use ?ns=...
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

    {"to": "romeo@montague.com/sess/Window_aabb", "from": "romeo@montague.com/channel/subchannel", "id": "getmsg1",
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
You may only subscribe to certain channel parts with ?messages ?keys ?channels options in the to URI.

OUT

    {to: romeo@montague.com/channel/subchannel, id: sub1,
        query: {
            ns: http://otalk.com/p/subscribe,
            config: {
            }
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

## Inviting to a Channel

## Getting Subscriptions

To get the subscriptions (at least the ones you have access to) from a channel see  "Getting Channel Contents"
To see all of your own subscriptions, get the messages from your own /subscriptions channel.
To see all of your subscriptions at a user@server node, query their /subscriptions channel for messages. You probably only have access to see your own subscriptions in there.

## ACL

    channel_acl:

        p: publish,
        k: set/del own keys
        K: set/del all keys
        d: delete/revise own messages
        D: delete all messages
        c: read config
        C: set config
        m: moderate subscriptions
        M: moderate permissions
        s: subscribe and read messages and sub channel links
        S: create sub channels (delete own)
        L: delete sub channels
        o: able to give permissions
        O: able to give, remove op
        a: owner-like admin

    key_acl(optional):
        r,w,d

## Setting Permissions

# Established OAuth Token + STOMP Example

If you already have an OAuth token, that token should be bound to your ID URI including the session binding. For example

    otalk: romeo@montague.com/sess/Balcony

As such, you MUST include this OAuth token with any POST or Websocket connection to authenticate and indicate your id and session that the post and websocket refer to.

Connecting to a STOMP endpoint with an OAuth token in the header of the websocket connection means that you may interact with any channel in your current session over STOMP.
Subscribing and unsubscribing in STOMP itself changes your subscription mask. You may not subscribe to channels that you don't have formal OTalk subscriptions with within STOMP itself, but you may establish those out-of-band.

# Well Known Channels

# / The Root Channel
# /sess/ The Session Channel

Upon session binding, if the session is new, the /sess/[binding name] channel is created.
This creates a space for channels that are automatically destroyed when the session is closed.
It is useful for the session's specific features, presence, and inbox.

# /presence/ The Presence Channel
# /roster/ The Roster Channel  
# /discovery/ The Discovery Channel (wait, what?)
# /inbox/ The Inbox Channel
# The /requests/ Channel


### Example Channel Configuration
    
    config: {
        name: "The Alleyway",
        description: "",
        type: "http://otalk.com/p/muc",
        discoverable: true, // now it's public
        msg_count: 50,
        event_count: 50,
        key_whitelist: [],
        subscriber_channel: true, // gives each user a subchannel to publish to that all participants can subscribe to
        all_acl: .., // acl flag string
        subscriber_acl: ..., // subscriber flag string.
    }

### Example Subscription Configuration

    {
        ns: "http://otalk.com/p/subscription",
        from_uri: "otalk:romeo@montague.com/sess/*/presence",
        to_uri: "otalk:juliet@capulet.com/roster/Romeo",
        mute: false, //default: false
        mute_on_offline: false, //default: false
        unsubscribe_on_offline: false,
        delivery: full, hash, notify // default: full
        subscription_channel: [some name] // required for channels with config of subscription_channel: true
    }

# Discovery

Identities have a /channels directory in their root. They also have a /features channel in their session root (user@server/sess/\*/features).
All channels marked as discoverable are listed in the /channels channel by the server.

OUT
    
    {"to": "romeo@montague.com/discovery?ns=http://otalk.com/p/geo", "id": "getgeo1",
        "get": {
            "offset": 0,
            "limit": 50
        }
    }

IN

    {"to": "romeo@montague.com/sess/Window_aabb", "from": "romeo@montague.com/discovery", "id": "getgeo1",
        "result": {
            "offset": 0,
            "limit": 50,
            "total": 2,
            "results": [
                {
                    msg: {
                        ns: http://otalk.com/p/geo#disco,
                        channel: romeo@montague.com/geos/chopper,
                        title: "Dah Choppah",
                        description: "Get in dah choppah!"
                    },
                    channel: "romeo@montague.com/discovery",
                    time:...,
                    id: asdfasdf,
                    from: romeo@montague.com
                },
                {
                    msg: {
                        ns: http://otalk.com/p/geo#disco,
                        channel: romeo@montague.com/geos/cell,
                        title: "Romeo's Celleo",
                        description: "I'm probably where my phone is"
                    },
                    channel: "romeo@montague.com/discovery",
                    time:...,
                    id: asdfasdf2,
                    from: romeo@montague.com
                },
            ]
        }
    }

# Session Subscription Mask

To enable subscription event flow on your current session, send a query to your session manager with a list of subscriptions that you'd like to be active for your session.

    {"to": "montague.com/sessions/aabbccddeeff", "id": "submask1",
        "query": {
            "ns": "http://otalk.com/p/subscription-mask",
            "subscriptions": ["s1", "s2", "s10"]
        }
    }
    
    {"from": "montague.com/sessions/aabbccddeeff", "id": "submask1",
        "response": {
            "ns": "http://otalk.com/p/subscription-mask",
            "subscriptions": ["s1", "s2", "s10"]
        }
    }

To change your mask, simply resend this request.


# How to set up Presence and Roster

Your presence should be in a channel that is configured to keep one message containing the http://otalk.com/p/presence namespace.

    msg: {
        ns: http://otalk.com/p/presence,
        show: available, away, na, xa, dnd, unavailable // default is available
        status: "Some text about my presence" 
    }

By default, you SHOULD publish to your /sess/[current-session]/presence after login.
You may have other presence channels that you could use for subscriptions (or other purposes) that are not tied to a session.

To subscribe to someone else's presence, there is a convention called a roster.

Subscribe to the user's presence [user]@[server]/sess/\*/presence a subchannel in your roster.

    {from: romeo@montague.com/roster/Juliet, to: juliet@capulet.com/sess/*/presence, id: sub1,
        query: {
            ns: http://otalk.com/p/subscribe,
            config: {
            }
        }
    }

You may also want to set a Portable contact to the key "contact\_details".
    
    {to: romeo@montague.com/roster/Juliet,
        msg: {
            ns: http://portable-contact.org/p/entry
            key: "contact_details",
            entry: {
                ...
            }
        }
    }
    

# How to have an ad-hoc Chat

You can send messages to a user's /inbox or /sess/\*/inbox (if you happen to know one of their current sessions). Chat messages should be in the namespace http://otalk.com/p/chat.

    msg: {
        ns: http://otalk.com/p/chat
        subject: //optional text 255 or less chars
        body: // message body
        lang: // optional message language
    }

# How to have a formal Chat or other Session

You can create a channel and invite a user.

    {from: ..., to: .../newchannel,
        query: {
            ns: http://otalk/p/invite
            channel: .../somechat
            permission: ...
        }
    }

Which will then send a message to their requests from the channel.
    
    {from: ..., to: .../newchannel,
        msg: {
            ns: http://otalk/p/invite
            channel: .../somechat
            permission: ...
        }
    }

Invites create a subscription entry that is not yet enabled with +s (subscribable).


# How to have a multi-user Chat or other Session

A typical multi-user chat channel might have this configuration:

OUT

    {to: romeo@montague.com/alleyway, id: createroom1,
        query: {
            ns: http://otalk.com/p/create,
            channel: otalk:user@server/channel/subchannel
            config: {
                name: "The Alleyway",
                description: "",
                type: "http://otalk.com/p/muc",
                discoverable: true, // now it's public
                msg_count: 50,
                event_count: 50,
                key_whitelist: [],
                subscriber_channel: true, // gives each user a subchannel to publish to that all participants can subscribe to
                all_acl: .., // everyone's default acl flag string
                subscriber_acl: ..., // subscriber acl flag string.
            }
        }
    }

IN

    {to, from, id
        response: {
        }
    }
    

Then a user could subscribe with:

OUT

    {to: romeo@montague.com/alleyway/*, id: sub1,
        query: {
            ns: http://otalk.com/p/subscribe,
            config: {
                to_uri: "otalk:juliet@capulet.com/",
                mute_on_offline: true, //default: false
                subscription_channel: "Juliet" //short name of subchannel to publish messages and room presence to (as well as any other namespace)
            }
        }
    }

IN

    {from: romeo@montague.com/alleyway, id: sub1,
        response: {
            ns: http://otalk.com/p/subscribe,
            result: ok
        }
    }

Now Juliet will start getting messages from the alleyway, and all of the users, including the subfeeds that she has permission to.

Juliet can publish, create channels, etc in /alleyway/Juliet

She SHOULD publish chat messages there, and should establish a alleyway/Juliet/Presence subchannel.

# Example Wire


Connect and authenticate.

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


Bind to a session. If the session already exists, it'll create a new one.

OUT

    {"from" "aabbccddee", "to": "montague.com/stream/aabbccddee", "id": "bind1",
        "query": {
            "ns": "http://otalk.com/p/bind",
            "bind": "romeo@montague.com/sess/Balcony"
        }
    }

IN

    {"from": "montague.com/stream/aabbccddee", "to": "aabbccddee", "id": "bind1",
        "response": {
            "ns": "http://otalk.com/p/bind",
            "bind": "romeo@montague.com/sess/Balcony"
            "mask": [],
            "new": true,
        }
    }
    
Set your presence.

OUT
    
    {"to": "romeo@montague.com/sess/Balcony/presence",
        msg: {
            ns: http://otalk.com/p/presence,
            show: available, away, na, xa, dnd, unavailable // default is available
            status: "Some text about my presence" 
        }
    }

Check your subscriptions.

OUT
    
    {"to": "romeo@montague.com/subscriptions", "id": "getsub1",
        "get": {
            "offset": 0,
            "limit": 50
        }
    }

IN

    {"from": "romeo@montague.com/subscriptions", "id": "getsub1",
        "result": {
            "offset": 0,
            "limit": 50,
            "total": 22,
            "results": [
                {
                    msg: {
                        ns: http://otalk.com/p/subscription,
                        channel: "romeo@montague.com/roster/*",
                    },
                    channel: "romeo@montague.com/subscriptions",
                    time: ...,
                    id: sub1,
                },
                {
                    msg: {
                        ns: http://otalk.com/p/subscription,
                        ...
                    },
                    channel: "romeo@montague.com/subscriptions",
                    time: ...,
                    id: sub2,
                },
                ...
            ]
        }
    }
    

Set the subscriptions you want active for this session.

OUT
   
    
    {"to": "montague.com", "id": "submask1",
        "query": {
            "ns": "http://otalk.com/p/subscription-mask",
            "mask": ["s1", "s2", "s10"]
        }
    }

IN
    
    {"from": "montague.com", "id": "submask1",
        "response": {
            "ns": "http://otalk.com/p/subscription-mask",
            "mask": ["s1", "s2", "s10"]
        }
    }

Send a message to a buddy.

OUT

    {"to": "juliet@capulet.com/inbox",
        "msg": {
            "ns": "http://otalk.com/p/chat",
            "body": "Are you there?"
        }
    }

Looks like Juliet got online:

IN: 

    {from: "romeo@montague.com/roster/Juliet/Balcony",
        msg: {
            ns: http://otalk.com/p/presence,
            show: dnd
            status: "Having a secret meeting" 
        }
        event: {
            subid: "sub1"
        }
    }


