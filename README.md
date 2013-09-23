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
        public_acl: ..., // public flag string.
        access_tags: [], // tags that if any are included in the relationship access tags, read and subscribe access are assumed
    }

# User Story

## Discovering Photos

Bob and Jill are good friends. Bob's user is bob@smith.fam and Jill's user is jill@freehosting.net

Jill's client wants to discover Bob's pie service.

    GET https://smith.fam/.well_known/pie

    RESPONSE:
    {
        http_root: https://smith.fam/pie,
        websocket: https://smith.fam/pie
    }

Jill wants to be able to make requests of Bob. Jill needs to request a relationship with Bob. Jill can hint at interests (content and subjects) in this request.

    POST https://smith.fam/pie/bob?rpc=requestRelationship
    {
        content: ['urn:pie:image', 'urn:pie:contact', 'urn:pie:post'],
        subject: ['tech', 'family'],
        msg: "Hey Bob! Thanks for telling me about PIE! Can we be friends?"
    }

    RESPONSE:
    {
        id: 'req:rel:aaffee',
        content: ['urn:pie:image', 'urn:pie:contact', 'urn:pie:post'],
        subject: ['tech', 'family'],
        msg: "Hey Bob! Thanks for telling me about PIE! Can we be friends?"
        status: 'pending'
    }

Bob's implementation MAY auto-approve the request, and which point the status would respond as 'approved', but in this case it did not.

Bob's client, if logged in gets an event:

    {
        who: 'jill@freehosting.net',
        event_type: 'requestRelationship',
        id: 'req:rel:aaffee',
        content: ['urn:pie:image', 'urn:pie:contact', 'urn:pie:post'],
        subject: ['tech', 'family'],
        msg: "Hey Bob! Thanks for telling me about PIE! Can we be friends?"
        status: 'pending'
    }

Or Bob may later query his pending requests.

    POST https://smith.fam/pie/bob?rpc=getRequests

    RESPONSE:
    {
        requests: [
            {
                who: 'jill@freehosting.net',
                event_type: 'requestRelationship',
                id: 'req:rel:aaffee',
                content: ['urn:pie:image', 'urn:pie:contact', 'urn:pie:post'],
                subject: ['tech', 'family'],
                msg: "Hey Bob! Thanks for telling me about PIE! Can we be friends?"
                status: 'pending'
            }
        ],
        count: 1,
        total: 1,
        offset: 0,
        limit: 50
    }

Bob may then approve or deny the relationship. Bob may also set access\_tags for the relationship, automatically allowing Jill access to channels that contain one of those access\_tags.

    POST https://smith.fam/pie?approveRelationship
    {
        id: 'req:rel:aaffee',
        access_tags: ['friend', 'coworker', 'tech', 'local'],
    }

Now Bob's server will attempt to notify Jill.

    GET https://freehosting.net/.well_known/pie

    RESPONSE:
    {
        http_root: https://freehosting.net/pie,
        websocket: https://freehosting.net/pie
    }

And send Jill a remote event.

    POST https://freehosting.net/pie/jill?rpc=remoteRequestEvent
    {
        who: 'bob@smith.fam',
        event_type: 'requestRelationship',
        id: 'req:rel:aaffee',
        content: ['urn:pie:image', 'urn:pie:contact', 'urn:pie:post'],
        subject: ['tech', 'family'],
        msg: "Hey Bob! Thanks for telling me about PIE! Can we be friends?"
        status: 'approved'
    }

Servers SHOULD approve remoteRequestEvent rpc calls of the requestRelationship type, but MAY choose to require a Relationship first. The latter being the case, Jill would have to check on the status of her relationship.
Servers MUST not include the access\_tags in the response as this information is not intended for the requester.

    POST https://smith.fam/pie/bob?getRelationship

    RESPONSE:
    {
        who: 'bob@smith.fam',
        event_type: 'requestRelationship',
        id: 'req:rel:aaffee',
        content: ['urn:pie:image', 'urn:pie:contact', 'urn:pie:post'],
        subject: ['tech', 'family'],
        msg: "Hey Bob! Thanks for telling me about PIE! Can we be friends?"
        status: 'approved'
    }

Jill wants to see what photo galleries/channels Bob has.

    POST https://smith.fam/pie?rpc=discover

    {
        channel_type: 'urn:pie:image'
    }
    
    RESPONSE:
    {
        channels: [
            '/images/public',
        ],
        count: 1,
        total: 1,
        offset: 0,
        limit: 50
    }

Jill suspects that Bob would share more photos with her if she asked, so she does.
Ideally, one of the access\_tags that Bob set for his relationship with Jill should be included in the channels he would grant her access to, but this is a less ideal scenario. As such, Jill's going to see what other image channels Bob might give her access to.

    POST https://smith.fam/pie?rpc=grantAccess
    {
        channel_type: 'urn:pie:image',
        msg: "Hi Bob. You mentioned that you had family photos posted for your beach trip. Mind sharing?",
        access: 'item:+r',
    }

    RESPONSE:
    {
        id: 'req:grant:aabbccdd',
        channel_type: 'urn:pie:image',
        msg: "Hi Bob. You mentioned that you had family photos posted for your beach trip. Mind sharing?"
        access: 'item:+r',
        status: 'pending'
    }

Bob's client, if logged in gets an event:

    {
        event_type: 'grantAccess',
        channel_type: 'urn:pie:image',
        who: 'jill@freehosting.net',
        id: 'req:sug:aabbccdd',
        access: 'item:+r',
        status: 'pending',
    }

