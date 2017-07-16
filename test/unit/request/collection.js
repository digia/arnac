import { RequestCollection } from '../../../src/request/collections';


describe('Request Collection', function () {
  it(`instantiates`, function (done) {
    const collection = RequestCollection.forge();

    expect(collection).to.exist();

    done();
  });

  describe('#makeRequestComment', function () {
    it(`Makes a request comment model`, function (done) {
      const attrs = {
        requestId: 1,
        userId: 1,
        message: 'This is a test, expect them up',
      };
      const requestComment = RequestCollection.forge().makeRequestComment(attrs);

      expect(requestComment).to.exist();
      expect(requestComment.get('id')).to.not.exist();
      expect(requestComment.get('commentableType')).to.equal('request');
      expect(requestComment.get('commentableId')).to.equal(attrs.requestId);
      expect(requestComment.get('userId')).to.equal(attrs.userId);
      expect(requestComment.get('message')).to.equal(attrs.message);

      done();
    });

    it(`Allows id to be passed in`, function (done) {
      const attrs = {
        requestId: 1,
        userId: 1,
        message: 'This is a test, expect them up',
        id: 1,
      };
      const requestComment = RequestCollection.forge().makeRequestComment(attrs);

      expect(requestComment).to.exist();
      expect(requestComment.get('id')).to.equal(attrs.id);
      expect(requestComment.get('commentableType')).to.equal('request');
      expect(requestComment.get('commentableId')).to.equal(attrs.requestId);
      expect(requestComment.get('userId')).to.equal(attrs.userId);
      expect(requestComment.get('message')).to.equal(attrs.message);

      done();
    });
  });
});
