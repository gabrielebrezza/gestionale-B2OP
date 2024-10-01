require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fsp = require('fs').promises;

const mezzi = require('./DB/mezzi.js');
const bookings = require('./DB/bookings.js');
const noleggiatori = require('./DB/noleggiatori.js');

const app = express();

//routes
const adminRoute = require('./routes/adminRoutes');
const authRoute = require('./routes/authRoutes');

//middlewares
const { userAuthenticateJWT } = require('./utils/authUtils');
const { getNextFileNumber } = require('./utils/fileUtils.js');
const { createPaypal, retrivePayPal, createStripe, checkPaymentCompleted } = require('./utils/paymentUtils.js');
const { sendEmail } = require('./utils/emailUtils.js');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join('privateImages', file.fieldname));
  },
  filename: (req, file, cb) => {
    const newFilename = `${file.fieldname}${req.body.needVerification ? 'test' : ''}_${req.body.customerId}.jpeg`;
    cb(null, newFilename);
  }
});

const upload = multer({ storage: storage });

// Route per l'upload dei file
app.post('/user/uploadFiles', upload.fields([
  { name: 'licenseFront', maxCount: 1 },
  { name: 'licenseBack', maxCount: 1 },
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 },
  { name: 'sanitaryFront', maxCount: 1 },
  { name: 'sanitaryBack', maxCount: 1 }
]), (req, res) => {
  try {
    res.status(200).json({ message: 'File caricati con successo' });
  } catch (error) {
    console.error('Errore durante l\'upload dei file:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});


const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
app.post('/stripeHooks', express.raw({type: 'application/json'}), async (req, res) =>{
  const payload = req.body;
  const sig = req.headers['stripe-signature'];

  let event;
  try {
      event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_SIGNING_SECRET);
    } catch (error) {
      console.log(error.message);
      return res.status(400).json({success: false});
  }

  if(event.type == 'checkout.session.completed') {
    const session = event.data.object;
    const paymentIntent = session.payment_intent;
    const paymentId = session.id;
    const booking = await bookings.findOne({ "payment.id": paymentId });
    if (!booking || booking.isPaymentExpired()) {
      await bookings.deleteOne({ "payment.id": paymentId });
      try {
        await stripe.refunds.create({
          payment_intent: paymentIntent,
        });
        return res.status(200).json({ success: false, message: 'Il pagamento è scaduto, rimborso effettuato.' });
      } catch (refundError) {
        console.log(refundError.message);
        return res.status(500).json({ success: false, message: 'Errore durante il rimborso' });
      }
    }
    const paymentUrl = `https://dashboard.stripe.com/payments/${paymentIntent}`;
    await bookings.findOneAndUpdate({ "payment.id": paymentId }, { "payment.state": 'completed', "payment.url": paymentUrl});
    const customer = await noleggiatori.findOne({'_id': booking.customerId});
    const mezzo = await mezzi.findOne({'_id': booking.mezzoId});
    const subject = 'Noleggio Mezzo CarMunfra';
    const text = `Gentile ${customer.nome} ${customer.cognome}, ti comunichiamo che abbiamo ricevuto la tua prenotazione per il mezzo ${mezzo.marca} ${mezzo.modello} nei giorni dal ${booking.fromDate.toLocaleDateString()} al ${booking.toDate.toLocaleDateString()}. Ti aspettiamo presso la nostra sede, situata in Via Tarantelli 5, Casale Monferrato (AL) , 15033, per il ritiro.`;
    try {
        const result = await sendEmail(customer.contatti.email, subject, text);
        console.log(result)
    } catch (error) {
        console.error(error)
        return res.render('errorPage', { error: 'Errore nell\'invio dell\'email con codice OTP' });
    }
  }
  res.json({success: true});
})

app.use(express.json());

app.use(adminRoute, authRoute);

app.use(express.urlencoded({extended: true}));

app.set('view engine', 'ejs');

app.set('views', 'views');

app.use(express.static('public'));

app.get('/cancel', userAuthenticateJWT, async (req, res) =>{
  const { method, session_id, bookingId } = req.query;
  if(method == 'stripe'){
    await bookings.deleteOne({"_id": bookingId, "payment.id": session_id, "payment.state": "pending"});
  }else{
    await bookings.deleteOne({"_id": bookingId, "payment.state": "pending"});
  }
  const customerId = req.user.id;
  res.render('user/payments/cancel', {customerId});
})

app.get('/', async (req, res) => {
  res.redirect('/mezzi')
})

app.get('/user/images', userAuthenticateJWT, async (req, res) => {
  try {
      if(!req.user) return res.status(401).send('NON AUTORIZZATO');
      const id = req.user.id;
      
      const imagePath = path.resolve(__dirname, '../privateImages', req.query.dir, `${req.query.dir}_${id}.jpeg`);
      await fsp.access(imagePath);
      res.sendFile(imagePath);
  } catch (err) {
      if (err.code === 'ENOENT') {
          res.status(404).send('Immagine non trovata.');
      } else {
          console.log('Errore del Server: ', err)
          res.status(500).send('Errore del server.');
      }
  }
});

app.post('/user/images/delete', userAuthenticateJWT, async (req, res) => {
  try {
      if(!req.user) return res.status(401).send('NON AUTORIZZATO');
      const id = req.user.id;
      const imagePath = path.resolve(__dirname, '../privateImages', req.body.dir, `${req.body.dir}_${id}.jpeg`);
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

app.get('/mezzi', userAuthenticateJWT, async (req, res) => {
  try {
    const customerId = req.user ? req.user.id : false;
    let veicoli = await mezzi.find({}, {"marca": 1, "modello": 1, "descrizione": 1, "type": 1, "daysPrices": 1, "kmIncluded": 1, "kmPrice": 1, "discount": 1, "discountedDays": 1});
    let noleggi = await bookings.find({}, {"fromDate": 1, "toDate": 1, "mezzoId": 1});
    
    const today = new Date();
    noleggi = noleggi.filter(book => new Date(book.fromDate) > today || (new Date(book.fromDate) <= today &&  new Date(book.toDate) >= today));

    veicoli = veicoli.map(veicolo => {
      const filteredBookings = noleggi.filter(book => book.mezzoId == veicolo._id.toString())
      .map(book => ({
        fromDate: book.fromDate,
        toDate: book.toDate
      }));
      return {
          ...veicolo._doc,
          bookings: filteredBookings
      };
  });
    res.render('user/mezzi', {customerId, veicoli, noleggi});
  } catch (error) {
    console.error(error);
    res.status(500).render('errorPage', {err: 'Errore del server'});
  }
});
app.get('ciao', async (req, res) => await bookings.deleteMany())
app.get('/mezzo', userAuthenticateJWT, async (req, res) => {
  try {
    const id = req.query.id;
    const customerId = req.user ? req.user.id : false;
    const mezzo = await mezzi.findOne({'_id': id}, {"marca": 1, "modello": 1, "descrizione": 1, "kmIncluded": 1, "kmPrice": 1, "type": 1, "daysPrices": 1,"discount": 1,"discountedDays": 1 });
    let noleggi = await bookings.find({"mezzoId": id}, {"fromDate": 1, "toDate": 1, "payment.state": 1});
    const today = new Date();
    noleggi = noleggi.filter(book => book.fromDate > today || (book.fromDate <= today &&  book.toDate >= today));
    noleggi = noleggi.filter(book => book.payment.state == 'pending' || book.payment.state == 'completed');
    if (mezzo) {
      const folderPath = path.join('public', 'img', 'mezzi', id);
      const totalImages = await getNextFileNumber(folderPath) - 1;
        res.render('user/mezzo', { mezzo, noleggi, customerId, totalImages });
    } else {
        res.status(404).render('errorPage', {err: 'Mezzo non trovato'});
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('errorPage', {err: 'Errore del server'});
  }
});

app.post('/user/newRent', userAuthenticateJWT, async (req, res) => {
  try {
    const dati = req.body;
    dati.customerId = req.user ? req.user.id : null;
    const newUser = !dati.customerId;

    const fromDate = new Date(dati.fromDate).getTime();
    const toDate = new Date(dati.toDate).getTime();
    dati.fromDate = fromDate;
    dati.toDate = toDate;
    const conflictingBooking = await bookings.findOne({
      "mezzoId": dati.mezzoId,
      $or: [
        {
          $and: [
            { "fromDate": { $lte: fromDate } },
            { "toDate": { $gte: fromDate } }
          ]
        },
        {
          $and: [
            { "fromDate": { $lte: toDate } },
            { "toDate": { $gte: toDate } }
          ]
        },
        {
          $and: [
            { "fromDate": { $gte: fromDate } },
            { "toDate": { $lte: toDate } }
          ]
        }
      ],
      "payment.state": { $in: ['pending', 'completed'] }
    });

    if (conflictingBooking) {
      if (conflictingBooking.payment.state === 'pending') {
        return res.status(409).render('errorPage', { err: 'Qualcun altro sta già pagando.' });
      }
      if (conflictingBooking.payment.state === 'completed') {
        return res.status(409).render('errorPage', { err: 'Il mezzo è già stato prenotato.' });;
      }
    }

    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 15);
    dati.payment = {
      state: 'pending',
      expiration: expiration
    };
    dati.days = Math.floor((toDate - fromDate) / (1000 * 60 *60 *24)) + 1;
    dati.startDay = new Date(dati.fromDate).getDay() - 1;
    dati.startDay = dati.startDay < 0 ? 6 : dati.startDay;

    const { daysPrices } = await mezzi.findOne({"_id": dati.mezzoId});
    let day = dati.startDay;
    dati.finalPrice = Array.from({ length: dati.days }, () => daysPrices[day++ % 7]).reduce((a, b) => a + b, 0);
    if(newUser){
      let user = await noleggiatori.findOne({"cf": dati.cf.toLowerCase().trim()});
      if(!user){
        user = new noleggiatori(dati);
        await user.save();
      }
      dati.customerId = user._id.toString();
    }
    const newBooking = new bookings(dati);
    await newBooking.save();
    checkPaymentCompleted(newBooking._id);
    if(newUser){
      let paymentMethod;
      if(dati.paypal == '') paymentMethod = 'paypal'; 
      if(dati.stripe == '') paymentMethod = 'stripe'; 
      if(dati.satispay == '') paymentMethod = 'satispay'; 
      return res.status(200).json({ customerId: dati.customerId, paymentMethod: paymentMethod, bookingId: newBooking._id });
    }

    if(dati.paypal == ''){
      return res.redirect(await createPaypal(dati.finalPrice, newBooking._id));
    }
    if(dati.stripe == ''){
      return res.redirect(await createStripe(dati.finalPrice, newBooking._id));
    }
    // if(dati.satispay == ''){}
    // if(dati.cash == ''){}
    res.redirect(`/`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('errorPage', { err: 'Errore del server' });
  }
});

app.post('/user/startPayment', userAuthenticateJWT, async (req, res) => {
  try {
    const { paymentMethod, bookingId } = req.body;
    const { finalPrice } = await bookings.findOne({"_id": bookingId, "payment.id": { $exists: false }, "payment.method": { $exists: false }});
    if(!finalPrice) return res.status(404).json({err: 'Prenotazione non trovata'});
    if(paymentMethod == 'paypal'){
      const paymentUrl = await createPaypal(finalPrice, bookingId);
      return res.status(200).json({paymentUrl});
    }
    if(paymentMethod == 'stripe'){
      const paymentUrl = createStripe(finalPrice, bookingId);
      return res.status(200).json({paymentUrl});
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('errorPage', { err: 'Errore del server' });
  }
});

app.get('/success/paypal', async (req, res) => {
  try {
    const {PayerID, paymentId} = req.query;
    if(!PayerID || !paymentId){
        return res.render('errorPage', {err: 'Il pagamento non è avvenuto con successo'});
    }
    const booking = await bookings.findOne({"payment.id": paymentId});
    if(!booking || booking.isPaymentExpired()){
      await bookings.deleteOne({"payment.id": paymentId});
      return res.render('errorPage', {err: 'Il pagamento è scaduto. Riprova'});
    }
    try {
      await retrivePayPal(PayerID, paymentId, booking._id);
      const customer = await noleggiatori.findOne({'_id': booking.customerId});
      const mezzo = await mezzi.findOne({'_id': booking.mezzoId});
      const subject = 'Noleggio Mezzo CarMunfra';
      const text = `Gentile ${customer.nome} ${customer.cognome}, ti comunichiamo che abbiamo ricevuto la tua prenotazione per il mezzo ${mezzo.marca} ${mezzo.modello} nei giorni dal ${booking.fromDate.toLocaleDateString()} al ${booking.toDate.toLocaleDateString()}. Ti aspettiamo presso la nostra sede, situata in Via Tarantelli 5, Casale Monferrato (AL) , 15033, per il ritiro.`;
      try {
          const result = await sendEmail(customer.contatti.email, subject, text);
          console.log(result)
      } catch (error) {
          console.error(error)
          return res.render('errorPage', { error: 'Errore nell\'invio dell\'email con codice OTP' });
      }
      return res.redirect(`/success?bookingId=${booking._id}`);
    } catch (error) {
      console.log(`Errore durante il pagamento per ${booking.customerId}: ${error}`);
      return res.render('errorPage', {err: 'Si è verificato un errore'});
    }
  } catch (error) {
    console.error(error);
    res.render('errorPage', {err: error});
  }
});
app.get('/success', userAuthenticateJWT, async (req, res) => {
  const customerId = req.user.id;
  const { bookingId } = req.query;
  const { fromDate, toDate, mezzoId } = await bookings.findOne({"_id": bookingId}, {"fromDate": 1, "toDate": 1, "mezzoId": 1});
  const { modello, marca } = await mezzi.findOne({"_id": mezzoId}, {"modello": 1, "marca": 1});
  const booking = {fromDate, toDate, modello, marca};
  res.render('user/payments/success', {booking, customerId});
});

app.get('/user/data', userAuthenticateJWT, async (req, res) => {
  try {
    if(!req.user) return res.redirect('/');
    const customerId = req.user.id;
    const data = await noleggiatori.findOne({"_id": customerId});
    res.render('user/dataPage', {customerId, data})
  } catch (error) {
    console.error(error)
  }
});

app.post('/user/data/update', userAuthenticateJWT, async (req, res) =>{
  try {
      const id = req.user.id;
      const dati = req.body;
      if(await noleggiatori.findOne({"_id": { $ne: id }, "contatti.email": dati.contatti.email})) return res.render('errorPage', { err: 'Esiste già un\'account con questa email'});
      await noleggiatori.findOneAndUpdate({"_id": id}, dati);
      res.redirect(`/user/data`);
  } catch (err) {
      console.error(`Si è verificato un'errore nell'aggiornamento del profilo cliente: ${err}`);
      res.render('errorPage', {err: `Errore nell'aggiornamento del profilo`});
  }
});

app.use((req, res, next) => {
    res.render('errorPage', {err: 'pagina non trovata'});
});

async function updateDiscount(){
  const veicoli = await mezzi.find();
  for(const veicolo of veicoli){
    const discount = 5 * Math.floor(Math.random() * (5.5 - 2) + 2);

    let discountedDays = '';
    for (let i = 0; i < (Math.floor(Math.random() * 3) + 1); i++) {
      discountedDays += Math.floor(Math.random() * 7 );
      
    }

    await mezzi.findOneAndUpdate({'_id': veicolo._id}, {"discount": discount, "discountedDays": discountedDays});
  }
}

updateDiscount()
setInterval(updateDiscount, 1000 * 60 * 60 * 24 * 7);

const PORT = process.env.PORT || 80;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));