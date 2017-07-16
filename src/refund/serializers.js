import Serializer, {
  Registry,
} from 'jaysonapi';


export const Refund = Serializer('refund', {
  attributes: [
    'method', 'amount', 'currency', 'refundId', 'refundGateway', 'reason',
    'createdAt',
  ],
});

Registry.register('Refund', Refund);
