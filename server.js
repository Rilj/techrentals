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
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


/* =========================
   UPLOAD IMAGE CONFIG
========================= */
app.use('/uploads', express.static('public/uploads'));


/* =========================
   SESSION CONFIG
========================= */
app.use(session({
  secret: 'secret123',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));


/* =========================
   VIEW ENGINE SETUP
========================= */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');


/* =========================
   HELPER FUNCTIONS
========================= */
function calculateDays(startDate) {
  const now = new Date();
  const diff = now - new Date(startDate);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days + 1;
}


/* =========================
   ROUTES
========================= */

// Landing & Auth Routes
app.get('/', (req, res) => {
  res.render('login', { user: null });
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.redirect('/?error=' + encodeURIComponent('User tidak ditemukan'));
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.redirect('/?error=' + encodeURIComponent('Password salah'));
    }

    req.session.user = user;
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/?error=' + encodeURIComponent('Terjadi kesalahan saat login'));
  }
});

// User Dashboard
app.get('/dashboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/');

  try {
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
  } catch (error) {
    console.error('Dashboard error:', error);
    res.redirect('/?error=' + encodeURIComponent('Gagal memuat dashboard'));
  }
});

// Super Admin Routes
app.get('/superadmin', isSuperAdmin, async (req, res) => {
  try {
    const items = await Item.findAll();
    const users = await User.findAll({ where: { role: 'admin' } });

    res.render('superadmin', {
      user: req.session.user,
      items,
      admins: users
    });
  } catch (error) {
    console.error('Superadmin error:', error);
    res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat data superadmin'));
  }
});

app.post('/superadmin/add-admin', isSuperAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.redirect('/superadmin?error=' + encodeURIComponent('Semua field wajib diisi!'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin'
    });

    res.redirect('/superadmin?success=' + encodeURIComponent('Admin berhasil ditambahkan!'));

  } catch (error) {
    console.error('Add admin error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.redirect('/superadmin?error=' + encodeURIComponent('Email sudah digunakan, silakan gunakan email lain.'));
    }
    res.redirect('/superadmin?error=' + encodeURIComponent('Terjadi kesalahan saat menambahkan admin: ' + error.message));
  }
});

// Admin Dashboard
app.get('/admin/dashboard', isAdmin, async (req, res) => {
  try {
    const pendingLoans = await Loan.findAll({
      where: { status: 'pending' },
      include: [User, Item]
    });

    const returnRequests = await Loan.findAll({
      where: { status: 'return_requested' },
      include: [User, Item]
    });

    res.render('admin_dashboard', {
      user: req.session.user,
      pendingLoans,
      returnRequests
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat admin dashboard'));
  }
});

app.post('/admin/add-user', isAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Semua field wajib diisi!'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user'
    });

    res.redirect('/admin/dashboard?success=' + encodeURIComponent('User berhasil ditambahkan!'));

  } catch (error) {
    console.error('Add user error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Email sudah digunakan!'));
    }
    res.redirect('/admin/dashboard?error=' + encodeURIComponent('Error: ' + error.message));
  }
});

// Approve Loan (Peminjaman)
app.post('/admin/approve/:id', isAdmin, async (req, res) => {
  try {
    const loan = await Loan.findByPk(req.params.id, {
      include: [Item]
    });

    if (!loan) {
      return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Peminjaman tidak ditemukan'));
    }

    loan.status = 'borrowed';
    loan.startDate = new Date();
    await loan.save();

    loan.Item.status = 'dipinjam';
    await loan.Item.save();

    res.redirect('/admin/dashboard?success=' + encodeURIComponent('Peminjaman berhasil disetujui!'));
  } catch (error) {
    console.error('Approve loan error:', error);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent('Gagal menyetujui peminjaman'));
  }
});

