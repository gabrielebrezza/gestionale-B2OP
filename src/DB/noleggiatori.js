const mongoose = require('mongoose');

const noleggiatoriSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true
    },
    cognome: {
        type: String,
        required: true
    },
    cf: {
        type: String,
        required: true
    },
    cUnivoco : {
        type: String,
        required: false
    },
    pIva:{
        type: String,
        required: false
    },
    residenza: {
        via: {
            type: String,
            required: false
        },
        nCivico: {
            type: String,
            required: false
        },
        cap: {
            type: String,
            required: false
        },
        comune: {
            type: String,
            required: false
        },
        provincia: {
            type: String,
            required: false
        }
    },
    contatti: {
        email: {
            type: String,
            required: false
        },
        tel: {
            type: String,
            required: false
        },
        pec: {
            type: String,
            required: false
        }
    },
    patente: {
        numero: {
            type: String,
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
        required: false
    },
    otp: {
        type: String,
        required: false
    },
    note: {
        type: String,
        required: false
    }
});
const noleggiatori = new mongoose.model('noleggiatori', noleggiatoriSchema);

module.exports = noleggiatori;