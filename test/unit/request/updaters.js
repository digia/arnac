import { RequestUpdater } from '../../../src/request/updaters';
import { StateError, InputError } from '../../../src/foundation/errors';


describe('Request Updater', function () {
  it(`instantiated`, function (done) {
    const requestUpdater = RequestUpdater();

    expect(requestUpdater).to.exist();

    done();
  });

  it(`throws state error if request is soft deleted`, function (done) {
    const mRequest = {
      isDeleted()
      {
        return true;
      },
    };

    RequestUpdater().update(mRequest, {})
    .catch((err) => {
      expect(err).to.instanceof(StateError);

      done();
    });
  });

  it(`throws state error if request is outside of the draft state`, function (done) {
    const mRequest = {
      isDeleted()
      {
        return false;
      },
      isDraft()
      {
        return false;
      }
    };

    RequestUpdater().update(mRequest, {})
    .catch((err) => {
      expect(err).to.instanceof(StateError);

      done();
    });
  });

  it(`throws input error if update is called without attributes`, function (done) {
    RequestUpdater().update({})
    .catch((err) => {
      expect(err).to.instanceof(InputError);

      done();
    });
  });

  it(`throws state error if request is outside of the draft state`, function (done) {
    const mRequest = {
      isDeleted()
      {
        return false;
      },
      isDraft()
      {
        return false;
      }
    };

    RequestUpdater().update(mRequest, {})
    .catch((err) => {
      expect(err).to.instanceof(StateError);

      done();
    });
  });

  it(`updates a request in the draft state`, function (done) {
    const mRequest = {
      isDeleted()
      {
        return false;
      },
      isDraft()
      {
        return true;
      },
      save(attributes, opts)
      {
        return Promise.resolve(true);
      }
    };

    RequestUpdater().update(mRequest, {})
    .then((updatedRequest) => {
      expect(updatedRequest).to.equal(true);

      done();
    });
  });
});
