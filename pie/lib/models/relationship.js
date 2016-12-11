var Request = require('./request');
var very = require('verymodel');

var Relationship = new very.VeryModel({
    content: {},
    subject: {},
});

Relationship.inherit(Request);

module.exports = Relationship;
