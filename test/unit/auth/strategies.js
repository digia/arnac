import Hapi from 'hapi';
import Config from 'config';
import * as Strategies from '../../../src/auth/strategies';


describe('token Strategy Options', function () {

  const strategy = Strategies.tokenOptions;

  it(`key matches the .env config key`, function (done) {

    expect(strategy.key).to.equal(Config.get('auth.token.jwt.key'));

    done();
  });

  it(`maxAge matches the .env config key`, function (done) {

    expect(strategy.verifyOptions.maxAge).to.equal(Config.get('auth.token.expiresIn'));

    done();
  });

  it(`passes when decoded value includes user id and account id`, function (done) {

    const decoded = {
      userId: true,
      accountId: true,
    };

    strategy.validateFunc({}, decoded, (err, result) => {

      expect(result).to.be.true;

      done();
    });
  });

  it(`fails when user id or account id isn't in the decoded`, function (done) {

    strategy.validateFunc({}, {}, (err, result) => {

      expect(result).to.be.false;

      done();
    });
  });

});


describe('token-query-account Strategy Options', function () {

  const strategy = Strategies.tokenQueryAccountOptions;

  it(`key matches the .env config key`, function (done) {

    expect(strategy.key).to.equal(Config.get('auth.token.jwt.key'));

    done();
  });

  it(`maxAge matches the .env config key`, function (done) {

    expect(strategy.verifyOptions.maxAge).to.equal(Config.get('auth.token.expiresIn'));

    done();
  });

  it(`passes when decoded account id matches query filter account id`, function (done) {

    const request = {
      query: {
        filter: {
          accountId: true,
        },
      }
    };
    const decoded = {
      userId: true,
      accountId: true,
    };

    strategy.validateFunc(request, decoded, (err, result) => {

      expect(result).to.be.true;

      done();
    });
  });

  it(`fails when account id doesn't match query filter account id`, function (done) {

    const request = {
      query: {
        filter: {
          accountId: false,
        },
      }
    };
    const decoded = {
      userId: true,
      accountId: true,
    };

    strategy.validateFunc(request, decoded, (err, result) => {

      expect(result).to.be.false;

      done();
    });
  });

  it(`fails when user id or account id isn't in the decoded`, function (done) {

    const request = {
      query: {
        filter: {
          accountId: false,
        },
      }
    };
    strategy.validateFunc(request, {}, (err, result) => {

      expect(result).to.be.false;

      done();
    });
  });

  it(`fails when filter query isn't set`, function (done) {

    const request = {
      query: {
      }
    };
    const decoded = {
      userId: true,
      accountId: true,
    };

    strategy.validateFunc(request, decoded, (err, result) => {

      expect(result).to.be.false;

      done();
    });
  });

});

describe('token-query-user Strategy Options', function () {

  const strategy = Strategies.tokenQueryUserOptions;

  it(`key matches the .env config key`, function (done) {

    expect(strategy.key).to.equal(Config.get('auth.token.jwt.key'));

    done();
  });

  it(`maxAge matches the .env config key`, function (done) {

    expect(strategy.verifyOptions.maxAge).to.equal(Config.get('auth.token.expiresIn'));

    done();
  });

  it(`passes when decoded user id matches query filter user id`, function (done) {

    const request = {
      query: {
        filter: {
          userId: true,
        },
      }
    };
    const decoded = {
      userId: true,
      accountId: true,
    };

    strategy.validateFunc(request, decoded, (err, result) => {

      expect(result).to.be.true;

      done();
    });
  });

  it(`fails when user id doesn't match query filter user id`, function (done) {

    const request = {
      query: {
        filter: {
          userId: false,
        },
      }
    };
    const decoded = {
      userId: true,
      accountId: true,
    };

    strategy.validateFunc(request, decoded, (err, result) => {

      expect(result).to.be.false;

      done();
    });
  });

  it(`fails when user id or account id isn't in the decoded`, function (done) {

    const request = {
      query: {
        filter: {
          userId: false,
        },
      }
    };
    strategy.validateFunc(request, {}, (err, result) => {

      expect(result).to.be.false;

      done();
    });
  });

  it(`fails when filter query isn't set`, function (done) {

    const request = {
      query: {
      }
    };
    const decoded = {
      userId: true,
      accountId: true,
    };

    strategy.validateFunc(request, decoded, (err, result) => {

      expect(result).to.be.false;

      done();
    });
  });

});

