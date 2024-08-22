const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    mezzoId: {
        type: String,
        required: true
    },
    fromDate: {
        type: String,
        required: false
    },
    days: {
        type: Number,
        required: false
    },
    toDate: {
        type: String,
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
    }
});
const bookings = new mongoose.model('booking', bookingSchema);

module.exports = bookings;