// Complete Return (Pengembalian dengan Denda)
app.post('/admin/complete-return/:id', isAdmin, async (req, res) => {
  try {
    const { fineType, fineAmount, fineDescription } = req.body;

    const loan = await Loan.findByPk(req.params.id, {
      include: [Item, User]
    });

    if (!loan) {
      return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Peminjaman tidak ditemukan'));
    }

    // Hitung harga sewa dasar
    const today = new Date();
    const start = new Date(loan.startDate);
    const diffTime = today - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Harga sewa: 10k/hari
    let rentalPrice = diffDays * 10000;
    let fine = 0;

    // Logika denda berdasarkan pilihan admin
    if (fineType === 'damaged' || fineType === 'lost') {
      fine = parseInt(fineAmount) || 0;
    }

    // Total = harga sewa + denda
    const totalPrice = rentalPrice + fine;

    // Update data peminjaman
    loan.endDate = today;
    loan.totalPrice = totalPrice;
    loan.fine = fine;
    loan.fineType = fineType;
    loan.fineDescription = fineDescription || null;
    loan.status = 'returned';

    await loan.save();

    // Update status item
    if (fineType === 'lost') {
      loan.Item.status = 'hilang';
    } else {
      loan.Item.status = 'tersedia';
    }

    await loan.Item.save();

    // Redirect dengan pesan sukses + detail
    const message = `Total: Rp ${totalPrice.toLocaleString('id-ID')} (Denda: Rp ${fine.toLocaleString('id-ID')})`;
    res.redirect('/admin/dashboard?success=' + encodeURIComponent('Pengembalian berhasil diproses!') + '&message=' + encodeURIComponent(message));

  } catch (error) {
    console.error('Complete return error:', error);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent('Gagal memproses pengembalian: ' + error.message));
  }
});

// Reject Loan
app.post('/admin/reject/:id', isAdmin, async (req, res) => {
  try {
    const loan = await Loan.findByPk(req.params.id, {
      include: [Item]
    });

    if (!loan) {
      return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Peminjaman tidak ditemukan'));
    }

    loan.status = 'rejected';
    await loan.save();

    loan.Item.status = 'tersedia';
    await loan.Item.save();

    res.redirect('/admin/dashboard?success=' + encodeURIComponent('Peminjaman berhasil ditolak'));
  } catch (error) {
    console.error('Reject loan error:', error);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent('Gagal menolak peminjaman'));
  }
});

// Items Route
app.get('/items', async (req, res) => {
  if (!req.session.user) return res.redirect('/');

  try {
    const items = await Item.findAll();
    res.render('items', {
      user: req.session.user,
      items
    });
  } catch (error) {
    console.error('Items error:', error);
    res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat data barang'));
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/?success=' + encodeURIComponent('Berhasil logout'));
  });
});

// My Loans
app.get('/my-loans', async (req, res) => {
  if (!req.session.user) return res.redirect('/');

  try {
    const loans = await Loan.findAll({
      where: { UserId: req.session.user.id },
      include: [Item]
    });

    res.render('my_loans', {
      user: req.session.user,
      loans
    });
  } catch (error) {
    console.error('My loans error:', error);
    res.redirect('/dashboard?error=' + encodeURIComponent('Gagal memuat data peminjaman'));
  }
});

// Request Return (User)
app.post('/loan/return/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/');

    const loan = await Loan.findByPk(req.params.id);

    if (loan.UserId !== req.session.user.id) {
      return res.redirect('/dashboard?error=' + encodeURIComponent('Akses ditolak'));
    }

    loan.status = 'return_requested';
    await loan.save();

    res.redirect('/dashboard?success=' + encodeURIComponent('Permintaan pengembalian berhasil diajukan'));
  } catch (error) {
    console.error('Return request error:', error);
    res.redirect('/dashboard?error=' + encodeURIComponent('Gagal mengajukan pengembalian'));
  }
});

// Approve Payment
app.post('/admin/approve-payment/:id', isAdmin, async (req, res) => {
  try {
    const loan = await Loan.findByPk(req.params.id);

    if (!loan) {
      return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Peminjaman tidak ditemukan'));
    }

    loan.status = 'borrowed';
    await loan.save();

    res.redirect('/admin/dashboard?success=' + encodeURIComponent('Pembayaran berhasil disetujui'));
  } catch (error) {
    console.error('Approve payment error:', error);
    res.redirect('/admin/dashboard?error=' + encodeURIComponent('Gagal menyetujui pembayaran'));
  }
});

// Old Approve Return Route (Deprecated - redirect to complete-return)
app.post('/admin/approve-return/:id', isAdmin, async (req, res) => {
  // Redirect ke route baru untuk konsistensi
  res.redirect(307, '/admin/complete-return/' + req.params.id);
});


/* =========================
   API ROUTES
========================= */
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/loan', loanRoutes);
app.use('/admin', adminRoutes);


/* =========================
   START SERVER
========================= */
sequelize.sync({ alter: true }).then(async () => {
  // Cek apakah superadmin sudah ada
  const existingSuperAdmin = await User.findOne({
    where: { role: 'superadmin' }
  });

  if (!existingSuperAdmin) {
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