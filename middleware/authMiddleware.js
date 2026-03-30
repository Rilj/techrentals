const jwt = require('jsonwebtoken');
require('dotenv').config();

// ==========================================
// BASE AUTHENTICATION
// ==========================================
function isAuthenticated(req, res, next) {
  // Prioritize session (web)
  if (req.session?.user) {
    req.user = req.session.user;
    return next();
  }
  
  // Fallback JWT (API)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch {
      return res.status(403).json({ message: 'Invalid token' });
    }
  }
  
  // Not authenticated
  return req.accepts('html') 
    ? res.redirect('/login')
    : res.status(401).json({ message: 'Authentication required' });
}

// ==========================================
// STRICT ROLE CHECKERS
// ==========================================
function isSuperAdmin(req, res, next) {
  if (!req.session?.user) {
    return req.accepts('html')
      ? res.redirect('/login')
      : res.status(401).json({ message: 'Not authenticated' });
  }
  
  if (req.session.user.role !== 'superadmin') {
    return req.accepts('html')
      ? res.status(403).send("Akses ditolak. Hanya Superadmin.")
      : res.status(403).json({ message: 'Superadmin access required' });
  }
  
  next();
}

function isAdmin(req, res, next) {
  if (!req.session?.user) {
    return req.accepts('html')
      ? res.redirect('/login')
      : res.status(401).json({ message: 'Not authenticated' });
  }
  
  // STRICT: hanya 'admin', bukan 'superadmin'
  if (req.session.user.role !== 'admin') {
    return req.accepts('html')
      ? res.status(403).send("Akses ditolak. Hanya Admin.")
      : res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
}

// ==========================================
// COMBINATION (Practical Usage)
// ==========================================
const requireAuth = isAuthenticated;
const requireSuperAdmin = [isAuthenticated, isSuperAdmin];
const requireAdmin = [isAuthenticated, isAdmin];

module.exports = {
  isAuthenticated,
  isSuperAdmin,
  isAdmin,
  requireAuth,
  requireSuperAdmin,
  requireAdmin
};