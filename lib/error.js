function NoLocalDomain(domain) {
    Error.apply(this, domain);
    this.description = "Domain " + domain + " is not hosted locally.";
    console.log(domain);
}

NoLocalDomain.prototype = Object.create(Error);
NoLocalDomain.super = Error;


function NoUser(user, domain) {
    Error.apply(this);
    this.description = "User " + user + '@' + domain + " does not exist locally.";
}

NoLocalDomain.prototype = Object.create(Error);
NoLocalDomain.super = Error;

function MethodNotSupported(method) {
    this.method = method;
    this.httpcode = 405;
    this.description = "Method not supported: " + method;
}
MethodNotSupported.prototype = Object.create(Error);
MethodNotSupported.super = Error;

module.exports = {
    NoLocalDomain,
    NoUser,
    MethodNotSupported,
}

