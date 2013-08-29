var very = require('verymodel');

var ChannelConfig = new very.VeryModel({
    name: {},
    description: {},
    purpose: {},
    discoverable: {},
    item_count: {},
    history_count: {},
    key_whitelist: {},
    subscriber_channel: {},
    subscriber_acl: {},
    everyone_acl: {}
});

module.exports = ChannelConfig;

