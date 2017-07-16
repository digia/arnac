import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import {
  db,
  server,
  uuidList,
  refreshDb,
  generateAuthHeaders,
  generateAuthToken,
  structurePayload,
  structureRelationshipPayload,
  createUser,
  createRegistration,
} from '../../helpers';


const mAccountIdList = uuidList(3);
const mUserIdList = uuidList(3);
const mRequestIdList = uuidList(8);
let authToken;
let authTokenAccount2;
let authTokenUser3;

before(() => {
  return Promise.all([
    generateAuthToken({ accountId: mAccountIdList[0], userId: mUserIdList[0] }).then(t => authToken = t),
    generateAuthToken({ accountId: mAccountIdList[1], userId: mUserIdList[1] }).then(t => authTokenAccount2 = t),
    generateAuthToken({ accountId: mAccountIdList[0], userId: mUserIdList[2] }).then(t => authTokenUser3 = t)
  ]);
});

describe('Request Comment - Create - POST /request-comment', function () {
  let mAccount;
  let mAccount2;
  let mUser;
  let mUser2;
  let mUser3;
  let mRequestList;

  const mRequestListData = {
    // Draft
    draft: {
      id: mRequestIdList[0],
      state: 0,
      subject: 'Draft Stage',
      body: '<p>Our website is broke, need you to fix it please</p>',
      account_id: mAccountIdList[0],
    },
    // Estimate
    estimate: {
      id: mRequestIdList[1],
      state: 1,
      previous_state: 0,
      subject: 'Estimate Stage',
      body: '<p>Request has been submitted and either has an estimate or is awaiting one.</p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
    },
    // Hold
    hold: {
      id: mRequestIdList[2],
      state: 2,
      previous_state: 3,
      subject: 'Hold Stage',
      body: '<p>Request has an accepted estimate, and has blocks attached. Though it is not queued.</p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
      held_at: new Date(),
      queued_at: new Date(),
    },
    // Queue
    queue: {
      id: mRequestIdList[3],
      state: 3,
      previous_state: 1,
      subject: 'Queue Stage',
      body: '<p>Request is ready to be worked on.</p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
      queued_at: new Date(),
    },
    // Processing
    processing: {
      id: mRequestIdList[4],
      state: 4,
      previous_state: 3,
      subject: 'Processing Stage',
      body: '<p>Request is being worked on.</p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
      queued_at: new Date(),
    },
    // Review
    review: {
      id: mRequestIdList[5],
      state: 5,
      previous_state: 4,
      subject: 'Review Stage',
      body: '<p>Request is done being worked on and is awaiting client review and confirmation.</p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
      queued_at: new Date(),
      reviewable_at: new Date(),
    },
    // Complete
    complete: {
      id: mRequestIdList[6],
      state: 6,
      previous_state: 5,
      subject: 'Complete Stage',
      body: '<p>Request is complete.</p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
      queued_at: new Date(),
      reviewable_at: new Date(),
      completed_at: new Date(),
    },
    // Deleted
    deleted: {
      id: mRequestIdList[7],
      state: 0,
      subject: 'This is a deleted request',
      body: '<p>Boop, bob, beep</p>',
      account_id: mAccountIdList[0],
      deleted_at: new Date(),
    }
  };

  before(() => {
    return refreshDb()
      .then(() => {
        return Promise.all([
          createRegistration({
            account: { id: mAccountIdList[0], }, user: { id: mUserIdList[0] },
          })
            .then(({ account, user }) => {
              mAccount = account;
              mUser = user;
            }),
          createRegistration({
            account: { id: mAccountIdList[1], }, user: { id: mUserIdList[1] },
          })
            .then(({ account, user }) => {
              mAccount2 = account;
              mUser2 = user;
            }),
          createUser({ account_id: mAccountIdList[0], id: mUserIdList[2] }).then(u => mUser3 = u),
        ]);
      })
      .then(() => {
        const data = _.values(mRequestListData);

        db.create('request', data).then(requestList => mRequestList = requestList);
      })
  });

  it(`401 if client is not authorized`, function () {
    const payload = { message: 'This is my amazing comment' };
    const relationships = {
      ...structureRelationshipPayload('user', mUser.id),
      ...structureRelationshipPayload('request', mRequestListData.estimate.id),
    };

    const options = {
      method: 'POST',
      url: `/request-comment`,
      payload: structurePayload('request-comment', payload, relationships),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if account id of the request doesn't match the authToken account id`, function () {
    const payload = { message: 'This is my amazing comment' };
    const relationships = {
      ...structureRelationshipPayload('user', mUser.id),
      ...structureRelationshipPayload('request', mRequestListData.estimate.id),
    };

    const options = {
      method: 'POST',
      url: `/request-comment`,
      headers: generateAuthHeaders(authTokenAccount2),
      payload: structurePayload('request-comment', payload, relationships),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if user id doesn't match the authToken user id`, function () {
    const payload = { message: 'This is my amazing comment' };
    const relationships = {
      ...structureRelationshipPayload('user', mUser.id),
      ...structureRelationshipPayload('request', mRequestListData.estimate.id),
    };

    const options = {
      method: 'POST',
      url: `/request-comment`,
      headers: generateAuthHeaders(authTokenUser3),
      payload: structurePayload('request-comment', payload, relationships),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`422 if the request doesn't exist`, function () {
    const payload = { message: 'This is my amazing comment' };
    const relationships = {
      ...structureRelationshipPayload('user', mUser.id),
      ...structureRelationshipPayload('request', mRequestListData.deleted.id),
    };

    const options = {
      method: 'POST',
      url: `/request-comment`,
      headers: generateAuthHeaders(authToken),
      payload: structurePayload('request-comment', payload, relationships),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(422);
      });
  });

  it(`422 if the user doesn't exist`, function () {
    const _id = Uuid.v4();
    const payload = { message: 'This is my amazing comment' };

    const relationships = {
      ...structureRelationshipPayload('user', _id),
      ...structureRelationshipPayload('request', mRequestListData.deleted.id),
    };

    const options = {
      method: 'POST',
      url: `/request-comment`,
      headers: generateAuthHeaders(authToken),
      payload: structurePayload('request-comment', payload, relationships),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(422);
      });
  });

  it(`200 if successfully creates a new request comment`, function () {
    const payload = { message: 'This is my amazing comment' };
    const relationships = {
      ...structureRelationshipPayload('user', mUser.id),
      ...structureRelationshipPayload('request', mRequestListData.estimate.id),
    };

    const options = {
      method: 'POST',
      url: `/request-comment`,
      headers: generateAuthHeaders(authToken),
      payload: structurePayload('request-comment', payload, relationships),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(201);

        const { type, id, attributes } = response.result.data;

        expect(type).to.be.a.string().and.equal('request-comment');
        expect(id).to.be.a.string();

        expect(attributes.message).to.equal(payload.message).and.be.a.string();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();
      });
  });

  it(`200 if successfully creates a new request comment using a premade id`, function () {
    const _id = Uuid.v4();
    const payload = { message: 'This is my amazing comment' };

    const relationships = {
      ...structureRelationshipPayload('user', mUser.id),
      ...structureRelationshipPayload('request', mRequestListData.estimate.id),
    };

    const options = {
      method: 'POST',
      url: `/request-comment`,
      headers: generateAuthHeaders(authToken),
      payload: structurePayload({ type: 'request-comment', _id }, payload, relationships),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(201);

        const { id } = response.result.data;

        expect(id).to.equal(id).and.be.a.string();
      });
  });

  it(`200 if successfully creates a new request comment on a completed request`, function () {
    const payload = { message: 'This is my amazing comment' };
    const relationships = {
      ...structureRelationshipPayload('user', mUser.id),
      ...structureRelationshipPayload('request', mRequestListData.complete.id),
    };

    const options = {
      method: 'POST',
      url: `/request-comment`,
      headers: generateAuthHeaders(authToken),
      payload: structurePayload('request-comment', payload, relationships),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(201);
      });
  });

  it(`409 if request is in draft state`, function () {
    const payload = { message: 'This is my amazing comment' };
    const relationships = {
      ...structureRelationshipPayload('user', mUser.id),
      ...structureRelationshipPayload('request', mRequestListData.draft.id),
    };

    const options = {
      method: 'POST',
      url: `/request-comment`,
      headers: generateAuthHeaders(authToken),
      payload: structurePayload('request.comment', payload, relationships),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(409);
      });
  });
});
