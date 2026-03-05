const express = require('express');
const Item = require('../models/Item');
const { isAdmin, isLogin } = require('../middleware/sessionRole');

const router = express.Router();

router.post('/', isAdmin, async (req,res)=>{
  const item = await Item.create(req.body);
  res.json(item);
});

router.get('/', isLogin, async (req,res)=>{
  const items = await Item.findAll();
  res.json(items);
});

module.exports = router;
