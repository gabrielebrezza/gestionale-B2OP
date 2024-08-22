const jwt = require('jsonwebtoken'); 

const admins = require('../DB/admin');

async function generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '21d' });
}

async function authenticateJWT(req, res, next) {
    const token = req.cookies.token;
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

module.exports = { generateToken, authenticateJWT };