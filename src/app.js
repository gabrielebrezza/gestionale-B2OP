require('dotenv').config();

const express = require('express');

const mezzi = require('./DB/mezzi.js');
const bookings = require('./DB/bookings.js');
const noleggiatori = require('./DB/noleggiatori.js');

const app = express();

//routes
const adminRoute = require('./routes/adminRoutes');
const authRoute = require('./routes/authRoutes');

app.use(express.json());

app.use(adminRoute, authRoute);

app.use(express.urlencoded({extended: false}));

app.set('view engine', 'ejs');

app.set('views', 'views');

app.use(express.static('public'));

app.get('/mezzo', async (req, res) => {
  try {
    const id = req.query.id;
    const mezzo = await mezzi.findOne({'_id': id}, {"marca": 1, "modello": 1, "descrizione": 1, "kmIncluded": 1, "kmPrice": 1, "type": 1, "daysPrices": 1 });
    let noleggi = await bookings.find({"mezzoId": id}, {"fromDate": 1, "toDate": 1});
    const today = new Date();
    noleggi = noleggi.filter(book => new Date(book.fromDate) > today || (new Date(book.fromDate) <= today &&  new Date(book.toDate) >= today));
    if (mezzo) {
        res.render('user/mezzo', { mezzo, noleggi });
    } else {
        res.status(404).render('errorPage', {err: 'Mezzo non trovato'});
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('errorPage', {err: 'Errore del server'});
  }
});

app.use((req, res, next) => {
    res.render('errorPage', {err: 'pagina non trovata'});
});

const PORT = process.env.PORT || 80;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));