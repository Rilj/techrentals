const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Item = require('./models/Item');
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const loanRoutes = require('./routes/loanRoutes');
const expressLayouts = require('express-ejs-layouts');
const Loan = require('./models/Loan');
const adminRoutes = require('./routes/adminRoutes');
const app = express();
const { isAdmin, isSuperAdmin, isLogin } = require('./middleware/sessionRole');


/* =========================
   MIDDLEWARE (WAJIB DI ATAS)
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ⬅️ PINDAH KE SINI
app.use(express.static('public'));
/* =========================
   UPLOAD IMAGE CONFIG
========================= */


app.use('/uploads', express.static('public/uploads'));


app.use(session({
  secret: 'secret123',
  resave: false,
  saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

function calculateDays(startDate) {
  const now = new Date();

  const diff = now - new Date(startDate);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return days + 1; // Hari H langsung dihitung 1
}



/* =========================
   ROUTES
========================= */

app.get('/', (req,res)=>{
  res.render('login', { user: null });
});

app.post('/login', async (req,res)=>{
  const {email,password} = req.body;

  const user = await User.findOne({where:{email}});
  if(!user) return res.send("User not found");

  const valid = await bcrypt.compare(password,user.password);
  if(!valid) return res.send("Wrong password");

  req.session.user = user;
  res.redirect('/dashboard');
});

app.get('/dashboard', async (req,res)=>{
  if(!req.session.user) return res.redirect('/');

  const loans = await Loan.findAll({
    where: {
      UserId: req.session.user.id,
      status: ['borrowed', 'return_requested']
    },
    include: [Item]
  });

  const today = new Date();

  loans.forEach(loan => {

    const start = new Date(loan.startDate);
    const diffTime = today - start;
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    loan.days = days;
    loan.total = days * 10000;
  });

  res.render('dashboard', {
    user: req.session.user,
    loans
  });
});

app.get('/superadmin', isSuperAdmin, async (req,res)=>{
  const items = await Item.findAll();
  const users = await User.findAll({ where: { role: 'admin' } });

  res.render('superadmin', {
    user: req.session.user,
    items,
    admins: users
  });
});

app.post('/superadmin/add-admin', isSuperAdmin, async (req, res) => {
  try {
    // ✅ Destructure SEMUA field dari form
    const { name, email, password } = req.body;

    // ✅ Validasi
    if (!name || !email || !password) {
      return res.send("Semua field wajib diisi!");
    }

    // ✅ Hash password (WAJIB!)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,  // ✅ Simpan yang sudah di-hash
      role: 'admin'
    });

    res.redirect('/superadmin');

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.send("Email sudah digunakan, silakan gunakan email lain.");
    }
    console.error(error);
    res.send("Terjadi kesalahan saat menambahkan admin: " + error.message);
  }
});

app.get('/admin/dashboard', isAdmin, async (req,res)=>{

  const pendingLoans = await Loan.findAll({
    where: { status: 'pending' },
    include: [User, Item]
  });

  const returnRequests = await Loan.findAll({
    where: { status: 'return_requested' },
    include: [User, Item]
  });

  res.render('admin_dashboard',{
    user: req.session.user,
    pendingLoans,
    returnRequests
  });
});



// Route: /admin/add-user (untuk admin menambah user biasa)
app.post('/admin/add-user', isAdmin, async (req, res) => {
  try {
    // ✅ Destructure SEMUA field
    const { name, email, password } = req.body;

    // Validasi
    if (!name || !email || !password) {
      return res.send("Semua field wajib diisi!");
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user'  // ✅ Role default 'user'
    });

    res.redirect('/admin/dashboard');

  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.send("Email sudah digunakan!");
    }
    console.error(error);
    res.send("Error: " + error.message);
  }
});

