# ACL String

The ACL string is a series of sections of a flag string. Each of a few unique characters in each section determines an access as having been granted or not. Each section is split by the `|` (pipe) character. The sections are channel, item, acl, and subscriptions. The first two are simple CRUD controls, so the characters are 'crud' respectively. If I have no permissoins on a channel, my ACL string would look like:

    ||||

If I have create, read, update, and delete on both the channel and items, it would look like:

    crud|crud||

ACL and subscription sections have the characters 'r' and 'm' for Read and Moderate, and for subscriptions 's' for Subscribe meaning that their subscriptions are whitelisted.

If I can do anything with the channel (including creation of subchannels) and do anything with events, and read and approve/deny subscriptions, and read and approve/deny ACL, then my permission string is fully populated as:

    crud|crud|rm|rms
    
The order of the characters is any given section is not important.

String generation:

Users may be given explicit permissions on a channel, but any time their ACL string is queried, it is actually generated (or pulled from cache upon implementation).

Generating an ACL string involves combining their explicit permissions with the channel configuration field `everyone_acl`, their explicitely granted permissions, and if they have a relationship with an `access_tag` that contains a tag in the configuration object of the channel, they are also granted r|r||s (read channel, read item, and subscribe).
If the user owns the channel, or the channel is it in the user's own path, the user has full permissions.

## Channel 'c'reate

You can create subchannels owned by you within this channel.

## Channel 'r'ead

You can see that this channel exists, and the name and description fields of the configuration.

## Channel 'u'pdated

You may update the channel configuration's name and description fields.
(only the owner may update other fields).

## Channel 'd'elete

You may delete this channel, which will delete all subchannels, items, files, acl, subscriptions, etc.

## Item 'c'reate

You may append items to the channel.

## Item 'r'ead

You may read existing items in the channel.

## Item 'u'pdate

You may update existing items in the channel.

## Item 'd'elete

You may delete items within the channel.

## ACL 'r'ead

You may query anyone's permissions in the channel.

## ACL 'm'oderate

You may approve and deny permission requests up to your level of permissions.
(that is, if you don't have subscribe moderate, your approval may not give them that persmission).

## Subscription 'r'

You may view anyone's subscription to this channel.

## Subscription 'm'

You may accept and deny subscriptions to this channel.

## Subscription 's'

Your subscription requests to this channel are automatically approved (except in the case of malformed or too many subscriptions at the implimentation's discretion).
