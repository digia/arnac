import Async from 'async';
import Uuid from 'node-uuid';
import Authority from '../../src/auth/authority';
import {
  db as Db,
  refreshDb,
  generateAuthToken,
  structurePayload,
  createAccount,
  createUser,
  server as Server,
  uuidList,
} from './helpers';


const mAccountIdList = uuidList(2);
const mUserIdList = uuidList(2);
let authToken;
let authTokenAccount2;

before(() => {
  return Promise.all([
    generateAuthToken({ accountId: mAccountIdList[0], userId: mUserIdList[0] }).then(t => authToken = t),
    generateAuthToken({ accountId: mAccountIdList[1], userId: mUserIdList[1] }).then(t => authTokenAccount2 = t),
  ]);
});

describe('Auth', function () {
  let mAccount;
  let mUser;
  let mUserSoftDelete;

  before(() => {
    return refreshDb()
      .then(() => {
        return createAccount({ id: mAccountIdList[0] })
          .then(a => mAccount = a);
      })
      .then(() => {
        return Promise.all([
          createUser({ id: mUserIdList[0], account_id: mAccountIdList[0] })
            .then(u => mUser = u),
          createUser({ id: mUserIdList[1], account_id: mAccountIdList[0], deleted_at: new Date() })
            .then(u => mUserSoftDelete = u),
        ]);
      });
  });

  describe('POST /register', function () {
    it(`201 with successful registration`, function () {
      const payload = {
        email: 'idontexists@gmail.com',
        fname: 'Jonathon',
        lname: 'Moore',
        organization: 'digia, LLC',
        password: 'password',
      };

      const options = {
        method: 'POST',
        url: '/auth/register',
        payload,
      };

      return Server.inject(options)
        .then((response) => {
          expect(response.statusCode).to.equal(201);

          const data = response.result;

          expect(data.email).to.equal(payload.email);
          expect(data.fname).to.equal(payload.fname);
          expect(data.lname).to.equal(payload.lname);
          expect(data.organization).to.equal(payload.organization);

          expect(data.phone).to.be.null();
          expect(data.street).to.be.null();
          expect(data.street2).to.be.null();
          expect(data.city).to.be.null();
          expect(data.state).to.be.null();
          expect(data.zipcode).to.be.null();
          expect(data.country).to.be.null();

          expect(data.password).to.not.exist();

          return Db.fetchWhere('user', 'email', data.email)
            .then(([user]) => {
              expect(user.password_hash).to.be.a.string();
              expect(user.password_reset_at).to.null();
              expect(user.password_reset_token).to.null();
            });
        });
    });

    it(`201 with successful registration including an address`, function () {
      const payload = {
        organization: 'digia, LLC',
        phone: '1233334444',
        street: 'Auth Test Ave.',
        city: 'Lansing',
        state: 'Michigan',
        zipcode: '48911',
        country: 'US',
        email: 'withaddress@gmail.com',
        password: 'password',
        fname: 'WithAddress',
        lname: 'Registration',
      };

      const options = {
        method: 'POST',
        url: '/auth/register',
        payload,
      };

      return Server.inject(options)
        .then((response) => {
          expect(response.statusCode).to.equal(201);

          const data = response.result;

          expect(data.email).to.equal(payload.email);
          expect(data.fname).to.equal(payload.fname);
          expect(data.lname).to.equal(payload.lname);
          expect(data.organization).to.equal(payload.organization);
          expect(data.password).to.not.exist();

          expect(data.phone).to.equal(payload.phone);
          expect(data.street).to.equal(payload.street);
          expect(data.street2).to.be.null()
          expect(data.city).to.equal(payload.city);
          expect(data.state).to.equal('Michigan');
          expect(data.zipcode).to.equal(payload.zipcode);
          expect(data.country).to.equal('United States');
        });
    });

    it(`400 when attempting to register with a partial address`, function () {
      const payload = {
        organization: 'digia, LLC',
        phone: '1233334444',
        street: 'Auth Test Ave.',
        email: 'partialaddress@gmail.com',
        password: 'aaaaaa',
        fname: 'Partial',
        lname: 'Address',
      };

      const options = {
        method: 'POST',
        url: '/auth/register',
        payload,
      };

      return Server.inject(options)
        .then((response) => {
          expect(response.statusCode).to.equal(400);
        });
    });

    it(`400 when attempting to register with only a street2`, function () {
      const payload = {
        organization: 'digia, LLC',
        phone: '1233334444',
        street2: 'Auth Test Ave.',
        email: 'partialaddress@gmail.com',
        password: 'aaaaaa',
        fname: 'Partial',
        lname: 'Address',
      };

      const options = {
        method: 'POST',
        url: '/auth/register',
        payload,
      };

      return Server.inject(options)
        .then((response) => {
          expect(response.statusCode).to.equal(400);
        });
    });

    it(`409 when attempting to register with an existing email`, function () {
      const payload = {
        email: mUser.email,
        fname: 'Jonathon',
        lname: 'Moore',
        organization: 'digia, LLC',
        password: 'aaaaaa',
      };

      const options = {
        method: 'POST',
        url: '/auth/register',
        payload,
      };

      return Server.inject(options)
        .then((response) => {
          expect(response.statusCode).to.equal(409);
        });
    });

    it(`400 when the password isn't long enough`, function () {
      const payload = {
        email: 'jon@digia.com',
        fname: 'Jonathon',
        lname: 'Moore',
        organization: 'digia, LLC',
        password: '12345',
      };

      const options = {
        method: 'POST',
        url: '/auth/register',
        payload,
      };

      return Server.inject(options)
        .then((response) => {
          expect(response.statusCode).to.equal(400);
        });
    });

    it(`400 when the email isn't valid`, function () {
      const payload = {
        email: 'jondigia',
        fname: 'Jonathon',
        lname: 'Moore',
        organization: 'digia, LLC',
        password: 'aaaaaa',
      };

      const options = {
        method: 'POST',
        url: '/auth/register',
        payload,
      };

      return Server.inject(options)
        .then((response) => {
          expect(response.statusCode).to.equal(400);
        });
    });
  });

  describe('POST /authenticate', function () {
    it(`200 when successfully authenticated`, function (done) {
      const payload = {
        email: mUser.email,
        password: 'aaaaaa',
      };

      const options = {
        method: 'POST',
        url: '/auth/authenticate',
        payload,
      };

      Server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);

        const { token } = response.result;

        expect(token).to.be.a.string();

        done();
      });
    });

    it(`422 when user doesn't exist with provided email address`, function (done) {
      const payload = {
        email: 'idontexist@email.com',
        password: 'does not match',
      };

      const options = {
        method: 'POST',
        url: '/auth/authenticate',
        payload,
      };

      Server.inject(options, function (response) {
        expect(response.statusCode).to.equal(422);

        done();
      });
    });

    it(`422 when password is invalid`, function (done) {
      const payload = {
        email: mUser.email,
        password: 'does not match',
      };

      const options = {
        method: 'POST',
        url: '/auth/authenticate',
        payload,
      };

      Server.inject(options, function (response) {
        expect(response.statusCode).to.equal(422);

        done();
      });
    });
  });

  describe('POST /register, POST /authenticate', function () {
    it(`allows us to register and immediate authenticate`, function (done) {
      // Register
      const registrationAttributes = {
        email: 'idontexist212@gmail.com',
        fname: 'Jonathon',
        lname: 'Moore',
        organization: 'digia, LLC',
        password: 'aaaaaa',
      };

      const registerOptions = {
        method: 'POST',
        url: '/auth/register',
        payload: registrationAttributes,
      };

      Server.inject(registerOptions, function (registerResponse) {
        expect(registerResponse.statusCode).to.equal(201);

        // Authenticate
        const authenticateAttributes = {
          email: registrationAttributes.email,
          password: registrationAttributes.password,
        };

        const authenticateOptions = {
          method: 'POST',
          url: '/auth/authenticate',
          payload: authenticateAttributes,
        };

        Server.inject(authenticateOptions, function (authenticateResponse) {
          expect(authenticateResponse.statusCode).to.equal(200);

          const { token } = authenticateResponse.result;

          expect(token).to.be.a.string();

          done();
        });
      });
    });
  });

  describe('GET /is-authenticated', function () {
    it(`200 when authorization token is valid`, function (done) {
      const options = {
        method: 'GET',
        url: '/auth/is-authenticated',
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      };

      Server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);

        done();
      });
    });

    it(`401 when authorization token is invalid or nonexistant`, function (done) {
      const options = {
        method: 'GET',
        url: '/auth/is-authenticated',
      };

      Server.inject(options, function (response) {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });
  });

  describe('POST /auth/refresh', function () {
    it(`200 when successfully refreshed, returns new auth and refresh tokens`, function (done) {
      const payload = { token: authToken };
      const options = {
        method: 'POST',
        url: '/auth/refresh',
        payload,
      };

      Server.inject(options, function (response) {
        expect(response.statusCode).to.equal(200);

        const { token } = response.result;

        expect(token).to.be.a.string();

        done();
      });
    });

    it(`422 when the refresh token doesn't match users`, function (done) {
      const payload = { token: 'should not match' };
      const options = {
        method: 'POST',
        url: '/auth/refresh',
        payload,
      };

      // TODO(digia): Refresh token needs to be saved on the user
      Server.inject(options, function (response) {
        expect(response.statusCode).to.equal(422);

        done();
      });
    });
  });

  // TODO(digia): Test when mail system is in place
  describe('GET /auth/password-reset', function () {
  });

  // TODO(digia): Test when mail system is in place
  describe('GET /auth/password-reset/{email}/{token}', function () {
  });
});
