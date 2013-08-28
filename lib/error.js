function NoLocalDomain(domain) {
    Error.apply(this, domain);
    this.description = "Domain " + domain + " is not hosted locally.";
    console.log(domain);
}

NoLocalDomain.prototype = Object.create(Error);
NoLocalDomain.super = Error;

module.exports = {
    NoLocalDomain: NoLocalDomain,
}

function NoUser(user, domain) {
    Error.apply(this);
    this.description = "User " + user + '@' + domain + " does not exist locally.";
}

NoLocalDomain.prototype = Object.create(Error);
NoLocalDomain.super = Error;

module.exports = {
    NoLocalDomain: NoLocalDomain,
    NoUser: NoUser,
}
