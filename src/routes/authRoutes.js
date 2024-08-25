const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const router = express.Router();

const admins = require('../DB/admin');

const { generateToken, authenticateJWT } = require('../utils/authUtils.js');

router.use(bodyParser.json());

router.use(bodyParser.urlencoded({ extended: true }));

router.get('/admin/signup', (req, res) => {
    res.render('admin/auth/signup');
});
router.get('/admin/login', (req, res) => {
    res.render('admin/auth/login');
});
router.get('/admin/otpcode', async (req, res) =>{
    const id = req.query.id;
    res.render('admin/auth/otpCode', {id});
});
router.get('/waitingApprovation', async (req, res) =>{
    const admin = await admins.findOne({ "_id": req.query.id });
    if(admin.approved) return res.redirect('/admin'); 
    const {nome, cognome} = admin;
    res.render('admin/auth/waitingApprovation', {utente: `${nome} ${cognome}`}); 
});

router.post('/admin/signup', async (req, res) => {
    const nome = req.body.nome.replace(/\s/g, "").toLowerCase();
    const cognome = req.body.cognome.replace(/\s/g, "").toLowerCase();
    const email = req.body.email.replace(/\s/g, "").toLowerCase();
    const password = req.body.password;

    const existingAdmin = await admins.findOne({ email });
    if (existingAdmin) {
        return res.render('errorPage', { err: 'Esiste già un account con questa email' });
    }

    const randomBuffer = crypto.randomBytes(16);
    const randomNumber = randomBuffer.readUIntBE(0, 3);
    let otpCode = randomNumber % 1000000;
    if(otpCode < 100000) otpCode += 100000;

    const saltRoundsOTP = await bcrypt.genSalt(Math.min(13, 236));
    const saltRoundsPSWD = await bcrypt.genSalt(Math.max(271, 12));
    const hashedOTP = await bcrypt.hash(String(otpCode), saltRoundsOTP);
    const hashedPSWD = await bcrypt.hash(password, saltRoundsPSWD);
    try {
        const newAdmin = new admins({
            email: email,
            nome: nome,
            cognome: cognome,
            password: hashedPSWD,
            otp: hashedOTP,
            approved: false
        });

        await newAdmin.save();
        console.log(`Codice OTP per ${nome} ${cognome}: ${otpCode}`);
    } catch (error) {
        console.log(`errore nella registrazione di ${email}`);
        return res.render('errorPage', { err: 'Si è verificato un errore nella registrazione' });
    }
    // const subject = 'Registrazione Admin Gestionale B2OP';
    // const text = `Gentile ${nome} ${cognome}, questo è il codice per verificare l'account di admin: ${otpCode}`;
    // try {
    //     const result = await sendEmail(email, subject, text);
    //     console.log(result)
    // } catch (error) {
    //     console.error(error)
    //     return res.render('errorPage', { error: 'Errore nell\'invio dell\'email con codice OTP' });
    // }
    const { _id } = await admins.findOne({ email })
    res.redirect(`/admin/otpcode?id=${encodeURIComponent(_id)}`);
});

router.post('/admin/login', async (req, res) => {
    const email = req.body.email.replace(/\s/g, "").toLowerCase();
    const password = req.body.password;
    const admin = await admins.findOne({ "email": email });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
        return res.render('errorPage', { err: 'Credenziali errate' });
    }
    const id = admin._id
    const randomBuffer = crypto.randomBytes(16);
    const randomNumber = randomBuffer.readUIntBE(0, 3);
    let otpCode = randomNumber % 1000000;
    if(otpCode < 100000) otpCode += 100000;

    const saltRoundsOTP = await bcrypt.genSalt(Math.min(12, 234));
    const hashedOTP = await bcrypt.hash(String(otpCode), saltRoundsOTP);
    console.log(`Codice di verifica per ${email}: ${otpCode}`);
    await admins.findOneAndUpdate({ "_id": id }, {"otp": hashedOTP});

    // const subject = 'Login Istruttore Autoscuola';
    // const text = `Gentile ${admin.nome} ${admin.cognome}, questo è il codice per accedere: ${otpCode}`;
    // try {
    //     const result = await sendEmail(email, subject, text);
    //     console.log(result)
    // } catch (error) {
    //     console.error(error)
    //     return res.render('errorPage', { err: 'Errore nell\'invio dell\'email con codice OTP' });
    // }
    res.redirect(`/admin/otpcode?id=${encodeURIComponent(id)}`);
});

router.post('/admin/verificaOTP', async (req, res) =>{
    const id = req.body.id;
    const insertedOTP = Object.values(req.body).slice(-6);
    let otpString = '';
    for (const key in insertedOTP) {
        otpString += insertedOTP[key];
    }
    const check = await admins.findOne({ "_id": id });
    if(!check.otp || !check){
        return res.redirect(`/admin/login`);
    }
    const isOTPMatched = await bcrypt.compare(otpString, check.otp);
    
    if(!isOTPMatched){
        return res.render('errorPage', { err:'Il codice OTP inserito è errato'});
    }else{
        await admins.findOneAndUpdate({ "_id": id }, {$unset: {"otp": ""}});
        const token = await generateToken(id);
        res.cookie('token', token, { httpOnly: true, maxAge: 1000*60*60*24*21 });
        res.redirect(`/admin`);
    }
});

router.post('/admin/logout', authenticateJWT, async (req, res) =>{
    res.cookie('token', '', {maxAge: 1});
    res.redirect('/admin/login');
});
module.exports = router;