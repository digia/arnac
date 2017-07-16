import AbstractError from 'node-custom-errors';


export const InvoiceOpenError = AbstractError.create('Invoice Open Error');

export const InvoicePaidError = AbstractError.create('Invoice Paid Error');

export const InvoiceClosedError = AbstractError.create('Invoice Closed Error');

export const InvoicePaymentRelationError = AbstractError.create('Invoice Payment Relation Error');

export const InvoicePaymentCurrencyError = AbstractError.create('Invoice Payment Currency Error');

export const InvoiceItemRelationshipError = AbstractError.create('Invoice Item Relationship Error');
