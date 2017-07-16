import _ from 'lodash';
import Async from 'async';
import Uuid from 'node-uuid';
import {
  db,
  server,
  refreshDb,
  uuidList,
  generateAuthHeaders,
  generateAuthToken,
  createRegistration,
} from '../../helpers';


const mAccountIdList = uuidList(3);
const mUserIdList = uuidList(3);
const mRequestIdList = uuidList(8);
const mRequestCommentIdList = uuidList(8);
let authToken;
let authTokenAccount2;
let authTokenUser3; // On the same account as authToken

before(() => {
  return Promise.all([
    generateAuthToken({ accountId: mAccountIdList[0], userId: mUserIdList[0] }).then(t => authToken = t),
    generateAuthToken({ accountId: mAccountIdList[1], userId: mUserIdList[1] }).then(t => authTokenAccount2 = t),
    generateAuthToken({ accountId: mAccountIdList[0], userId: mUserIdList[2] }).then(t => authTokenUser3 = t)
  ]);
});


describe('Request Comment - Get - GET /request-comment/{id}', function () {
  let mAccount;
  let mAccount2;
  let mUser;
  let mUser2;
  let mRequestList;
  let mRequestCommentList;

  const mRequestListData = {
    // Estimate
    estimate: {
      id: mRequestIdList[0],
      state: 1,
      previous_state: 0,
      subject: 'Estimate Stage',
      body: '<p>Request has been submitted and either has an estimate or is awaiting one.</p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
    },
    // Deleted
    deleted: {
      id: mRequestIdList[1],
      state: 0,
      subject: 'This is a deleted request',
      body: '<p>Boop, bob, beep</p>',
      account_id: mAccountIdList[0],
      deleted_at: new Date(),
    }
  };

  const mRequestCommentListData = {
    // Available
    available: {
      id: mRequestCommentIdList[0],
      message: 'I am a available request comment',
      user_id: mUserIdList[0],
      commentable_id: mRequestIdList[0],
      commentable_type: 'request',
    },
    // Deleted
    deleted: {
      id: mRequestCommentIdList[1],
      message: 'I am a deleted request comment',
      user_id: mUserIdList[0],
      commentable_id: mRequestIdList[0],
      commentable_type: 'request',
      deleted_at: new Date(),
    },
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
        ]);
      })
      .then(() => {
        const data = _.values(mRequestListData);

        return db.create('request', data).then(requestList => mRequestList = requestList);
      })
      .then(() => {
        const data = _.values(mRequestCommentListData);

        return db.create('comment', data).then(requestCommentList => mRequestCommentList = requestCommentList);
      });
  });

  it(`401 if client is not authorized`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment/${mRequestCommentListData.available.id}`,
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if account id of the request doesn't match the authToken account id`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment/${mRequestCommentListData.available.id}`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`200 if successfully returns the request comment`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment/${mRequestCommentListData.available.id}?include=user`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;

        expect(included).to.be.length(1);

        const { type, id, attributes, relationships } = data;

        expect(type).to.be.a.string().and.equal('request-comment');
        expect(id).to.be.a.string();

        expect(attributes.message).to.be.a.string();
        expect(attributes.createdAt).to.be.a.string();
        expect(attributes.updatedAt).to.be.a.string();
        expect(attributes.deletedAt).to.be.null();

        expect(relationships.user.data).to.exist();
      });
  });

  it(`200 if successfully returns the soft deleted request comment`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment/${mRequestCommentListData.deleted.id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { attributes } = response.result.data;

        expect(attributes.deletedAt).to.be.a.string();
      });
  });

  it(`200 if successfully returns the request comment when requested by another user who's attached to the same account`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment/${mRequestCommentListData.available.id}`,
      headers: generateAuthHeaders(authTokenUser3),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
      });
  });

  it(`404 if requested comment doesn't exist`, function () {
    const _id = Uuid.v4();
    const options = {
      method: 'GET',
      url: `/request-comment/${_id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(404);
      });
  });
});
