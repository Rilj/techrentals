const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Item = sequelize.define('Item', {
  nama_barang: {
    type: DataTypes.STRING,
    allowNull: false
  },
  kode_unit: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  image: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('tersedia','dibooking','dipinjam'),
    defaultValue: 'tersedia'
  }
});

module.exports = Item;
