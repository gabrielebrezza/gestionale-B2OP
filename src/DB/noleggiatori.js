const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    nome: {
        type: String,
        trim: true,
        lowercase: true,
        required: true
    },
    cognome: {
        type: String,
        trim: true,
        lowercase: true,
        required: true
    },
    cf: {
        type: String,
        trim: true,
        lowercase: true,
        required: true
    },
    cUnivoco : {
        type: String,
        trim: true,
        lowercase: true,
        required: false
    },
    pIva:{
        type: String,
        trim: true,
        lowercase: true,
        required: false
    },
    residenza: {
        via: {
            type: String,
            trim: true,
            lowercase: true,
            required: false
        },
        nCivico: {
            type: String,
            trim: true,
            lowercase: true,
            required: false
        },
        cap: {
            type: String,
            trim: true,
            required: false
        },
        comune: {
            type: String,
            trim: true,
            lowercase: true,
            required: false
        },
        provincia: {
            type: String,
            trim: true,
            lowercase: true,
            required: false
        }
    },
    contatti: {
        email: {
            type: String,
            required: false,
            trim: true,
            lowercase: true
        },
        tel: {
            type: String,
            trim: true,
            required: false
        },
        pec: {
            type: String,
            trim: true,
            required: false
        }
    },
    patente: {
        numero: {
            type: String,
            trim: true,
            uppercase: true,
            required: false
        },
        rilascio: {
            type: String,
            required: false
        },
        daUfficio: {
            type: String,
            required: false
        },
        scadenza: {
            type: String,
            required: false
        }
    },
    password: {
        type: String,
        required: false,
        default: null
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
    note: {
        type: String,
        trim: true,
        required: false
    }
});

customerSchema.methods.isOtpExpired = function() {
    const otpExpirationTime = 6 * 60 * 1000;
    const currentTime = Date.now();
    return (currentTime - this.otp.createdAt.getTime()) > otpExpirationTime;
};

const noleggiatori = new mongoose.model('noleggiatori', customerSchema);

module.exports = noleggiatori;