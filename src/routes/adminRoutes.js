const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { authenticateJWT } = require('../utils/authUtils');
const router = express.Router();

const mezzi = require('./../DB/mezzi.js');
const noleggiatori = require('./../DB/noleggiatori.js');

router.use(cookieParser());

router.use(bodyParser.json());

router.use(bodyParser.urlencoded({ extended: true }));

router.get('/admin', authenticateJWT, async (req, res) => {
    res.send('ciao')
});

router.get('/admin/mezzi', authenticateJWT, async (req, res) =>{
    const veicoli = await mezzi.find()
    res.render('admin/mezzi', {veicoli});
});

router.post('/admin/mezzi/nuovoMezzo', authenticateJWT, async (req, res) =>{
    try {
        const dati = req.body;
        const saveMezzo = new mezzi(dati);
        await saveMezzo.save()
        console.log(`Nuovo utente salvato: ${dati.nome} ${dati.cognome}`);
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
    const id = req.query.id;
    const mezzo = await mezzi.findOne({"_id": id});
    res.render('admin/mezzo', {mezzo});
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
        const id = req.body.id;
        const dati = req.body;
        await mezzi.findOneAndUpdate({"_id": id}, {storicoNoleggi: [dati]});
        res.redirect(`/admin/mezzo?id=${encodeURIComponent(id)}`);
    } catch (err) {
        console.error(`Si è verificato un'errore nell'aggiornamento del mezzo: ${err}`);
        res.render('errorPage', {err: `Errore nell'aggiornamento del mezzo`});
    }
});
module.exports = router;