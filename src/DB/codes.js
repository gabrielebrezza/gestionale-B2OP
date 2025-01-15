const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
    discount: {
        type: Number,
        required: true
    },
    email: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    cf: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    customerId: {
        type: String,
        required: false
    },
    code: {
        type: String,
        required: true
    }
});
const codes = new mongoose.model('code', codeSchema);

module.exports = codes;