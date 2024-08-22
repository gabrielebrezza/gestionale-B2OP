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
        }
    },
    note: {
        type: String,
        required: false
    }
});
const noleggiatori = new mongoose.model('noleggiatori', noleggiatoriSchema);

module.exports = noleggiatori;