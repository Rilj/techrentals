const jwt = require('jsonwebtoken');
require('dotenv').config();

function isSuperAdmin(req, res, next){
  if(!req.session.user || req.session.user.role !== 'superadmin'){
    return res.send("Akses ditolak. Hanya Superadmin.");
  }
  next();
}

function isAdmin(req, res, next){
  if(!req.session.user || req.session.user.role !== 'admin'){
    return res.send("Akses ditolak. Hanya Admin.");
  }
  next();
}

function verifyToken(req, res, next){
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: 'Token required' });

  try {
    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
}

module.exports = {
  isSuperAdmin,
  isAdmin,
  verifyToken
};
