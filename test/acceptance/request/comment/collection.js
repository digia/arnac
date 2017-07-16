import _ from 'lodash';
import Async from 'async';
import Moment from 'moment';
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

describe('Request Comment - Collection - GET /request-comment?filter[requestId]=', function () {
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
    // Queue
    queue: {
      id: mRequestIdList[1],
      state: 2,
      previous_state: 1,
      subject: 'Queue Stage',
      body: '<p></p>',
      account_id: mAccountIdList[0],
      submitted_at: new Date(),
    },
    // Deleted
    deleted: {
      id: mRequestIdList[2],
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
      created_at: new Date(),
    },
    // Available - Post Dated
    availablePre: {
      id: mRequestCommentIdList[1],
      message: 'I am a available request comment',
      // NOTE(digia): This user's account doesn't match. Doesn't matter for test
      user_id: mUserIdList[1],
      commentable_id: mRequestIdList[0],
      commentable_type: 'request',
      created_at: Moment().subtract(3, 'days').format(),
    },
    // Deleted
    deleted: {
      id: mRequestCommentIdList[2],
      message: 'I am a deleted request comment',
      user_id: mUserIdList[0],
      commentable_id: mRequestIdList[0],
      commentable_type: 'request',
      created_at: new Date(),
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

        db.create('request', data).then(requestList => mRequestList = requestList);
      })
      .then(() => {
        const data = _.values(mRequestCommentListData);

        db.create('comment', data).then(requestCommentList => mRequestCommentList = requestCommentList);
      });
  });

  it(`401 if client is not authorized`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment?filter[requestId]=${mRequestListData.estimate.id}`,
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`401 if account id of the request doesn't match the authToken account id`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment?filter[requestId]=${mRequestListData.estimate.id}`,
      headers: generateAuthHeaders(authTokenAccount2),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(401);
      });
  });

  it(`200 if successfully returns the request comment collection`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment?filter[requestId]=${mRequestListData.estimate.id}&include=user,request`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;

        expect(data).to.be.length(2);
        expect(included).to.be.length(3); // 2 users, 1 request

        const includedUsers = included.filter(i => i.type === 'user');
        const includedRequest = included.filter(i => i.type === 'request');

        expect(includedUsers).to.be.length(2);
        expect(includedRequest).to.be.length(1);


        expect(data[0].id).to.equal(mRequestCommentListData.availablePre.id);
        expect(data[1].id).to.equal(mRequestCommentListData.available.id);
      });
  });

  it(`200 if successfully returns the request comment collection including deleted`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment?filter[requestId]=${mRequestListData.estimate.id}&filter[deleted]=true`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(3);
      });
  });

  it(`200 if successfully returns the request comment collection filtered by user`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment?filter[requestId]=${mRequestListData.estimate.id}&filter[userId]=${mUserIdList[1]}&include=user`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data, included } = response.result;

        expect(data).to.be.length(1);

        expect(included[0].id).to.equal(mUserIdList[1]);
      });
  });

  it(`200 if successfully returns a empty request comment collection`, function () {
    const options = {
      method: 'GET',
      url: `/request-comment?filter[requestId]=${mRequestListData.queue.id}`,
      headers: generateAuthHeaders(authToken),
    };

    return server.inject(options)
      .then((response) => {
        expect(response.statusCode).to.equal(200);

        const { data } = response.result;

        expect(data).to.be.length(0);
      });
  });
});
