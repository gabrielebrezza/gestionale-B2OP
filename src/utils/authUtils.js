const jwt = require('jsonwebtoken'); 
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const admins = require('../DB/admin');

async function generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '31d' });
}

async function authenticateJWT(req, res, next) {
    const token = req.cookies.adminToken;
    if (!token) {
        return res.redirect('/admin/login');
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) {
            return res.redirect('/admin/login');
        }
        try {
            const id = user.id; 
            const approvedAdmin = await admins.findOne({ "_id": id, "approved": true });
            
            if (!approvedAdmin) {
                return res.redirect(`/waitingApprovation?id=${id}`);
            }
        } catch (error) {
            console.error('Errore durante il recupero dello stato di approvazione dell\'utente:', error);
            return res.render('errorPage', { err: 'Errore durante il recupero dello stato di approvazione dell\'utente' });
        }
        
        req.user = user;
        next();
    });
}



function userAuthenticateJWT(req, res, next) {
    const token = req.cookies.userToken;
    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            req.user = null;
            return next();
        }
        req.user = user;
        next();
    });
}

async function generateOTP() {
    const otpCode = (crypto.randomBytes(3).readUIntBE(0, 3) % 1000000).toString().padStart(6, '0'); // OTP a 6 cifre

    const saltRounds = 10;
    const hashedOTP = await bcrypt.hash(otpCode, saltRounds);

    return {otpCode, hashedOTP};
}

module.exports = { generateToken, authenticateJWT, userAuthenticateJWT, generateOTP };