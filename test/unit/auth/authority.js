import Authority from '../../../src/auth/authority';


describe('Authority', function () {
  describe('Random Tokens', function () {
    it(`generates random tokens`, function () {
      const authority = Authority();
      const token = authority.generateRandomToken();

      expect(token.then).to.exist();

      return token.then((result) => {
        expect(result).to.be.a.string();
      });
    });

    it(`allow for tokens of different lengths and encodings`, function () {
      const authority = Authority();
      const token = authority.generateRandomToken({ length: 5, encoding: 'hex' });

      return token.then((result) => {
        // NOTE(digia): hex encoding results in a string twice as long
        expect(result).to.be.length(5*2);
      });
    });
  });

  // NOTE(digia): Uses jsonwebtoken which is wrapped in a promise. Not sure
  // how to mock at this point. No time.
  describe('Auth Tokens', function () {
    it(`generates a JWT auth token`, function () {
      const authority = Authority();

      return authority.generateAuthToken('payload')
        .then((token) => {
          expect(token).to.be.a.string();
        });
    });

    it(`verifies a JWT auth token`, function () {
      const authority = Authority();

      return authority.generateAuthToken('payload')
        .then((token) => {
          return authority.verifyAuthToken(token)
            .then((verified) => expect(verified).to.be.true);
        });
    });
  });

  // NOTE(digia): Bcrypt is used here... it's wrapped in a promise. Not
  // sure how to mock it at this point. No time.
  describe('Hashes', function () {
    it(`generates a hash`, function () {
      const authority = Authority();
      const token = authority.generateHash('test');

      expect(token.then).to.exist();

      return token.then((result) => {
          expect(result).to.a.string();
        });
    });

    it(`compares two hashes`, function () {
      const authority = Authority();
      const token = authority.generateHash('test');

      return token.then((result) => {
        authority.compareHash('test', result).then((match) => {
          expect(match).to.be.true;
        });
      });
    });
  });

  it(`can generate both auth and refresh tokens`, function () {
    const authority = Authority();

    return authority.generateTokens('payload')
      .then((tokens) => {
        expect(tokens.authToken).to.be.a.string();
        expect(tokens.refreshToken).to.be.a.string();
      });
  });
});
