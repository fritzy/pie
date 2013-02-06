# oTalk Protocol Spec

##Overview
oTalk is a federated messaging, publishing, and eventing protocol written for the modern Internet and with the web platform in mind. It is based on the lessons and knowledge of, and designed to federate with, XMPP.
Since most features in XMPP can be distilled into a publish/store-subscribe pattern, oTalk establishes a flexible publish-subscribe system based on strong identity, and implements features like IM, roster, presence, service-discovery, and multi-user chat on conventions for creating, configuring, and using publish-subscribe channels.

## Identity URI
An identity uri consists of a user node, a server node, a channel path, and query parameters.
The only required node in an identity URI is the server node.

An example URI might look like:

    otalk:juliet@capulet.fam/chats/aabbcceeff?key=topic

Query parameters include key, config, and msgid.

## Establishing a Connection (Client to Server)

Servers should support connections over websocket or TCP socket.
UTF-8 encoded JSON stanzas seperated by null (\x00) characters.
A TCP socket connection may negotiate gzip steaming and TLS.

[in progress]

### Authentication

* SASL
* Session Binding

## Initial Channels

/
/roster/  
/sess/  
/presence/  
/discovery/  
/inbox
/incoming-request
/outgoing-request

In addition, each connected session will be bound to a channel under /sess/ with each containing the latter channels as well.

### / The Root Channel
### /sess/ The Session Channel
### /presence/ The Presence Channel
### /discovery/ The Discovery Channel (wait, what?)
### /inbox/ The Inbox Channel

## Routing

## Stanzas
All stanzas consist of an outer layer for routing.
Fields:

* to (required, identity URI)
* from (required, identity URI)

In these fields, the idenity URI prefix "otalk:" is assumed.

The "from" is *always* rewritten by the server when sending a message as the [user]@[server]/sess/[connected session]
If the server is rebroadcasting a message 


## Channels
Publish-Subscribe Channels, or just channels as we'll refer to them from here on, are the core of the oTalk protocol. All interactions between endpoints happen in channels. As such, channels need to be rather flexible.

Channels consist of the following components:

* message history
* keys
* sub-channels
* configuration

### Subscriptions
### Message History
### Keys
### Caching and Revisions
### Jobs
#### User Interaction with Jobs

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
            ack: false,
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
        jobs: {
            enabled: true,
            claim_timeout,
            cancel_limit,
            failed_channel,
        },
        owner: user@server/channel/path,
        echo: false,
        channel_whitelist: []
        channel_blacklist: []
        channel_tempban: [{user: '', time: 0},]
    }


# Example Wire


<--

    {"from": "montague.com", "version": "alpha1", "to": "aabbccddee",
        "session_capabilities": [
            "SASL-PLAIN", "SASL-OAUTH"
        ]
    }

-->

    {"from": "aabbccddee", "to": "montague.com", "id": "auth1"
        "SASL": {"sasl-mech": "SASL-PLAIN", "response": "base64 thingy"}
    }

<--

    {"from": "montague.com", "to": "montague.com", "id", "auth1",
        "SASL": {"outcome": "ok"}
    }

<--

    {"from": "montague.com", "version": "alpha1", "to": "aabbccddee",
        "session_capabilities": ["bind", "session-restore"]
        }
    }

-->

    {"from" "aabbccddee", "to": "montague.com",
        "bind": {"oid": "romeo@montague.com/sess/Window"}
    }

<--

    {"from": "montague.com", "to": "aabbccddee",
        "bind": {"oid": "romeo@montague.com/sess/Window_aabb"},
        "outcome": "ok"
    }
