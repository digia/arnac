import AbstractError from 'node-custom-errors';


export const PaymentBlockError = AbstractError.create('Payment Block Error');

export const PaymentMethodError = AbstractError.create('Payment Method Error');

export const ChargeCardError = AbstractError.create('Charge Card Error');

export const ChargeCardDeclinedError = AbstractError.create('Charge Card Declined Error');

export const ChargeCardFraudulentError = AbstractError.create('Charge Card Fraudulent Error');

export const ChargeCardCVCError = AbstractError.create('Charge Card CVC Error');

export const ChargeCardExpirationError = AbstractError.create('Charge Card Expiration Error');

export const ChargeCardProcessingError = AbstractError.create('Charge Card Processing Error');

export const BlockAccountError = AbstractError.create('Block Account Error');

export const BlockExpirationError = AbstractError.create('Block Account Error');

export const BlockExhuastedError = AbstractError.create('Block Account Error');

export const RefundAmountError = AbstractError.create('Refund Amount Error');
