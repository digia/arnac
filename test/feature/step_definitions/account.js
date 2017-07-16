'use strict'

module.exports = function () 
{
  this.Given(/^the system knows about the following account:$/, function (table, cb) 
  {
    var data = table.hashes().pop();

  });

  this.When(/^the client requests the account$/, function (cb)
  {
    cb.pending();
  });

  this.Then(/^the response is an account containing its information$/, function (table, cb)
  {
    cb.pending();
  });

}
