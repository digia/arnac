import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import {
  db as Db,
  uuidList,
  refreshDb,
  generateAuthHeaders,
  generateTokens,
  structurePayload,
  authority as Authority,
  server as Server } from '../helpers';


describe('Account - Update', function () {
  const mAddressIdList = uuidList(3);
  const mAccountIdList = uuidList(6);
  const mUserIdList = uuidList(6);
  let authToken;
  let authTokenShared1;
  let authTokenShared2;
  let authTokenNoAddress;
  let authTokenDeleted;
  let authTokenNoPhone;

  before((done) => {
    Async.waterfall([
      function (next) {
        const ids = { accountId: mAccountIdList[0], userId: mUserIdList[0] };

        generateTokens(ids, (err, tokens) => {
          authToken = tokens.authToken;

          next(null);
        });
      },
      function (next) {
        const ids = { accountId: mAccountIdList[1], userId: mUserIdList[1] };

        generateTokens(ids, (err, tokens) => {
          authTokenShared1 = tokens.authToken;

          next(null);
        });
      },
      function (next) {
        const ids = { accountId: mAccountIdList[2], userId: mUserIdList[2] };

        generateTokens(ids, (err, tokens) => {
          authTokenShared2 = tokens.authToken;

          next(null);
        });
      },
      function (next) {
        const ids = { accountId: mAccountIdList[3], userId: mUserIdList[3] };

        generateTokens(ids, (err, tokens) => {
          authTokenNoAddress = tokens.authToken;

          next(null);
        });
      },
      function (next) {
        const ids = { accountId: mAccountIdList[4], userId: mUserIdList[4] };

        generateTokens(ids, (err, tokens) => {
          authTokenDeleted = tokens.authToken;

          next(null);
        });
      },
      function (next) {
        const ids = { accountId: mAccountIdList[5], userId: mUserIdList[5] };

        generateTokens(ids, (err, tokens) => {
          authTokenNoPhone = tokens.authToken;

          next(null);
        });
      },
    ], function (err) {
      if (err) {
        console.log(err);
      }

      done();
    });
  });

  describe('POST /account/{id}', function () {
    let mAccountList;
    let mAddressList;

    const mAccountData = {
      normal: {
        id: mAccountIdList[0],
        organization: 'Test, LLC',
        phone: '9991111234',
        address_id: mAddressIdList[0],
      },
      shared1: {
        id: mAccountIdList[1],
        organization: 'Shared',
        phone: '1234567891',
        address_id: mAddressIdList[1],
      },
      shared2: {
        id: mAccountIdList[2],
        organization: 'Shared',
        phone: '1234567891',
        address_id: mAddressIdList[1],
      },
      noAddress: {
        id: mAccountIdList[3],
        organization: 'No Address',
      },
      deleted: {
        id: mAccountIdList[4],
        organization: 'Soft Delete, LLC',
        phone: '1294567891',
        deleted_at: new Date(),
        address_id: mAddressIdList[2],
      },
      noPhone: {
        id: mAccountIdList[5],
        organization: 'No Phone',
      },
    };

    const mAddressData = {
      normal: {
        id: mAddressIdList[0],
        organization: 'Test, LLC',
        phone: '9991111234',
        street: 'digia Ave.',
        street_2: 'Suite A.',
        city: 'Lansing',
        state: 'MI',
        zipcode: '99999',
        country: 'US',
      },
      shared: {
        id: mAddressIdList[1],
        organization: 'Shared',
        phone: '1234567891',
        street: 'Shared Ave.',
        street_2: 'Suite Z.',
        city: 'Lansing',
        state: 'MI',
        zipcode: '99999',
        country: 'US',
      },
      onDeleted: {
        id: mAddressIdList[2],
        organization: 'Deleted',
        phone: '1294567891',
        street: 'On Deleted',
        street_2: 'Suite B.',
        city: 'Lansing',
        state: 'MI',
        zipcode: '99999',
        country: 'US',
      }
    };

    before((done) => {
      Async.waterfall([
        refreshDb,
        function (next) {
          Db.create('address', _.values(mAddressData))
          .then((addressList) => {
            mAddressList = addressList;

            next(null);
          });
        },
        function (next) {
          Db.create('account', _.values(mAccountData))
          .then((accountList) => {
            mAccountList = accountList;

            next(null);
          });
        },
      ], function (err) {
        if (err) {
          console.log(err);
        }

        done();
      });
    });

    it(`401 when client is not authorized`, function (done) {
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.normal.id}`,
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`401 when account doesn't match authToken account id`, function (done) {
      const attributes = {
        street: '1st Ave. Dr.'
      };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.normal.id}`,
        headers: generateAuthHeaders(authTokenShared1),
        payload: structurePayload('account', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(401);

        done();
      });
    });

    it(`200 with the successfully updated account`, function (done) {
      const payload = {
        organization: 'Updated account',
        phone: '8889991234',
        street: 'An updated street',
        street2: null,
        state: 'Bad spelling allowed, unfortunately.',
      };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.normal.id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('account', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('account');
        expect(id).to.be.a.string();

        expect(attributes.organization).to.equal(payload.organization);
        expect(attributes.phone).to.equal(payload.phone);
        expect(attributes.street).to.equal(payload.street);
        expect(attributes.street2).to.equal(payload.street2);
        expect(attributes.city).to.equal(mAddressData.normal.city);
        expect(attributes.state).to.equal(payload.state);
        expect(attributes.zipcode).to.equal(mAddressData.normal.zipcode);
        expect(attributes.country).to.equal('United States');
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();


        // Confirm that a new address was not created

        Db.knex('account')
        .where({ address_id: mAddressData.normal.id })
        .first()
        .then((dbAccount) => {
          expect(dbAccount.id).to.equal(id);

          done();
        });
      });
    });

    // NOTE(digia): Updating any of the address properties on an account
    // who's sharing the address - within the database - should results in a
    // new address being created.
    it(`200 with the successfully updated account who's address was shared`, function (done) {
      const payload = {
        organization: 'No Longer Shared Address',
        phone: null,
        street: 'An updated street',
      };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.shared1.id}`,
        headers: generateAuthHeaders(authTokenShared1),
        payload: structurePayload('account', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('account');
        expect(id).to.be.a.string();

        expect(attributes.organization).to.equal(payload.organization);
        expect(attributes.phone).to.equal(payload.phone);
        expect(attributes.street).to.equal(payload.street);
        expect(attributes.street2).to.equal(mAddressData.shared.street_2);
        expect(attributes.city).to.equal(mAddressData.shared.city);
        expect(attributes.state).to.equal('Michigan');
        expect(attributes.zipcode).to.equal(mAddressData.shared.zipcode);
        expect(attributes.country).to.equal('United States');
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();


        // Confirm that a new address was created

        Db.knex('account')
        .where({ id })
        .first()
        .then((dbAccount) => {
          expect(dbAccount.address_id).to.not.equal(mAddressData.shared.id);

          done();
        });
      });
    });

    // NOTE(digia): Updating the organization and or phone property on an
    // accounts without an address should not create an address!
    it(`200 with the successfully updated account without an address`, function (done) {
      const payload = {
        organization: 'Still shouldn not have an address...',
        phone: '9991231234',
      };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.noAddress.id}`,
        headers: generateAuthHeaders(authTokenNoAddress),
        payload: structurePayload('account', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('account');
        expect(id).to.be.a.string();

        expect(attributes.organization).to.equal(payload.organization);
        expect(attributes.phone).to.equal(payload.phone);
        expect(attributes.street).to.null();
        expect(attributes.street2).to.null();
        expect(attributes.city).to.null();
        expect(attributes.state).to.null();
        expect(attributes.zipcode).to.null();
        expect(attributes.country).to.null();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();


        // Confirm that a new address was created

        Db.knex('account')
        .where({ id })
        .first()
        .then((dbAccount) => {
          expect(dbAccount.address_id).to.be.null();

          done();
        });
      });
    });

    it(`400 bad request when attempting to partially create an address`, function (done) {
      const payload = {
        street: '23 Fail Bld.',
      };

      const options = {
        method: 'POST',
        url: `/account/${mAccountData.noAddress.id}`,
        headers: generateAuthHeaders(authTokenNoAddress),
        payload: structurePayload('account', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`200 when updating an account without any existing address attributes`, function (done) {
      const payload = {
        street: '23 Fail Bld.',
        street2: null,
        city: 'Howell',
        state: 'Michigan',
        zipcode: '48855',
        country: 'US',
      };

      const options = {
        method: 'POST',
        url: `/account/${mAccountData.noAddress.id}`,
        headers: generateAuthHeaders(authTokenNoAddress),
        payload: structurePayload('account', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { attributes } = response.result.data;

        expect(attributes.street).to.equal(payload.street);
        expect(attributes.street2).to.equal(payload.street2);
        expect(attributes.city).to.equal(payload.city);
        expect(attributes.state).to.equal(payload.state);
        expect(attributes.zipcode).to.equal(payload.zipcode);
        expect(attributes.country).to.equal('United States');

        done();
      });
    });

    it(`400 bad request when not sending ISO2 country codes`, function (done) {
      const payload = {
        street: '23 Fail Bld.',
        city: 'Lansing',
        state: 'Michigan',
        zipcode: '48811',
        country: 'United States',
      };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.noAddress.id}`,
        headers: generateAuthHeaders(authTokenNoAddress),
        payload: structurePayload('account', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });


    // NOTE(digia): mAccountData.noPhone initially doesn't have a phone or
    // address. By updating the phone, and address properties we'll create a
    // address, snapshotting the account's organization and phone, in addition
    // to using the address properties.
    it(`200 with the successfully updated account when an address was created`, function (done) {
      const payload = {
        organization: 'Now i have a phone',
        phone: '9991231234',
        street: '123 Created Ave.',
        city: 'Lansing',
        zipcode: '48910',
        state: 'Michigan',
        country: 'US',
      };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.noPhone.id}`,
        headers: generateAuthHeaders(authTokenNoPhone),
        payload: structurePayload('account', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(200);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('account');
        expect(id).to.be.a.string();

        expect(attributes.organization).to.equal(payload.organization);
        expect(attributes.phone).to.equal(payload.phone);
        expect(attributes.street).to.equal(payload.street);
        expect(attributes.street2).to.null();
        expect(attributes.city).to.equal(payload.city);
        expect(attributes.state).to.equal('Michigan');
        expect(attributes.zipcode).to.equal(payload.zipcode);
        expect(attributes.country).to.equal('United States');
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();


        // Confirm that a new address was created

        Db.knex('account')
        .where({ id })
        .first()
        .then((dbAccount) => {
          expect(dbAccount.address_id).to.be.a.string();

          done();
        });
      });
    });

    it(`400 when no update attributes are provided`, function (done) {
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.normal.id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('account', {}),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(400);

        done();
      });
    });

    it(`404 when attempting to update a soft deleted account`, function (done) {
      const attributes = {
        organization: 'Deleted',
      };
      const options = {
        method: 'POST',
        url: `/account/${mAccountData.deleted.id}`,
        headers: generateAuthHeaders(authTokenDeleted),
        payload: structurePayload('account', attributes),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });

    it(`404 when account doesn't exist`, function (done) {
      const payload = {
        organization: 'Still shouldn not have an address...',
      };
      const _id = Uuid.v4();
      const options = {
        method: 'POST',
        url: `/account/${_id}`,
        headers: generateAuthHeaders(authToken),
        payload: structurePayload('account', payload),
      };

      Server.inject(options, (response) => {
        expect(response.statusCode).to.equal(404);

        done();
      });
    });
  });
});

