const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const router = express.Router();

const admins = require('../DB/admin');
const noleggiatori = require('../DB/noleggiatori');
const needVerificationUser =  require('../DB/needVerificationUser');

const { generateToken, authenticateJWT } = require('../utils/authUtils.js');
const { verifyUserImage } = require('../utils/fileUtils.js');
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
router.get('/admin/approveUsers', authenticateJWT, async (req, res) =>{
    const needApprovationAdmins = await admins.find({"approved": false})
    res.render('admin/auth/approveUsers', {needApprovationAdmins});
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

router.post('/admin/approvation', authenticateJWT, async (req, res) =>{
    const dati = req.body;
    if(dati.disapprove){
        await admins.deleteOne({"_id": dati.id});
        return res.redirect('/admin/approveUsers');
    }
    const admin = await admins.findOneAndUpdate({"_id": dati.id}, {approved: true});
    // const subject = 'Approvazione Admin';
    // const text = `Gentile ${admin.nome} ${admin.cognome}, ti informiamo che il tuo account Admin è stato approvato. Per accedere clicca qui ${process.env.SERVER_URL}/admin`;
    // try {
    //     const result = await sendEmail(email, subject, text);
    //     console.log(result)
    // } catch (error) {
    //     console.error(error)
    // }
    res.redirect('/admin/approveUsers');
});

router.post('/admin/logout', authenticateJWT, async (req, res) =>{
    res.cookie('token', '', {maxAge: 1});
    res.redirect('/admin/login');
});




//users
router.post('/user/login', async (req, res) => {
    try {
      const email = req.body.email.replace(/\s/g, "").toLowerCase();
      const password = req.body.password;
      const user = await noleggiatori.findOne({ "contatti.email": email }, {});
      if (!user.password || user.password == null) {
        // Se il campo password non esiste o è null, restituisci un errore
        return res.status(401).json({ accountExist: false });
    }
      if (!(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ wrongCredentials: true });
      }
      const randomBuffer = crypto.randomBytes(16);
      const randomNumber = randomBuffer.readUIntBE(0, 3);
      let otpCode = randomNumber % 1000000;
      if(otpCode < 100000) otpCode += 100000;
  
      const saltRoundsOTP = await bcrypt.genSalt(Math.min(12, 234));
      const hashedOTP = await bcrypt.hash(String(otpCode), saltRoundsOTP);
      console.log(`Codice di verifica per ${email}: ${otpCode}`);
      await noleggiatori.findOneAndUpdate({ "_id": user._id }, {"otp": hashedOTP});
      // const subject = 'Login Istruttore Autoscuola';
      // const text = `Gentile ${admin.nome} ${admin.cognome}, questo è il codice per accedere: ${otpCode}`;
      // try {
      //     const result = await sendEmail(email, subject, text);
      //     console.log(result)
      // } catch (error) {
      //     console.error(error)
      //     return res.render('errorPage', { err: 'Errore nell\'invio dell\'email con codice OTP' });
      // }
      return res.status(200).json({id: user._id});
    } catch (error) {
        console.log(error)
        res.status(500).json({error: 'errore del server'});
    }
  });

  router.post('/user/signup', async (req, res) => {
        const dati = req.body;
        const email = dati.contatti.email.replace(/\s/g, "").toLowerCase();
        let needVerification = false, id;
        const existingUser = await noleggiatori.findOne({"contatti.email": email });
        if (existingUser && existingUser.password) {
            return res.status(200).json({exist: true});
        }
        const randomBuffer = crypto.randomBytes(4);
        const randomNumber = randomBuffer.readUIntBE(0, 4);
        let otpCode = randomNumber % 1000000;
        if(otpCode < 100000) otpCode += 100000;
    
        const saltRoundsOTP = await bcrypt.genSalt(Math.min(13, 236));
        const saltRoundsPSWD = await bcrypt.genSalt(Math.max(271, 12));
        dati.otp = await bcrypt.hash(String(otpCode), saltRoundsOTP);
        dati.password = await bcrypt.hash(dati.password, saltRoundsPSWD);
        try {
            if(existingUser){
                dati.userId = existingUser._id
                await needVerificationUser.deleteMany({"userId": dati.userId});
                const user = new needVerificationUser(dati);
                await user.save();
                await noleggiatori.findOneAndUpdate({ "contatti.email": email }, {"otp": dati.otp});
                needVerification = true, id = dati.userId;
            }
            if(!existingUser){
                const user = new noleggiatori(dati);
                await user.save();
            }
            console.log(`Codice OTP per ${email}: ${otpCode}`);
        } catch (error) {
            console.log(`errore nella registrazione di ${email}`, error);
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
        
        if(!existingUser){
            let user = await noleggiatori.findOne({"contatti.email": email });
            id = user._id;
        }
        return res.status(200).json({ id, needVerification });
    });
  router.get('/ciao', async (req, res) => verifyUserImage('ciao'))
  router.post('/user/otp', async (req, res) =>{
    const id = req.body.id;
    let needVerification = await needVerificationUser.findOne({"userId": id});
    const insertedOTP = Object.values(req.body).slice(-6);
    let otpString = '';
    for (const key in insertedOTP) {
        otpString += insertedOTP[key];
    }
    const check = await noleggiatori.findOne({ "_id": id });
    if(!check.otp || !check){
        return res.status(401).json({ otpExist: false });
    }
    const isOTPMatched = await bcrypt.compare(otpString, check.otp);
    if(!isOTPMatched){
        return res.status(401).json({ otpMatched: false });
    }
    if(needVerification){
        const updateFields = {};
        needVerification = needVerification.toObject();
        for (const key in needVerification) {
            if (key !== '_id') {
                updateFields[key] = needVerification[key];
            }
        }
        await verifyUserImage(id);
        await noleggiatori.findOneAndUpdate({ "_id": id }, updateFields);
        await needVerificationUser.deleteOne({"userId": id});
    }
    await noleggiatori.findOneAndUpdate({ "_id": id }, {$unset: {"otp": ""}});
    const token = await generateToken(id);
    
    return res.status(200).json({token, maxAge: 1000*60*60*24*93});
});

module.exports = router;