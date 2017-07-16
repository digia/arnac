import CollectionFactory from '../../../src/foundation/collection-factory';


describe('CollectionFactory', function () {

  it(`should initialize`, function (done) {
    const factory = CollectionFactory({});

    expect(factory).to.exist();

    done();
  });

  it(`fails when a model isn't passed in`, function (done) {
    function throws() {
      const factory = CollectionFactory();
    }

    expect(throws).to.throw(Error);

    done();
  });

  it(`created a bookshelf db collection`, function (done) {
    const factory = CollectionFactory({});

    expect(factory.forge).to.be.a.function();

    done();
  });
});
