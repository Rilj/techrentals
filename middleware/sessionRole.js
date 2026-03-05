function isAdmin(req, res, next){
  if(!req.session.user || req.session.user.role !== 'admin'){
    return res.send("Akses ditolak. Admin saja.");
  }
  next();
}

function isSuperAdmin(req, res, next){
  if(!req.session.user || req.session.user.role !== 'superadmin'){
    return res.send("Akses ditolak. Superadmin saja.");
  }
  next();
}

function isLogin(req, res, next){
  if(!req.session.user){
    return res.redirect('/');
  }
  next();
}

module.exports = { isAdmin, isSuperAdmin, isLogin };
