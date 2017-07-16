import { OrderMediator } from '../../../src/order/mediators';
import { StateError, InputError } from '../../../src/foundation/errors';


describe('Order Mediator', function () {
  it(`instantiated`, function (done) {
    const orderMediator = OrderMediator();

    expect(orderMediator).to.exist();

    done();
  });

  describe('Approve', function () {
    it(`throws state error if order is a draft`, function () {
      const mOrder = {
        related() {
          return [];
        },
        isDraft() {
          return true;
        },
      };

      return OrderMediator().approve(mOrder)
        .catch((err) => {
          expect(err).to.instanceof(StateError);
        });
    });

    it(`throws state error if order doesn't have any orderItems`, function () {
      const mOrder = {
        related() {
          return [];
        },
        isDraft() {
          return false;
        },
      };

      return OrderMediator().approve(mOrder)
        .catch((err) => {
          expect(err).to.instanceof(StateError);
        });
    });

    it(`throws state error if order is already approved`, function () {
      const mOrder = {
        related() {
          return [1];
        },
        isDraft() {
          return false;
        },
        isApproved() {
          return true;
        },
      };

      return OrderMediator().approve(mOrder)
        .catch((err) => {
          expect(err).to.instanceof(StateError);
        });
    });

    it(`throws state error if order is already invoiced`, function () {
      const mOrder = {
        related() {
          return [1];
        },
        isDraft() {
          return false;
        },
        isApproved() {
          return false;
        },
        isInvoiced() {
          return true;
        },
      };

      return OrderMediator().approve(mOrder)
        .catch((err) => {
          expect(err).to.instanceof(StateError);
        });
    });
  });

  describe('Reject', function () {
    it(`throws state error if order is outside of the pending state`, function () {
      const mOrder = {
        isPending() {
          return false;
        }
      };

      return OrderMediator().reject(mOrder)
        .catch((err) => {
          expect(err).to.instanceof(StateError);
        });
    });

    it(`updates a order to the rejected state`, function () {
      const mOrder = {
        isPending() {
          return true;
        },
        save(attributes, opts) {
          return Promise.resolve(true);
        }
      };

      return OrderMediator().reject(mOrder)
        .then((updatedOrder) => {
          expect(updatedOrder).to.equal(true);
        });
    });

    it(`allows for a transaction to be passed in`, function () {
      const mOrder = {
        isPending() {
          return true;
        },
        save(attributes, opts) {
          return Promise.resolve(opts);
        }
      };

      return OrderMediator().reject(mOrder, { transacting: true })
        .then((opts) => {
          expect(opts.patch).to.equal(true);
          expect(opts.transacting).to.equal(true);
        });
    });
  });
});
