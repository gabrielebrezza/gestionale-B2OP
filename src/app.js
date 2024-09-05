require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const mezzi = require('./DB/mezzi.js');
const bookings = require('./DB/bookings.js');
const noleggiatori = require('./DB/noleggiatori.js');

const app = express();

//routes
const adminRoute = require('./routes/adminRoutes');
const authRoute = require('./routes/authRoutes');

//middlewares
const { userAuthenticateJWT } = require('./utils/authUtils');


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
app.use(express.json());

app.use(adminRoute, authRoute);

app.use(express.urlencoded({extended: true}));

app.set('view engine', 'ejs');

app.set('views', 'views');

app.use(express.static('public'));

app.get('/mezzo', userAuthenticateJWT, async (req, res) => {
  try {
    const id = req.query.id;
    const customerId = req.user ? req.user.id : false;
    const mezzo = await mezzi.findOne({'_id': id}, {"marca": 1, "modello": 1, "descrizione": 1, "kmIncluded": 1, "kmPrice": 1, "type": 1, "daysPrices": 1,"discount": 1,"discountedDays": 1 });
    let noleggi = await bookings.find({"mezzoId": id}, {"fromDate": 1, "toDate": 1});
    const today = new Date();
    noleggi = noleggi.filter(book => new Date(book.fromDate) > today || (new Date(book.fromDate) <= today &&  new Date(book.toDate) >= today));
    if (mezzo) {
        res.render('user/mezzo', { mezzo, noleggi, customerId });
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
    
    if(newUser){
      return res.status(200).json({ customerId: dati.customerId });
    }
    res.redirect(`/`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('errorPage', { err: 'Errore del server' });
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