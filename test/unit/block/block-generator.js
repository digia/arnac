import { Account } from '../../../src/account/models';
import { Invoice } from '../../../src/invoice/models';
import * as Models from '../../../src/block/models';
import * as Collections from '../../../src/block/collections';
import BlockGenerator from '../../../src/block/block-generator';


describe('Block Generator', function () {
  it(`instantiates`, function (done) {
    const model = {
      tableName: 'block',
      forge() {
        return this;
      }
    };
    const BlockCollection = {
      model,
      forge() {
        return this;
      }
    };


    // Test

    const generator = BlockGenerator({ Knex: {}, BlockCollection });

    expect(generator).to.exist();

    done();
  });

  describe('#generate', function () {
    it(`generates blocks based on an amount and account id`, function (done) {
      const model = {
        tableName: 'block',
        forge() {
          return this;
        },
        get() {
          return 1;
        },
      };
      const BlockCollection = {
        model,
        forge() {
          return this;
        }
      };
      const Knex = function () {
        return {
          returning() {
            return this;
          },
          insert() {
            return Promise.resolve();
          },
          whereIn() {
            return Promise.resolve('blocks');
          },
        };
      }

      // Test

      const generator = BlockGenerator({ Knex, BlockCollection });

      // amount, accountId, generator model
      generator.generate(3, 1, model)
      .then((blocks) => {

        expect(blocks).to.be.equal(BlockCollection);

        done();
      });
    });
  });

  describe('#fromInvoice', function () {
    /*
     * FIXME(digia): Finalize tests for `BlockGenerator.fromInvoice`
     *
    it(`generates blocks from an invoice`, function (done) {
      const model = {
        tableName: 'block',
        forge() {
          return this;
        },
        get(key) {
          if (key === 'id') return 1;
          if (key === 'paid') return true;
        },
      };
      const BlockCollection = {
        model,
        forge() {
          return this;
        }
      };
      const Knex = function () {
        return {
          returning() {
            return this;
          },
          insert() {
            return Promise.resolve();
          },
          whereIn() {
            return Promise.resolve('blocks');
          },
        };
      }

      const generator = BlockGenerator();

      generator.fromInvoice(model)
      .then((blocks) => {

        done();
      })
      .catch((err) => {
        console.log(err);
      });

    });
    */
  });
});
