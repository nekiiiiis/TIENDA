const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Cart = require('../models/Cart');
const { verifyToken, verifyTokenAndAdmin } = require('../middlewares/auth');

// Obtener todos los usuarios (solo admin)
router.get('/', verifyTokenAndAdmin, async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Obtener un usuario por ID (solo admin)
router.get('/:id', verifyTokenAndAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Actualizar rol de usuario (solo admin)
router.put('/:id/role', verifyTokenAndAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido. Debe ser "user" o "admin"' });
    }

    // No permitir que el admin cambie su propio rol
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      message: 'Rol actualizado correctamente',
      user
    });
  } catch (err) {
    next(err);
  }
});

// Eliminar usuario (solo admin)
router.delete('/:id', verifyTokenAndAdmin, async (req, res, next) => {
  try {
    // No permitir que el admin se elimine a sí mismo
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Eliminar el carrito del usuario
    await Cart.deleteOne({ userId: req.params.id });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
