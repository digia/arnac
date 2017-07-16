import Serializer, {
  Registry,
} from 'jaysonapi';


export const Payment = Serializer('payment', {
  attributes: [
    'method', 'amount', 'currency', 'chargeId', 'chargeGateway', 'note',
    'createdAt',
  ],
});

Registry.register('Payment', Payment);
