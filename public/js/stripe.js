import axios from 'axios'
import keys from '../../keys'
import { showAlert } from './alerts'

const stripe = Stripe(keys.stripeKey)

export const bookTour = async tourId => {
    try {
    /* 1) Get checkout session from API */
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`)

    /* 2) Create checkout form + charge credit card */
    await stripe.redirectToCheckout({
        sessionId: session.data.session.id
    })
    }
    catch (err) {
        console.log(err)
        showAlert('error', err)
    }
}; 