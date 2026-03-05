const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const upload = require('../middleware/upload');

const { isSuperAdmin, isAdmin } = require('../middleware/authMiddleware');


/* TAMBAH BARANG (SUPERADMIN) */
router.post('/add', isSuperAdmin, upload.single('image'), async (req, res) => {
  try {
    const { nama_barang, jumlah } = req.body;

    const total = parseInt(jumlah);

    if (isNaN(total) || total <= 0) {
      return res.send("Jumlah tidak valid");
    }

    for (let i = 1; i <= total; i++) {
      await Item.create({
        nama_barang,
        kode_unit : `${nama_barang.substring(0,3).toUpperCase()}-${Date.now()}-${i}`,
        status: 'tersedia',
        image: req.file ? req.file.filename : null
      });
    }

    res.redirect('/superadmin');

  } catch (err) {
    console.error("ERROR TAMBAH BARANG:", err);
    res.send(err.message);
  }
});

router.post('/complete-return/:id', async (req, res) => {

  const Loan = require('../models/Loan');
  const Item = require('../models/Item');

  const loan = await Loan.findByPk(req.params.id, {
    include: [Item]
  });

  if (!loan) return res.send("Loan tidak ditemukan");

  const fine = parseInt(req.body.fine) || 0;

  loan.fine = fine;
  loan.totalPrice += fine;
  loan.status = 'returned';
  loan.endDate = new Date();

  await loan.save();

  loan.Item.status = 'tersedia';
  await loan.Item.save();

  res.redirect('/admin/dashboard');
});

module.exports = router;
