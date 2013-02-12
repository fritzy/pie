# oTalk Protocol Spec

![](data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAAA8AAD/4QNvaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjMtYzAxMSA2Ni4xNDU2NjEsIDIwMTIvMDIvMDYtMTQ6NTY6MjcgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6QjA5RjM4QTFFQzIyNjgxMTg3MUZEQUVFRTk3MkNEQjgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MEY0RDZBODQ2RDcxMTFFMkE1RkQ5NzFGMTE5RERFQTUiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MEY0RDZBODM2RDcxMTFFMkE1RkQ5NzFGMTE5RERFQTUiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNCBNYWNpbnRvc2giPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowQzQ1OTcyRTE1MjQ2ODExODcxRkRBRUVFOTcyQ0RCOCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpCMDlGMzhBMUVDMjI2ODExODcxRkRBRUVFOTcyQ0RCOCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6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)

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

The channel portion of the identity URI may include wildcards to indicate more than one possible channel. \*\/ indicates only one level of wildcard channel, while \* without a trailing slash indicates a recursive reference.

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


