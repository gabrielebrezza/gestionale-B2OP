const bcrypt = require('bcrypt');

const codes = require('../DB/codes.js');
const noleggiatori = require('../DB/noleggiatori.js');

const { sendEmail } = require('./emailUtils.js');

async function createCode(length, email, discount) {
    const char = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += char[Math.floor(Math.random(0, char.length) * char.length)];
    }

    const subject = 'Codice Sconto CarMunfrà';
    const text = `Ecco il tuo codice sconto per poter noleggiare al ${discount}% di sconto sul nostro sito ${process.env.SERVER_URL} \n${code}`;
    try {
        const result = await sendEmail(email, subject, text);
        console.log(result)
    } catch (error) {
        console.error(`Errore durante l'invio dell'email con il codice sconto: ${error}`)
    }

    return await bcrypt.hash(code, 10);
}

async function setCode(customerId, email, cf, discount){
    try {
        if (!customerId) {
            const hashedCode = await createCode(email.length, email, discount);
            const newCode = new codes({ "discount": discount, "email": email, "cf": cf, "code": hashedCode });
            await newCode.save();
        } else {
            const user = await noleggiatori.findOne({ "_id": customerId });
            const hashedCode = await createCode((Math.random() * (25 - 8 + 1)) + 8, user.contatti.email, discount);
            const newCode = new codes({ "discount": discount, "customerId": customerId, "code": hashedCode });
            await newCode.save();
        }
        return {success: true}
    } catch (error) {
        return error;
    }
}
module.exports = { setCode };