const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fsp = require('fs').promises;
const multer = require('multer');
const bcrypt = require('bcrypt');
const path = require('path');

const { authenticateJWT } = require('../utils/authUtils');
const { getNextFileNumber, resetImageNumbering } = require('../utils/fileUtils.js');
const { sendEmail } = require('../utils/emailUtils.js');
const { setCode } = require('../utils/discountUtils.js');
const router = express.Router();

const mezzi = require('./../DB/mezzi.js');
const bookings = require('./../DB/bookings.js');
const noleggiatori = require('./../DB/noleggiatori.js');
const messages = require('./../DB/message.js');
const { fork } = require('child_process');
const codes = require('../DB/codes.js');


router.use(cookieParser());

router.use(bodyParser.json());

router.use(bodyParser.urlencoded({ extended: true }));


  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const mezzoId = req.body.id;
        const folderPath = path.join('public', 'img', 'mezzi', mezzoId);
  
      try {
        // Se la cartella non esiste, creala
        await fsp.mkdir(folderPath, { recursive: true });
        cb(null, folderPath);
      } catch (error) {
        console.error('Errore nella creazione della cartella:', error);
        cb(error);
      }
    },
    filename: async (req, file, cb) => {
      const mezzoId = req.body.id;
      const folderPath = path.join('public', 'img', 'mezzi', mezzoId);
  
      try {
        const nextFileNumber = await getNextFileNumber(folderPath);
        const newFilename = `${nextFileNumber}.jpg`;
        cb(null, newFilename);
      } catch (error) {
        console.error('Errore nella generazione del nome file:', error);
        cb(error);
      }
    }
  });
  
  const upload = multer({ storage: storage });

  router.post('/admin/mezzo/addImage', upload.single('image'), async (req, res) => {
    try {
        const folderPath = path.join('public', 'img', 'mezzi', req.body.id);
        const fileNumber = await getNextFileNumber(folderPath) - 1;
        const imageUrl = `/img/mezzi/${req.body.id}/${fileNumber}.jpg`;
      res.status(200).json({ message: 'File caricato con successo', imageUrl, fileNumber });
    } catch (error) {
      console.error('Errore durante l\'upload del file:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
  });

router.delete('/admin/deleteImage/:mezzoId/:imageN', async (req, res) => {
    try {
        const mezzoId = req.params.mezzoId;
        const imageNumber = req.params.imageN;
        const folderPath = path.join('public', 'img', 'mezzi', mezzoId);
        const imagePath = path.join(folderPath, `${imageNumber}.jpg`);

        await fsp.unlink(imagePath);

        await resetImageNumbering(folderPath);
      res.status(200).json({ message: 'File caricato con successo'});
    } catch (error) {
      console.error('Errore durante l\'upload del file:', error);
      res.status(500).json({ error: 'Errore del server' });
    }
});

router.get('/ciao', async (req, res) => await bookings.deleteMany())

router.get('/admin/images', authenticateJWT, async (req, res) => {
    try {
        const imagePath = path.resolve(__dirname, '../../privateImages', req.query.dir);
        await fsp.access(imagePath);
        res.sendFile(imagePath);
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.status(404).send('Immagine non trovata.');
        } else {
            console.log('Errore del Server')
            res.status(500).send('Errore del server.');
        }
    }
});

router.post('/admin/images/delete', authenticateJWT, async (req, res) => {
    try {
        const imagePath = path.resolve(__dirname, '../../privateImages', req.body.dir);
        console.log(imagePath)
        await fsp.unlink(imagePath);
        res.status(200).send('Immagine Eliminata con Successo.');
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.status(404).send('Immagine non trovata.');
        } else {
            console.log('Errore del Server: ', err)
            res.status(500).send('Errore del server.');
        }
    }
});


// async function createCode(length, email, discount){
//     const char = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
//     let code = '';
//     for (let i = 0; i < length; i++) {
//         code += char[Math.floor(Math.random(0, char.length) * char.length)];
//     }

//     const subject = 'Codice Sconto CarMunfrà';
//     const text = `Ecco il tuo codice sconto per poter noleggiare al ${discount}% di sconto sul nostro sito www.carmunfra.it \n${code}`;
//     try {
//         const result = await sendEmail(email, subject, text);
//         console.log(result)
//     } catch (error) {
//         console.error(error)
//         return res.render('errorPage', { error: 'Errore nell\'invio dell\'email con codice OTP' });
//     }

//     return await bcrypt.hash(code, 10);
// }

