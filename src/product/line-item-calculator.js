import {
  uniq as Uniq,
  filter as Filter,
  reduce as Reduce,
  map as Mapp,
} from 'lodash';


export function getCurrencyList(itemList) {
  return Uniq(Mapp(itemList, 'currency'));
}

export default function lineItemCalculator(itemList) {
  function subtotalFor(currency) {
    const currencyItemList = Filter(itemList, { currency });

    if (!currencyItemList.length) {
      return 0;
    }

    return Reduce(currencyItemList, (total, item) => total + (item.amount * item.quantity), 0);
  }

  function subtotal() {
    if (!itemList.length) {
      return {};
    }

    const subtotals = {};
    const currencyList = getCurrencyList(itemList);

    for (let i = 0, il = currencyList.length; i < il; ++i) {
      const currency = currencyList[i];
      subtotals[currency] = subtotalFor(currency);
    }

    return subtotals;
  }

  return { getCurrencyList, subtotalFor, subtotal };
}
