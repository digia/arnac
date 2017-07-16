'use strict'

module.exports = function () 
{
  this.Given(/i am (signed|logged) out/, function (cb) {
    console.log(this.World);
  });

}

