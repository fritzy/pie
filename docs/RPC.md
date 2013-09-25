
RPC calls are generally for non-channel-CRUD actions, like dealing with user requests.
RPC calls are all POST HTTP calls with the browserid headers.  
RPC calls are defined by the query parameter "rpc".
All RPC calls MUST be from browserid or local authenticated users.  
RPC calls are generally not allowed unless a relationship is stablished. Exceptions include relationship rpc calls: requestRelationship, getRelationship, remoteRequestEvent (for relationship status events only).

## RPC Failure Responses

Errors are given in 4xx or 5xx responses, and are JSON objects including an error field. 

    error: object, required
    error.name: string, required, unique name of error type
    error.txt: string or array of strings, optional, description of error meant for a user to read
    error.target: uri, optional, pie URI relevant to error

### BrowserID verification failure or not authenticated.
    
    401
    {
        error: {
            name: 'notAuthenticated',
            txt: 'Unable to verify identity.',
        }
    }


### User does not have proper ACL to make a request

    403
    {
        error: {
            name: 'notAuthorized',
            txt: 'user@example does not have access to RPC call requestSubscription on pie:user2@example2/some/channel',
            target: 'pie:user2@example2/some/channel',
        }
    }

### RPC call requires having a relationship

    403
    {
        error: {
            name: 'relationshipRequired',
            txt: 'user@example is required to have a relatinship with user2@example2 in order to complete this action.'
        }
    }

### Malformed request

    Validation of the headers or JSON body failed.

    400
    {
        error: {
            name: 'malformedRequest',
            txt: 'Content-Type must be application/json for this request.',
        }
    }

## Requests

A request RPC call must always have a pie user in the path.  
The request object itself is very specific to each request, but there are some constants.

    who: optional, uri, populated by recieving server, user who made the original request
    id: optional, string, populated by recieving server
    status: optional, enum, populated by recieving server [pending, approved, denied]
    msg: optional, string, small message sent along with request for user context
    requestType: optional, string, populated by server, usually matches the rpc of the original request
    destination: optional, pie uri, populated by server, location being referred to if applicable

Before responding, the server MUST update the request's status, id, destination, and requestType, the server MUST reply with at least these fields in the response body. The server MAY respond with additional populated fields and fields that the user sent in the initial request.

Accepting and Denying requests typically only requires an 'id' and to be done by an authorized user.

### Request Events

Successful creation of a request spawns a requestNew event.

deny/accept calls spawn a requestResponse event or call rpc=requestResponse on remote users in order to accomplish the same thing.

### requestRelationship

   content: optional, array of uri, list of pie content uris
   subject: optional, array of strings, list of non-normalized user interests

Upon the server allowing this request, the server populates the following fields: who, id, requestType, status.  
The status set depends on the implementation and configuration of the server.

### acceptRelationship

Accepting the relationship need only include the id field.
The event spawned will be of a typical event model of the type requestResponse either locally or through the remote rpc call of the `who`.

{
    eventType: 'requestResponse',
    event: {
        //request object here
    },
}

### denyRelationship

Same as allow, but it changes the `status` to "denied".

### requestAccess

    acl: acl string described in ACL.md

### acceptAccess

If you have 'm' in the ACL section of the ACL flag string of that channel, you may do this, only if additionally you have all of the permissions that the user includes.

### denyAccess

If you have 'm'oderate on this channel, you may denyAccess to any requests on this channel.

### setAccess

If you have 'm'oderate on this channel, you may set access up to the amount of access that you have.

### requestSubscription

    subscription: object
    subscription.id: populated by upon accepting
    subscription.type: enum, 'user', 'channel'
    subscription.recursive: bool, default: false
    subscription.remote: pie uri, if type is channel, specify remote location

### acceptSubscription

If you have 'm'oderate subscription access, you may accept the subscription.

A responseEvent is generated, containing the subscription as the `event` payload.

### denySubscription

If you have 'm'oderate subscription access, you may deny the subscription.

A responseEvent is generated, containing the subscription as the `event` payload.

## Other

### discover

### getRelationship

Returns the relationship-request model.

### getAccess

### updateAccess

### getSubscription

### responseEvent

For remote servers responding to events, an event is generated if the server decides to do so, containing the payload of this as the `event` payload.