router.post('/admin/code/create', async (req, res) => {
    try {
        const customerId = req.body.customerId;
        const dati = req.body;
        const { discount } = dati;
        
        if (!customerId) {
            await setCode(null, dati.email, dati.cf, discount);
        } else {
            await setCode(customerId, null, null, discount);
        }
        res.status(200);
    } catch (error) {
        console.log('Errore durante la creazione del codice: ', error);
        res.status(500);
    }
});

router.get('/admin', authenticateJWT, async (req, res) => {
    res.redirect('/admin/mezzi');
});

router.get('/admin/mezzi', authenticateJWT, async (req, res) =>{
    const veicoli = await mezzi.find();
    const noleggi = await bookings.find();
    res.render('admin/mezzi', {veicoli, noleggi});
});

router.post('/admin/mezzi/nuovoMezzo', authenticateJWT, async (req, res) =>{
    try {
        const dati = req.body;
        const saveMezzo = new mezzi(dati);
        await saveMezzo.save();
        res.redirect('/admin/mezzi');
    } catch (err) {
        console.error(`si è verificato un errore nel salvataggio del mezzo: ${err}`);
        res.render('errorPage', {err: 'Errore nel salvataggio del mezzo'});
    }
});

router.post('/admin/mezzi/delete', authenticateJWT, async (req, res) =>{
    const ids = (Object.keys(req.body)
    .filter(key => key.startsWith('mezzo')))
    .map(key => req.body[key]);
    try {
        for (const id of ids) {
            await mezzi.deleteOne({"_id": id});
            console.log(`mezzo ${id} eliminato definitivamente`);
        }
        return res.redirect('/admin/mezzi');
    } catch (error) {
        console.error(`errore durante l'eliminazione dei mezzi: ${error}`);
        return res.render('errorPage', {error: `errore durante l'eliminazione dei mezzi`});
    }
});
router.get('/admin/mezzo', authenticateJWT, async (req, res) =>{
    try{
        const id = req.query.id;
        const mezzo = await mezzi.findOne({"_id": id});
        const noleggi = await bookings.find({"mezzoId": id}, {});
        const clienti = await noleggiatori.find({}, {"_id": 1, "nome": 1, "cognome": 1});
        const folderPath = path.join('public', 'img', 'mezzi', id);
        const totalImages = await getNextFileNumber(folderPath) - 1;
        res.render('admin/mezzo', {mezzo, noleggi, clienti, totalImages});
    } catch (err) {
        res.render('errorPage', {err: 'Il mezzo selezionato potrebbe essere stato eliminato o essere inesistente'});
    }
});
router.post('/admin/mezzi/updateDaysPrices', authenticateJWT, async (req, res) => {
    const id = req.body.id;
    const prices = (Object.keys(req.body)
    .filter(key => key.startsWith('price')))
    .map(key => req.body[key]);
    await mezzi.findOneAndUpdate({"_id": id}, {"daysPrices": prices});
    res.json({message: `Nuovi prezzi salvati con successo`});
});
router.post('/admin/mezzo/updateMezzo', authenticateJWT, async (req, res) =>{
    try {
        const id = req.body.id;
        const dati = req.body;
        await mezzi.findOneAndUpdate({"_id": id}, dati);
        res.redirect(`/admin/mezzo?id=${encodeURIComponent(id)}`);
    } catch (err) {
        console.error(`Si è verificato un'errore nell'aggiornamento del mezzo: ${err}`);
        res.render('errorPage', {err: `Errore nell'aggiornamento del mezzo`});
    }
});
router.post('/admin/mezzi/newRent', authenticateJWT, async (req, res) =>{
    try {
        const mezzoId = req.body.id;
        const dati = req.body;
        dati.mezzoId = mezzoId;
        const fromDate = new Date(dati.fromDate).getTime();
        const toDate = new Date(dati.toDate).getTime();
        dati.days = Math.floor((toDate - fromDate) / (1000 * 60 *60 *24)) + 1;
        dati.startDay = new Date(dati.fromDate).getDay() - 1;
        dati.startDay = dati.startDay < 0 ? 6 : dati.startDay;
        if(dati.cf){
            const user = new noleggiatori(dati)
            await user.save();
            dati.customerId = user._id;
        }
        if(dati.km) {
            const { km, daysPrices, kmIncluded, kmPrice } = await mezzi.findOne({"_id": mezzoId});
            await mezzi.findOneAndUpdate({"_id": mezzoId}, {"km" : dati.km});
            dati.km = dati.km - km;
            let day = dati.startDay;
            dati.finalPrice = Array.from({ length: dati.days }, () => daysPrices[day++ % 7]).reduce((a, b) => a + b, 0);
            if(dati.km >= kmIncluded) dati.finalPrice += ((dati.km - kmIncluded) * kmPrice);
        }
        
        const newBooking = new bookings(dati);
        await newBooking.save();
        res.redirect(`/admin/mezzo?id=${encodeURIComponent(mezzoId)}`);
    } catch (err) {
        console.error(`Si è verificato un'errore nell'aggiornamento del mezzo: ${err}`);
        res.render('errorPage', {err: `Errore nell'aggiornamento del mezzo`});
    }
});
router.post('/admin/mezzi/rentEnded', authenticateJWT, async (req, res) =>{
    try {
        const idMezzo = req.body.idMezzo;
        const rentId = req.body.rentId;
        const dati = req.body;

        if(dati.rentStarted == 'on'){
            const { km } = await mezzi.findOne({"_id": idMezzo});
            await bookings.findOneAndUpdate({"_id": rentId}, {"kmStarting": km});
        }

        const rent = await bookings.findOne({"_id": rentId});
        const { km, serbatoioFine, kmStarting, days, startDay} = rent;
        if(!dati.km){
            dati.km = km ? km : 0;
        }else{
            await mezzi.findOneAndUpdate({"_id": idMezzo}, {"km" : dati.km});
            dati.km -= kmStarting;
            const { daysPrices, kmIncluded, kmPrice } = await mezzi.findOne({"_id": idMezzo});
            let day = startDay;
            dati.finalPrice = Array.from({ length: days }, () => daysPrices[day++ % 7]).reduce((a, b) => a + b, 0);
            if(dati.km >= kmIncluded) dati.finalPrice += ((dati.km - kmIncluded) * kmPrice);
        }
        if(!dati.serbatoioFine) dati.serbatoioFine = serbatoioFine ? serbatoioFine : 0;
        await bookings.findOneAndUpdate({"_id": rentId}, dati);
        res.redirect(`/admin/mezzo?id=${encodeURIComponent(idMezzo)}`);
    } catch (err) {
        console.error(`Si è verificato un'errore nell'aggiornamento del mezzo: ${err}`);
        res.render('errorPage', {err: `Errore nell'aggiornamento del mezzo`});
    }
});

