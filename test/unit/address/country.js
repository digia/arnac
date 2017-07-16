import { NotImplementedError, InputError } from '../../../src/foundation/errors';
import Country from '../../../src/address/country';


describe('Country', function () {
  it(`instantiates`, function (done) {
    const country = Country({});

    expect(country).to.exist();

    done();
  });

  describe('#info', function () {
    it(`returns all of the available information for a specified country`, function (done) {
      const data = {
        info(iso2) {
          return {};
        }
      };
      const country = Country(data);

      expect(country.info('US')).to.be.an.object();

      done();
    });
  });

  describe('#name', function () {
    it(`returns full name of an iso2 specified country`, function (done) {
      const data = {
        name(iso2) {
          return 'United States';
        }
      };
      const country = Country(data);

      expect(country.name('US')).to.equal('United States');

      done();
    });
  });

  describe('#isoCode', function () {
    it(`returns iso2 code of the specified country`, function (done) {
      const country = Country();

      expect(country.isoCode('United States')).to.equal('US');

      done();
    });

    it(`returns iso3 code of the specified country`, function (done) {
      const country = Country();

      expect(country.isoCode('United States', 3)).to.equal('USA');

      done();
    });

    it(`throws InputError when country does not exist`, function (done) {
      const country = Country();

      function throws() {
        country.isoCode('Dont Exist');
      }
      expect(throws).to.throw(InputError);

      done();
    });
  });

  describe('#iso2To3', function () {
    it(`converts iso2 country into iso3`, function (done) {
      const data = {
        ISOcodes() {
          return { '3': 'USA' };
        }
      };
      const country = Country(data);

      expect(country.iso2To3('US')).to.equal('USA');

      done();
    });
  });

  describe('#iso3To2', function () {
    it(`converts iso3 country into iso2`, function (done) {
      const data = {
        ISOcodes() {
          return { '2': 'US' };
        }
      };
      const country = Country(data);

      expect(country.iso3To2('USA')).to.equal('US');

      done();
    });
  });

  describe('#states', function () {
    it(`returns all states/provinces of an iso2 specified country`, function (done) {
      const data = {
        states(iso2) {
          return ['Michigan'];
        }
      };
      const country = Country(data);

      expect(country.states('US')[0]).to.equal('Michigan');

      done();
    });
  });

  describe('#stateName', function () {
    it(`returns the full name of a state from it's Iso2 format`, function (done) {
      const country = Country();

      expect(country.stateName('US', 'MI')).to.equal('Michigan');

      done();
    });

    it(`returns the full name of a state from it's oddly typed Iso2 format`, function (done) {
      const country = Country();

      expect(country.stateName('US', 'mI')).to.equal('Michigan');

      done();
    });

    it(`throws NotImplementedError when attempting to get the stateName of a non US country`, function (done) {
      const country = Country();

      function throws() {
        country.stateName('UK', 'MI')
      }
      expect(throws).to.throw(NotImplementedError);

      done();
    });
  });

  describe('#stateISO', function () {
    it(`returns the iso2 of a state from it's full name`, function (done) {
      const country = Country();

      expect(country.stateISO('US', 'Michigan')).to.equal('MI');

      done();
    });

    it(`returns the iso2 of a state from it's oddly typed full name`, function (done) {
      const country = Country();

      expect(country.stateISO('US', 'miChigan')).to.equal('MI');

      done();
    });

    it(`throws NotImplementedError when attempting to get the stateIso of a non US country`, function (done) {
      const country = Country();

      function throws() {
        country.stateISO('UK', 'Michigan')
      }
      expect(throws).to.throw(NotImplementedError);

      done();
    });
  });
});
