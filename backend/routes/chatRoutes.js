const path = require('path');
const express = require('express');
const { verifyToken } = require('../middlewares/auth');

const router = express.Router();

// Página de chat protegida
router.get('/', verifyToken, (req, res) => {
  const chatPath = path.join(__dirname, '../../frontend/chat.html');
  res.sendFile(chatPath);
});

module.exports = router;


