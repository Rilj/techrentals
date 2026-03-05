const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  action: DataTypes.STRING,
  userId: DataTypes.INTEGER
});

const ActivityLog = require('../models/ActivityLog');

await ActivityLog.create({
  action: `Approved loan ID ${loan.id}`,
  userId: req.user.id
});


module.exports = ActivityLog;
