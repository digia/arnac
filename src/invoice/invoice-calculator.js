import {
  filter as Filter,
  reduce as Reduce,
} from 'lodash';
import LineItemCalculator, { getCurrencyList } from '../product/line-item-calculator';


export default function invoiceCalculator(itemList) {
  const { subtotalFor, subtotal } = LineItemCalculator(itemList);

  function amountDueFor(currency, paymentList) {
    // TODO(digia): This needs to get totalFor when discounts/coupons are implemented
    const amountDueMinimum = 0;
    const total = subtotalFor(currency);

    if (!total || !paymentList.length) {
      return total;
    }

    const totalAmountPaid = Reduce(paymentList, (accumulation, payment) => {
      return accumulation + payment.amount;
    }, 0);
    const totalAmountDue = total - totalAmountPaid;

    if (amountDueMinimum >= totalAmountDue) {
      return 0;
    }

    return totalAmountDue;
  }

  function amountDue(paymentList) {
    if (!itemList.length) {
      return {};
    }

    const amountDues = {};
    const currencyList = getCurrencyList(itemList);

    for (let i = 0, il = currencyList.length; i < il; ++i) {
      const currency = currencyList[i];
      const currencyPaymentList = Filter(paymentList, { currency });
      amountDues[currency] = amountDueFor(currency, currencyPaymentList);
    }

    return amountDues;
  }

  return { subtotalFor, subtotal, amountDueFor, amountDue };
}
