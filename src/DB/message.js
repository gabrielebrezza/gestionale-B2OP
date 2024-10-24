const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: false
    },
    seen: {
        type: Boolean,
        required: false
    },
    customerId: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    subject: {
        type: String,
        required: false,
        trim: true,
        lowercase: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
    }
});
const messages = new mongoose.model('message', messageSchema);

module.exports = messages;