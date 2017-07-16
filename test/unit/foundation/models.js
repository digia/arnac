// var BaseModelFactory = require('../../../app/foundation/models').BaseModelFactory;

/**describe('BaseModelFactory', function () {

  it('', function () {
    var config = {
      tablename: 'customer',
      fields: ['uuid', 'name', 'description']
    },
    input = {
      name: 'Jenny Co.',
      description: 'Sells merchandise',
      uuid: '2pzkyVZ',
    }

    var user = BaseModelFactory(config)(input);

    expect(user.get('name')).to.equal(input.name); 
  });
});
*/
