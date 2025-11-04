const jwt = require('jsonwebtoken');

// Middleware para verificar el token JWT
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token.' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_default';
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Guardar datos del usuario en req.user
    req.token = token; // Guardar token en la request para auditoría
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Middleware para verificar el rol de administrador
const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
  }

  next();
};

// Middleware combinado: verificar token y luego admin
const verifyTokenAndAdmin = [verifyToken, verifyAdmin];

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyTokenAndAdmin
};