app.post('/admin/approve/:id', isAdmin, async (req, res) => {

  const loan = await Loan.findByPk(req.params.id, {
    include: [Item]
  });

  if (!loan) return res.send("Loan tidak ditemukan");

  loan.status = 'borrowed';
  loan.startDate = new Date();
  await loan.save();

  // 🔥 UBAH STATUS BARANG
  loan.Item.status = 'dipinjam';
  await loan.Item.save();

  res.redirect('/admin/dashboard');
});

app.post('/admin/complete-return/:id', isAdmin, async (req,res)=>{

  const loan = await Loan.findByPk(req.params.id, {
    include: [Item]
  });

  const fine = parseInt(req.body.fine);

  loan.fine = fine;
  loan.totalPrice += fine;
  loan.status = 'returned';
  loan.endDate = new Date();

  await loan.save();

  // Barang kembali tersedia
  loan.Item.status = 'tersedia';
  await loan.Item.save();

  res.redirect('/admin/dashboard');
});

app.post('/admin/reject/:id', async (req, res) => {

  const loan = await Loan.findByPk(req.params.id, {
    include: [Item]
  });

  if (!loan) return res.send("Loan tidak ditemukan");

  loan.status = 'rejected';
  await loan.save();

  // 🔥 BALIKKAN BARANG
  loan.Item.status = 'tersedia';
  await loan.Item.save();

  res.redirect('/admin/dashboard');
});

app.get('/items', async (req,res)=>{
  if(!req.session.user) return res.redirect('/');
  const items = await Item.findAll();
  res.render('items', {
    user: req.session.user,
    items
  });
});

app.get('/logout', (req,res)=>{
  req.session.destroy();
  res.redirect('/');
});

app.get('/my-loans', async (req,res)=>{
  if(!req.session.user) return res.redirect('/');

  const loans = await Loan.findAll({
    where: { UserId: req.session.user.id },
    include: [Item]
  });

  res.render('my_loans',{
    user: req.session.user,
    loans
  });
});

app.post('/loan/return/:id', async (req,res)=>{

  const loan = await Loan.findByPk(req.params.id);

  if(loan.UserId !== req.session.user.id){
    return res.send("Akses ditolak");
  }

  loan.status = 'return_requested';
  await loan.save();

  res.redirect('/dashboard');
});

app.post('/admin/approve-payment/:id', isAdmin, async (req,res)=>{

  const loan = await Loan.findByPk(req.params.id);

  loan.status = 'borrowed';
  await loan.save();

  res.redirect('/admin/dashboard');
});

app.post('/admin/approve-return/:id', isAdmin, async (req,res)=>{

  const { damaged } = req.body; // checkbox

  const loan = await Loan.findByPk(req.params.id, {
    include: [Item]
  });

  const today = new Date();
  loan.endDate = today;

  const start = new Date(loan.startDate);

  const diffTime = today - start;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let total = diffDays * 10000; // 10k per hari
  let fine = 0;

  if(damaged === 'yes'){
    fine = 300000;
    total += fine;
  }

  loan.totalPrice = total;
  loan.fine = fine;
  loan.status = 'returned';

  await loan.save();

  loan.Item.status = 'tersedia';
  await loan.Item.save();

  res.redirect('/admin/dashboard');
});


/* API ROUTES */
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/loan', loanRoutes);
app.use('/admin', adminRoutes);

/* START SERVER */
sequelize.sync({ alter: true }).then(async ()=>{
  // Cek apakah superadmin sudah ada
  const existingSuperAdmin = await User.findOne({
    where: { role: 'superadmin' }
  });

  if (!existingSuperAdmin) {

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('123456', 10);

    await User.create({
      name: 'Super Admin',
      email: 'superadmin@gmail.com',
      password: hashedPassword,
      role: 'superadmin'
    });

    console.log("Superadmin berhasil dibuat!");
    console.log("Email: superadmin@gmail.com");
    console.log("Password: 123456");
  }

  app.listen(5000, () => {
    console.log('Server running at http://localhost:5000');
  });
});
