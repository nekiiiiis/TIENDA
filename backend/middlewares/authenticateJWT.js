// Middleware de autenticación JWT
// Expone `authenticateJWT` reutilizando el middleware existente

const { verifyToken } = require('./auth');

const authenticateJWT = (req, res, next) => verifyToken(req, res, next);

module.exports = { authenticateJWT };