router.get('/admin/clienti', authenticateJWT, async (req, res) => {
    const clienti = await noleggiatori.find();
    res.render('admin/customers', {clienti});
});

router.post('/admin/clienti/delete', authenticateJWT, async (req, res) =>{
    const ids = (Object.keys(req.body)
    .filter(key => key.startsWith('cliente')))
    .map(key => req.body[key]);
    try {
        for (const id of ids) {
            await noleggiatori.deleteOne({"_id": id});
            console.log(`utente ${id} eliminato definitivamente`);
        }
        return res.redirect('/admin/clienti');
    } catch (error) {
        console.error(`errore durante l'eliminazione degli utenti: ${error}`);
        return res.render('errorPage', {error: `errore durante l'eliminazione degli utenti`});
    }
});

router.get('/admin/cliente', authenticateJWT, async (req, res) =>{
    try {
        const id = req.query.id;
        const customer = await noleggiatori.findOne({"_id": id});
        res.render('admin/customer', {customer});
    } catch (err) {
        res.render('errorPage', {err: 'Il cliente selezionato potrebbe essere stato eliminato o essere inesistente'});
    }
});

router.post('/admin/cliente/update', authenticateJWT, async (req, res) =>{
    try {
        const id = req.body.id;
        const dati = req.body;
        await noleggiatori.findOneAndUpdate({"_id": id}, dati);
        res.redirect(`/admin/cliente?id=${encodeURIComponent(id)}`);
    } catch (err) {
        console.error(`Si è verificato un'errore nell'aggiornamento del cliente: ${err}`);
        res.render('errorPage', {err: `Errore nell'aggiornamento del cliente`});
    }
});

router.get('/admin/messages', authenticateJWT, async (req, res) => {
    const msgs = await messages.find();
    const users = await noleggiatori.find();
    const usersFiltered = [];
    for (const user of users) {
        if (msgs.find(msg => msg.customerId == user._id)) usersFiltered.push(user)
    }
    res.render('admin/messages', { messages: msgs, users: usersFiltered })
});
router.post('/admin/markAsRead', authenticateJWT, async (req, res) => {
    try {
        await messages.findOneAndUpdate({ "_id": req.body.id }, { "seen": req.body.action });
        res.redirect('admin/messages');
    } catch (error) {
        console.log(error)
        res.status(500)
    }
});

module.exports = router;