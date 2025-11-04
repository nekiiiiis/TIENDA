const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middlewares/auth');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// Registrar un nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Validar que se proporcionen username y password
    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Crear nuevo usuario
    const user = new User({
      username,
      password,
      role: role || 'user' // Por defecto 'user'
    });

    await user.save();

    // Generar token JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_default';
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Auditoría simple (no guardar contraseñas)
    AuditLog.create({
      userId: user._id,
      username: user.username,
      role: user.role,
      action: 'AUTH_REGISTER',
      method: 'POST',
      path: '/auth/register',
      resource: 'User',
      resourceId: user._id.toString(),
      token,
      payload: { username: user.username, role: user.role }
    }).catch(() => {});

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login de usuario
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar que se proporcionen username y password
    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    // Buscar usuario
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_default';
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Auditoría simple
    AuditLog.create({
      userId: user._id,
      username: user.username,
      role: user.role,
      action: 'AUTH_LOGIN',
      method: 'POST',
      path: '/auth/login',
      resource: 'User',
      resourceId: user._id.toString(),
      token,
      payload: { username: user.username }
    }).catch(() => {});

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener información del usuario actual (protegida)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar contraseña (protegida)
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Se requieren la contraseña actual y la nueva' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save(); // El middleware pre-save hasheará la nueva contraseña

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

