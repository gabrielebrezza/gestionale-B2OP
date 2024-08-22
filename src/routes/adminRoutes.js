const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { authenticateJWT } = require('../utils/authUtils');
const router = express.Router();

const mezzi = require('./../DB/mezzi.js');
const bookings = require('./../DB/bookings.js');
const noleggiatori = require('./../DB/noleggiatori.js');

router.use(cookieParser());

router.use(bodyParser.json());

router.use(bodyParser.urlencoded({ extended: true }));

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
        res.render('admin/mezzo', {mezzo, noleggi, clienti});
    } catch (err) {
        res.render('errorPage', {err: 'Il mezzo selezionato potrebbe essere stato eliminato o essere inesistente'});
    }
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
        let dati = req.body;
        const toDate = new Date(dati.toDate).getTime();
        const fromDate = new Date(dati.fromDate).getTime();
        dati.days = Math.floor((toDate - fromDate) / (1000 * 60 *60 *24)) + 1;
        if(dati.km) {
            const { km, dayPrice, kmIncluded, kmPrice } = await mezzi.findOne({"_id": mezzoId});
            await mezzi.findOneAndUpdate({"_id": mezzoId}, {"km" : dati.km});
            dati.km = dati.km - km;
            dati.finalPrice = dati.days * dayPrice;
            if(dati.km >= kmIncluded) dati.finalPrice += ((dati.km - kmIncluded) * kmPrice);
        }
        if(dati.cf){
            const user = new noleggiatori(dati)
            await user.save();
            dati.customerId = user._id;
        }
        dati.mezzoId = mezzoId;
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
        const {km, serbatoioFine, kmStarting, days} = rent;
        if(!dati.km){
            dati.km = km ? km : 0;
        }else{
            await mezzi.findOneAndUpdate({"_id": idMezzo}, {"km" : dati.km});
            dati.km -= kmStarting;
            const { dayPrice, kmIncluded, kmPrice } = await mezzi.findOne({"_id": idMezzo});
            dati.finalPrice = days * dayPrice;
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
        return res.redirect('/admin/mezzi');
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

module.exports = router;