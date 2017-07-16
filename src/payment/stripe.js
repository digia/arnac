import Stripe from 'stripe';
import Config from 'config';


export default Stripe(Config.get('stripe.secretKey'));
