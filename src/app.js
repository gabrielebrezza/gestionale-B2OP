require('dotenv').config();

const express = require('express');

const mezzi = require('./DB/mezzi.js');
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

app.use((req, res, next) => {
  res.render('errorPage', {err: 'pagina non trovata'});
});

const PORT = process.env.PORT || 80;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));