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

# User Story

## Discovering Photos

Bob and Jill are good friends. Bob's user is bob@smith.fam and Jill's user is jill@freehosting.net

Jill's client wants to discover Bob's pie service.

    GET https://smith.fam/.well_known/pie

    RESPONSE:
    {
        pie_root: https://smith.fam/pie,
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
        pie_root: https://freehosting.net/pie,
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
        channel_type: 'image'
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

    POST https://smith.fam/pie?rpc=grantAccess
    {
        channel_type: 'image',
        msg: "Hi Bob. You mentioned that you had family photos posted for your beach trip. Mind sharing?",
        access: 'item:+r',
    }

    RESPONSE:
    {
        id: 'req:grant:aabbccdd',
        channel_type: 'image',
        msg: "Hi Bob. You mentioned that you had family photos posted for your beach trip. Mind sharing?"
        access: 'item:+r',
        status: 'pending'
    }

Bob's client, if logged in gets an event:

    {
        event_type: 'grantAccess',
        channel_type: 'image',
        who: 'jill@freehosting.net',
        id: 'req:sug:aabbccdd',
        sub_type: 'suggestion',
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
                channel_type: 'image',
                who: 'jill@freehosting.net',
                id: 'req:sug:aabbccdd',
                sub_type: 'suggestion',
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
