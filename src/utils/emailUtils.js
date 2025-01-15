const nodemailer = require('nodemailer');
// const tls = require('tls');
const fs = require('fs');
const path = require('path');

const generateHtml = (text) => {
    const defaultHtml = `
<!DOCTYPE html>
<html lang="it">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Email Template</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      color: #333;
      line-height: 1.5;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #e6e3e3;
      border: 1px solid #486EB9;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }

    .header {
      background-color: #e6e3e3;
      padding: 20px;
      text-align: center;
      border-bottom: 1px solid #486EB9;
    }

.content{
    padding: 40px;
}
.content p {
    margin-top: 20px;
    margin-bottom: 20px;
}

.button-container {
text-align: center;
  margin-top: 20px; /* Spazio uniforme sopra ogni pulsante */
  margin-bottom: 20px; /* Spazio sotto ogni pulsante */
}


    .button {
      display: inline-block;
      padding: 10px 20px;
      background-color: #486EB9;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      transition: .25s ease-in-out;
    }
    a{
      color: #f4f4f4;
    }
    .button:hover {
      opacity: .8;
    }

    .footer {
      text-align: center;
      font-size: 12px;
      color: #e6e3e3;
      padding: 10px;
      background-color: #486EB9;
    }
  </style>
</head>

<body>
  <div class="email-container">
    <div class="header">
        <img src="https://www.carmunfra.it/wp-content/uploads/2023/02/cropped-logo.png">
    </div>
    <div class="content">
`
const regexLink = /https?:\/\/[^\s]+/g;

// Trova tutti i link nel testo
const links = text.match(regexLink);
// Rimuove i link dal testo originale
const newtext = text.replace(regexLink, '|');

// Splitta il testo in base ai separatori ('|')
const content = newtext.split('|').map(t => t.trim()).filter(t => t.length > 0);
let htmlContent = '';
for (let i = 0; i < content.length; i++) {
    htmlContent+=`<p>${content[i]}</p>`
    if(links != null && links[i]){
        htmlContent+=`
            <div class="button-container">
                <a href="${links[i].replace(',', '')}" style="color: #f4f4f4;" class="button">Clicca Qui</a>
            </div>
        `
    }
}
const footer = `
    </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Carmunfra. Tutti i diritti riservati.</p>
        </div>
    </div>
</body>

</html>`
return defaultHtml + htmlContent + footer;
}





const sendEmail = async (email, subject, text, attachment = null) => {
    return new Promise((resolve, reject) => {
        const html = generateHtml(text)
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
            html: html
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