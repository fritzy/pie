#pie Personal Identity & Eventing

pie is a service for publishing, sharing, gathering, and informing data based on your identity.

pie aims to invent as little as possible, instead relying on technologies that already exist to create something powerful yet easy.

Persona, REST CRUD, Websockets


pie is a Persona/BrowserId Provider and client
pie is a REST service allowing CRUD access on a user's "channels"
pie is a websocket pubsub service for listening to channel events.
pie federation works by using BrowserId -- the users interact with eachother's servers or the server acts on behalf of the user.

identity:

fritzy@andyet.com is
https://andyet.com/.well_known/pie -> https://andyet.com/pie
https://andyet.com/pie/fritzy/

verified by persona


pie channels:

items, events, subscriptions, config, and subchannels

Every channel is owned by a user/identity, and can assign persmissions to any other user.


The config:

    config: {
        name: "The Alleyway",
        description: "",
        purpose: "",
        discoverable: true, // now it's public
        msg_count: 50,
        event_count: 50,
        key_whitelist: [],
        subscriber_channel: true, // gives each user a subchannel to publish to that all par all_acl: .., // acl flag string
        subscriber_acl: ..., // subscriber flag string.
    }

ACL strings:

    p: publish,
    k: set/del own keys
    K: set/del all keys
    d: delete/revise own items
    D: delete all items
    c: read config
    C: set config
    m: moderate subscriptions
    M: moderate permissions
    s: subscribe and read items and sub channel links
    S: create sub channels (delete own)
    L: delete sub channels
    o: able to give permissions
    O: able to give, remove op
    R: able to read others' permissions
    a: owner-like admin


REST CRUD

GET/POST/DELETE/PUT on channels, channel config, items, acl

eg: publishing an item

    POST https://andyet.com/pie/adam/inbox?type=item

When POSTing, the type is associated with a new item of the channel of the last node of the uri.

eg: getting your acl

    GET https://andyet.com/pie/adam/chatrooms/andyet-shippy?id=fritzy@andyet.com&type=acl

When GETing, DELETEing, PUTing a specific item, an id or key is required.

GETing a channel without a name give paginated results.

GETing also has pagination

Well Known Channels

/discovery
/sessions
/inbox
/roster
/subscriptions
/subscriptions/remote
/subscriptions/masks
/requests

Sessions:

Sessions exist with a unique id in /sessions/[id]/
All subchannels are transient based on the session.

Websocket Listener
Connect with websockets with a specific subscription mask

Incoming
{channel: user/some/channel, event: {}}

Outgoing:
{playback: maskid, starting: eventid}

Remote channels

https://someoneelse.org/pie/fritzy@andyet.com/subscriptions/masks

If I subscribe to a channel from a channel, the server manages the subscription on my behalf remotely, and listens to the subscription to populate the local channel.
The server may stay in sync with the remote server in several ways: always listening to changes, occassionally asking for a diff, resyncing when the user logs in, etc.