Or Bob may later query his pending requests.

    POST https://smith.fam/pie?rpc=getRequests

    RESPONSE:
    {
        requests: [
            {
                event_type: 'grantAccess',
                channel_type: 'urn:pie:image',
                who: 'jill@freehosting.net',
                id: 'req:sug:aabbccdd',
                access: 'item:+r',
                status: 'pending',
            }
        ],
        count: 1,
        total: 1,
        offset: 0,
        limit: 50
    }

Bob may denyRequest or grantRequest.

    POST https://smith.fam/pie?rpc=grantRequest
    {
        {
            id: 'req:sug:aabbccdd',
            channels: [
                '/images/family/*',
                '/images/work/*',
                '/images/public/*',
            ]
            access: 'item:+r',
        }
    }

Bob's server now informs Jill's server of the request.

    POST https://smith.fam/pie?rpc=remoteRequestEvent
    {
        event_type: 'grantAccess',
        id: 'req:sug:aabbccdd',
        channels: [
            '/images/family/*',
            '/images/work/*',
            '/images/public/*',
        ]
        access: 'item:+r',
    }

Her ACL grant request is allowed, and appropriate ACL events are sent to channel subscribers for each channel.

Jill, now being given access, will now be able to discover, subscribe, and read data from those channels.

Jill wants to know when Bob has new photos for his family, so she creates a local channel for Bob, and then one for his pictures.

    POST "https://freehosting.net/pie/jill/roster/Bob%20Smith?type=channel"
    {
        Name: "Bob Smith",
    }
    
    POST "https://freehosting.net/pie/jill/roster/Bob%20Smith/fampictures?type=channel"
    {
        Name: "Bob Smith's Family Pictures",
    }

In order to get updates on Bob's pictures, she requests a channel subscription.

    POST "https://freehosting.net/pie/jill/roster/Bob%20Smith/fampictures?rpc=channelSubscription"
    {
        remote: 'bob@smith.fam/images/family/*',
    }

This does two things. 1. It gives bob@smith.fam write access to this channel. 2. It sends a subscription request.

The server sends the request for Jill.

    POST "https://smith.fam/bob/images/family?rpc=subscribe"
    {
        sub_type: 'channel',
        recursive: true,
        remote: 'jill@freehosting.net/roster/Bob%20Smith/fampictures',
        send_file: false,
    }

    Response:
    {
        id: 'req:sub:ddffeeee',
        request: 'subscribe',
        sub_type: 'channel',
        recursive: true,
        remote: 'jill@freehosting.net/roster/Bob%20Smith/fampictures',
        send_file: false,
        status: 'approved',
    }

Since Jill already has subscribe and read access, her subscription is automatically approved.
Now whenever a new item is published to that channel, Bob's server will POST it to Jill's channel.

    POST "https://freehosting.net/roster/Bob%20Smith/fampictures/?type=item&sub=req:sub:ddffeeee"
    {
        ns: 'urn:pie:image',
        name: "Beach Trip Day 2"
        tags: [],
        file: 'pie:bob@smith.fam/images/family/?type=file&id=asdfalkjsdf',
    }

Jill's server confirms the subscription matches the source, and adds the item. If Jill is subscribed to her own channel, she will get a createItem event.
If she had set send\_file: true, then a file would have been POSTed as well, but instead it is remotely referred to.

Jill can now review the item.

    GET "https://freehosting.net/roster/Bob%20Smith/fampictures/?type=item&expand=true"
    {
        items: [
            {
                from: 'bob@smith.fam/images/family',
                posted: '[iso time here]'
                item: {
                    ns: 'urn:pie:image',
                    name: "Beach Trip Day 2"
                    tags: [],
                    file: 'pie:bob@smith.fam/images/family/?type=file&id=asdfalkjsdf',
                }
        ]
    }

Keep in mind, the from is from the channel it was posted from according to the subscription, and the posted time is from the remote POST time, not the original creation.

Alternatively, Jill could have done a user subscription to remote channel directly, and gotten events over websockets, xhr, or polled with ?rpc=getEvents&since=last without involving her own server at all.

# Happy Case User Scenario

Jill would now like Bob's contact. Bob has 3 contacts /contact/personal, /contact/work, /contact/public.
He's configured /contact/personal with access\_tags: ['friend', 'family'], /contact/public's public\_acl is: 's|r|r|' meaning that the public may subscribe, read channels, and read items, but not do anything with ACL.
So, when Jill goes to discover contacts, she gets these two.

    POST https://smith.fam/pie?rpc=discover

    {
        channel_type: 'urn:pie:contact'
    }
    
    RESPONSE:
    {
        channels: [
            '/contact/public',
            '/contact/personal'
        ],
        count: 2,
        total: 2,
        offset: 0,
        limit: 50
    }

She then does a user subscription to the personal contact.

    POST https://smith.fam/pie/contact/personal?rpc=subscribe
    {
        type: 'user'
    }

    Response:
    {
        type: 'user', 
        id: 'sub:ajlasdjfsa',
        status: 'approved',
        channel: '/contact/personal'
    }

She may then listen on a websocket for changes directly to the remote server.

wss://smith.fam/pie

>>>
    {
        id: 'auth1',
        browserid_token: 'alksdjf',
        rpc: 'browserIdAuth',
    }

<<<

    {
        id: 'auth1',
        authed: true,
    }

>>>
    {
        id: 'subs1',
        rpc: enableSubscriptions,
        subscriptions: ['sub:ajlasdjfsa']
        since: last,
    }

<<<
    {
        id: 'subs1',
        subscriptions: ['sub:ajlasdjfsa/someeventid']
    }

<<<
    //events, since that event id start coming through
    

