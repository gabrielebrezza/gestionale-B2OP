const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    rentId: {
        type: String,
        required: true
    },
    importo: {
        type: Number,
        required: true
    },
    date: {
        type: String,
        required: false
    },
    number: {
        type: Number,
        required: false
    }
});
const invoices = new mongoose.model('invoice', invoiceSchema);

module.exports = invoices;