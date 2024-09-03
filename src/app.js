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

app.use(express.json());

app.use(adminRoute, authRoute);

app.use(express.urlencoded({extended: true}));
app.use(bodyParser.json({ limit: '50mb' })); // Limite di 50 MB per JSON
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // Limite di 50 MB per URL encoded
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
    dati.customerId = req.user.id;

    const fromDate = new Date(dati.fromDate).getTime();
    const toDate = new Date(dati.toDate).getTime();
    dati.days = Math.floor((toDate - fromDate) / (1000 * 60 *60 *24)) + 1;
    dati.startDay = new Date(dati.fromDate).getDay() - 1;
    dati.startDay = dati.startDay < 0 ? 6 : dati.startDay;

    const { daysPrices } = await mezzi.findOne({"_id": dati.mezzoId});
    let day = dati.startDay;
    dati.finalPrice = Array.from({ length: dati.days }, () => daysPrices[day++ % 7]).reduce((a, b) => a + b, 0);
    
    if(!req.user.id){
      const user = new noleggiatori(dati);
      await user.save();
      dati.customerId = user._id.toString();
    }

    const newBooking = new bookings(dati);
    await newBooking.save();
    
    if(!req.user.id){
      return res.status(200).json({ customerId: dati.customerId });
    }
    res.redirect(`/`);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).render('errorPage', { err: 'Errore del server' });
  }
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      const dir = path.join('privateImages', file.fieldname);
      cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${req.body.customerId}.jpg`);
  }
});

const upload = multer({ storage: storage });

app.post('/user/uploadFiles', upload.fields([{ name: 'licenseFront', maxCount: 1 }, { name: 'licenseBack', maxCount: 1 }]), async (req, res) => {
  try {
      res.json({ message: 'File caricati con successo' });
  } catch (error) {
      console.error('Errore durante l\'upload dei file:', error);
      res.status(500).json({ error: 'Errore del server' });
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