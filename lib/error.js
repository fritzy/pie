function NoLocalDomain() {
    Error.apply(this, arguments);
}

NoLocalDomain.prototype = Object.create(Error);
NoLocalDomain.super = Error;

module.exports = {
    NoLocalDomain: NoLocalDomain,
}
