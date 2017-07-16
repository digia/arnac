import { Block } from '../../../src/block/models';


describe('Block Model', function () {
  it(`instantiated as a draft`, function (done) {
    const block = Block.forge();

    expect(block).to.exist();

    done();
  });
});
