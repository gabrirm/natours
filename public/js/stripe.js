/* eslint-disable */
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { showAlert } from './alerts';

export const bookTour = async tourId => {
  const stripe = await loadStripe(
    'pk_test_51NiLoDDxu7Z3jeIYCJ0p2e7pn2RQsT7c6rzmQexnBervYgjlwJ6CDYopTFs1dEP8RtTCC42DbvHwoEELjkfmZxAZ00NgqhKPvT'
  );
  // 1) get checkout session from API
  try {
    const session = await axios(`http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`)
    
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    showAlert('error', 'Something went wrong!');
  }
  // 2) create checkout form + credit card
};
