const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_CONNECTION_URL)
.then(() =>{
    console.log('Main Database connected successfully');
})
.catch(() =>{
    console.log('Main Database cannot be connected ');
});

const mezziSchema = new mongoose.Schema({
    targa: {
        type: String,
        required: true
    },
    marca: {
        type: String,
        required: false
    },
    modello: {
        type: String,
        required: false
    },
    descrizione: {
        type: String,
        required: false
    },
    anno: {
        type: Number,
        required: false
    },
    km: {
        type: Number,
        required: false
    },
    kmIncluded: {
        type: Number,
        required: false
    },
    kmPrice: {
        type: Number,
        required: false
    },
    insuranceCompany: {
        type: String,
        required: false
    },
    expInsurance: {
        type: String,
        required: false
    },
    expPropTax: {
        type: String,
        required: false
    },
    expRev: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: false
    },
    daysPrices: {
        type: [Number],
        required: false,
        minlength: 7,
        maxlength: 7
    },
    discountedDays: {
        type: String,
        required: false
    },
    discount: {
        type: Number,
        required: false
    },
    note: {
        type: String,
        required: false
    }
});
const mezzi = new mongoose.model('mezzi', mezziSchema);

module.exports = mezzi;