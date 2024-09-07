const nodemailer = require('nodemailer');
// const tls = require('tls');
const fs = require('fs');
const path = require('path');

const sendEmail = async (email, subject, text, attachment = null) => {
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            host: 'smtps.aruba.it',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PSWD
            },
            tls: {
                rejectUnauthorized: false,
            }
        });
        
        let mailOptions = {
            from: `"CarMunfra" ${process.env.EMAIL}`,
            to: email,
            subject: subject,
            text: text
        };

        if (attachment) {
            if (Array.isArray(attachment)) {
                const attachments = [];

                attachment.forEach(fileName => {
                    attachments.push({path: fileName});
                });
                mailOptions.attachments = attachments;
            }else{
                mailOptions.attachments = {path: attachment};
            }
        }
        transporter.sendMail(mailOptions, async function(error, info) {
            if (error) {
                reject(new Error('Errore nell\'invio dell\'email:'));
            } else {
                resolve(`email inviata con successo a ${email}`);
            }
        });
    });
}
module.exports = {sendEmail};