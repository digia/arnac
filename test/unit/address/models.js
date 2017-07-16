import { Account } from '../../../src/account/models';
import { Address } from '../../../src/address/models';
import { Invoice } from '../../../src/invoice/models';
import { InputError } from '../../../src/foundation/errors';


describe('Address Model', function () {
  it(`instantiated as a draft`, function (done) {
    const address = Address.forge();

    expect(address).to.exist();

    done();
  });

  it(`has many accounts`, function (done) {
    const address = Address.forge();

    expect(address.accounts().relatedData.type).to.equal('hasMany');

    done();
  });

  it(`has many invoices`, function (done) {
    const address = Address.forge();

    expect(address.invoices().relatedData.type).to.equal('hasMany');

    done();
  });

  // NOTE(digia): These are technically testing the model-factory.
  // Need to test the model factory, no time.
  describe('#serialize', function () {
    it(`applies null to undefined attributes with the nullify option`, function (done) {
      const attributes = {
        street: '123 Testing',
        city: 'Lansing',
        state: 'MI',
        zipcode: '48911',
        country: 'USA',
      };
      const address = Address.forge(attributes);

      const json = address.toJSON({ nullify: true })

      expect(json.street).to.equal(attributes.street);
      expect(json.city).to.equal(attributes.city);
      expect(json.state).to.equal(attributes.state);
      expect(json.zipcode).to.equal(attributes.zipcode);
      expect(json.country).to.equal(attributes.country);
      expect(json.organization).to.be.null();
      expect(json.phone).to.be.null();

      done();
    });

    it(`should throw an error if no rules are set when using the nullify option `, function (done) {
      const attributes = {
        street: '123 Testing',
        city: 'Lansing',
        state: 'MI',
        zipcode: '48911',
        country: 'USA',
      };
      const address = Address.forge(attributes);

      address.rules = void 0;

      function fn() {
        address.toJSON({ nullify: true })
      }

      expect(fn).to.throw(Error);

      done();
    });

    it(`omits all of the fields passed in the options`, function (done) {
      const attributes = {
        street: '123 Testing',
        city: 'Lansing',
        state: 'MI',
        zipcode: '48911',
        country: 'USA',
      };
      const address = Address.forge(attributes);

      const json = address.toJSON({ exclude: ['city', 'state', 'zipcode', 'country'] })

      expect(json.street).to.equal(attributes.street);
      expect(json.city).to.be.undefined()
      expect(json.state).to.be.undefined()
      expect(json.zipcode).to.be.undefined()
      expect(json.country).to.be.undefined()

      done();
    });

  });

  describe('#handleSavingCountryISO', function () {
    it(`converts any country full names into Iso2 abbreviations`, function (done) {
      const address = Address.forge();

      address.set('country', 'United States');

      address.handleSavingCountryISO(address)
      .then(() => {
        expect(address.get('country')).to.equal('US');

        done();
      });
    });

    it(`converts country iso3 into iso2 abbreviations`, function (done) {
      const address = Address.forge();

      address.set('country', 'USA');

      address.handleSavingCountryISO(address)
      .then(() => {
        expect(address.get('country')).to.equal('US');

        done();
      });
    });

    it(`throws when the country isn't set`, function (done) {
      const address = Address.forge();

      address.handleSavingCountryISO(address)
      .catch((err) => {
        expect(err).to.be.instanceof(InputError);

        done();
      });
    });

    it(`throws when the country name doesn't exist`, function (done) {
      const address = Address.forge();

      address.set('country', 'Dont Exist');

      address.handleSavingCountryISO(address)
      .catch((err) => {
        expect(err).to.be.instanceof(InputError);

        done();
      });
    });
  });

  describe('#handleSavingStateISO', function () {
    it(`converts any US state full names into Iso2 abbreviations`, function (done) {
      const address = Address.forge();

      address.set('country', 'US');
      address.set('state', 'Michigan');

      address.handleSavingStateISO(address)
      .then(() => {
        expect(address.get('state')).to.equal('MI');

        done();
      });
    });

    it(`enforces an all capital state ISO`, function (done) {
      const address = Address.forge();

      address.set('country', 'US');
      address.set('state', 'mi');

      address.handleSavingStateISO(address)
      .then(() => {
        expect(address.get('state')).to.equal('MI');

        done();
      });
    });

    it(`allows misspelled state names - unfortunately`, function (done) {
      const address = Address.forge();

      address.set('country', 'US');
      address.set('state', 'Michgan');

      address.handleSavingStateISO(address)
      .then(() => {
        expect(address.get('state')).to.equal('Michgan');

        done();
      });
    });

    it(`will all country handler if country format is incorrect`, function (done) {
      const address = Address.forge();

      address.set('country', 'United States');
      address.set('state', 'Michgan');

      address.handleSavingStateISO(address)
      .then(() => {
        expect(address.get('country')).to.equal('US');
        expect(address.get('state')).to.equal('Michgan');

        done();
      });
    });

    it(`throws when the country doesn't exist`, function (done) {
      const address = Address.forge();

      address.handleSavingStateISO(address)
      .catch((err) => {
        expect(err).to.be.instanceof(InputError);

        done();
      });
    });

    it(`throws when the state doesn't exist`, function (done) {
      const address = Address.forge();

      address.set('country', 'US');

      address.handleSavingStateISO(address)
      .catch((err) => {
        expect(err).to.be.instanceof(InputError);

        done();
      });
    });
  });

  describe('#handleSavingCountryAndState', function () {
    it(`will call both country and state handlers`, function (done) {
      const address = Address.forge();

      address.set('country', 'United States');
      address.set('state', 'Michigan');

      address.handleSavingCountryAndState(address)
      .then(() => {
        expect(address.get('country')).to.equal('US');
        expect(address.get('state')).to.equal('MI');

        done();
      });
    });
  });
});

