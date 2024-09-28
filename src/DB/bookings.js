const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    mezzoId: {
        type: String,
        required: true
    },
    fromDate: {
        type: Date,
        required: false
    },
    toDate: {
        type: Date,
        required: false
    },
    days: {
        type: Number,
        required: false
    },
    startDay: {
        type: Number,
        required: false
    },
    customerId: {
        type: String,
        required: false
    },
    kmStarting: {
        type: Number,
        required: false
    },
    km: {
        type: Number,
        required: false
    },
    serbatoioFine: {
        type: Number,
        required: false
    },
    finalPrice: {
        type: Number,
        required: false
    },
    payment: {
        state: {
            type: String,
            required: false
        },
        id: {
            type: String,
            required: false
        },
        expiration: {
            type: Date,
            required: false
        },
        method: {
            type: String,
            required: false
        },
        url:{
            type: String,
            required: false
        }
    }
});

bookingSchema.methods.isPaymentExpired = function() {
    const currentTime = Date.now();
    return currentTime > this.payment.expiration;
};

const bookings = new mongoose.model('booking', bookingSchema);

module.exports = bookings;