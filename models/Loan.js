const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Loan = sequelize.define('Loan', {
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalPrice: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  fine: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  fineType: {  // ✅ Tambah: jenis denda
    type: DataTypes.ENUM('none', 'late', 'damaged', 'lost'),
    defaultValue: 'none'
  },
  fineDescription: {  // ✅ Tambah: keterangan denda
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'borrowed',
      'return_requested',
      'returned',
      'rejected'
    ),
    defaultValue: 'pending'
  }
});

module.exports = Loan;
const User = require('./User');
const Item = require('./Item');

User.hasMany(Loan);
Loan.belongsTo(User);

Item.hasMany(Loan);
Loan.belongsTo(Item);
