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
        code: {
            type: String,
            required: false
        },
        createdAt: { 
            type: Date,
            default: Date.now,
            required: false
        }
    },
    approved: {
        type: Boolean,
        required: true,
        default: false
    }
});

adminSchema.methods.isOtpExpired = function() {
    const otpExpirationTime = 6 * 60 * 1000;
    const currentTime = Date.now();
    return (currentTime - this.otp.createdAt.getTime()) > otpExpirationTime;
};

const admin = new mongoose.model('admin', adminSchema);

module.exports = admin;