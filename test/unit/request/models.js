import { Request } from '../../../src/request/models';


describe('Request Model', function () {

  it(`instantiated as a draft`, function (done) {

    const request = Request.forge();

    expect(request).to.exist();

    done();
  });

});

