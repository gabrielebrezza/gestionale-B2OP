const paypal = require('paypal-rest-sdk');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

const bookings = require('./../DB/bookings.js');

paypal.configure({
    mode: process.env.PAYPAL_MODE,
    client_id: process.env.PAYPAL_PUBLIC,
    client_secret: process.env.PAYPAL_SECRET
});

async function createPaypal(price, bookId, custom = {}){
    const create_payment_json = {
        intent: "sale",
        payer: {
            payment_method: "paypal"
        },
        redirect_urls: {
            return_url: `${process.env.SERVER_URL}/success/paypal`,
            cancel_url: `${process.env.SERVER_URL}/cancel?method=paypal&bookingId=${bookId}`,
        },
        transactions: [
            {
                item_list: {
                    items: [
                        {
                            name: 'Noleggio Veicolo',
                            sku: 1,
                            price: price,
                            currency: "EUR",
                            quantity: 1
                        }
                    ]
                },
                amount: {
                    currency: "EUR",
                    total: price
                },
                custom: JSON.stringify(custom),
                description: 'Noleggio Veicolo presso CarMunfrà'
            }
        ]
    }; 
    return new Promise((resolve, reject) => {
        paypal.payment.create(create_payment_json, async (error, payment) => {
            if (error) {
                reject(error.response.details);
            } else {
                for (let i = 0; i < payment.links.length; i++) {
                    if (payment.links[i].rel === "approval_url") {
                        const expiration = new Date();
                        expiration.setMinutes(expiration.getMinutes() + 15);
                        await bookings.findOneAndUpdate({ "_id": bookId }, { "payment": {"state": 'pending', "id": payment.id, "method": 'paypal', "expiration": expiration}});
                        resolve(payment.links[i].href);
                    }
                }
            }
        });
    });
}

async function retrivePayPal(payerId, paymentId, bookId){
    return new Promise((resolve, reject) => {
        paypal.payment.execute(paymentId, {payer_id: payerId}, async (error, payment) =>{
            if(error){
                reject(error);
            }else{
                const paymentUrl = `https://paypal.com/activity/payment/${payment.transactions[0].related_resources[0].sale.id}`;
                await bookings.findOneAndUpdate({ "_id": bookId }, { "payment.state": 'completed', "payment.url": paymentUrl});
                resolve();
            }
        });
    });
}

// STRIPE

async function createStripe(price, bookId){
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: 'payment',
            line_items: [
                {
                    price_data:{
                        currency: 'eur',
                        product_data:{
                            name: `Noleggio Veicolo presso CarMunfrà`
                        },
                        unit_amount: price * 100
                    },
                    quantity: 1
                }
            ],
            success_url: `${process.env.SERVER_URL}/success?bookingId=${bookId}`,
            cancel_url: `${process.env.SERVER_URL}/cancel?method=stripe&session_id={CHECKOUT_SESSION_ID}&bookingId=${bookId}`,
        });
        const expiration = new Date();
        expiration.setMinutes(expiration.getMinutes() + 15);
        await bookings.findOneAndUpdate({ "_id": bookId }, { "payment": {"state": 'pending', "id": session.id, "method": 'stripe', "expiration": expiration}});
        return session.url;
    } catch (error) {
      console.log('si è verificato un errore con il pagamento con stripe, errore: ', error);
    }
}


module.exports = {createPaypal, retrivePayPal, createStripe};