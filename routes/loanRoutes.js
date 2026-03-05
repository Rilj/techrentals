const express = require('express');
const Loan = require('../models/Loan');
const Item = require('../models/Item');
const router = express.Router();

/* FORM PAGE */
router.get('/:kode', async (req, res) => {
  if (!req.session.user) return res.redirect('/');

  const unit = await Item.findOne({
    where: { kode_unit: req.params.kode }
  });

  if (!unit) return res.send("Barang tidak ditemukan");

  res.render('loan', {
    user: req.session.user,
    item: unit
  });
});

/* PROCESS LOAN */
router.post('/:kode', async (req, res) => {

  if (!req.session.user) return res.redirect('/');

  const unit = await Item.findOne({
    where: {
      kode_unit: req.params.kode,
      status: 'tersedia'
    }
  });

  if (!unit) {
    return res.send("Unit tidak tersedia");
  }

  // 🔥 UBAH STATUS JADI DIBOOKING
  await Item.update(
    { status: 'dibooking' },
    { where: { id: unit.id } }
  );

  await Loan.create({
    startDate: new Date(),
    UserId: req.session.user.id,
    ItemId: unit.id,
    status: 'pending'
  });

  res.redirect('/dashboard');
});

/* REQUEST RETURN */
router.post('/return/:id', async (req, res) => {

  if (!req.session.user) return res.redirect('/');

  const loan = await Loan.findOne({
    where: {
      id: req.params.id,
      UserId: req.session.user.id,
      status: 'borrowed'
    }
  });

  if (!loan) {
    return res.send("Data tidak ditemukan");
  }

  loan.status = 'return_requested';
  await loan.save();

  res.redirect('/dashboard');
});

module.exports = router;
