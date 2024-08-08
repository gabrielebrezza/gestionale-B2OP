const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    nome: {
        type: String,
        required: true
    },
    cognome: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    approved: {
        type: Boolean,
        required: true
    }
});
const admin = new mongoose.model('admin', adminSchema);

module.exports = admin;