const express = require("express");
const router = express.Router();
const Producto = require("../models/Producto");
const { verifyToken, verifyTokenAndAdmin } = require("../middlewares/auth");
const AuditLog = require("../models/AuditLog");

// Obtener todos
router.get("/", async (req, res, next) => {
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json(productos);
    // Registrar auditoría si hay token (opcional para GET)
    if (req.header('Authorization')) {
      const token = req.header('Authorization').replace('Bearer ', '');
      const user = req.user || {};
      AuditLog.create({
        userId: user.id,
        username: user.username,
        role: user.role,
        action: 'PRODUCT_LIST',
        method: 'GET',
        path: '/productos',
        resource: 'Producto',
        token
      }).catch(() => {});
    }
  } catch (err) {
    next(err);
  }
});

// Crear (solo admin)
router.post("/", verifyTokenAndAdmin, async (req, res, next) => {
  try {
    const productoData = {
      nombre: req.body.nombre,
      precio: req.body.precio,
      descripcion: req.body.descripcion,
      imagen: req.body.imagen || null // URL de la imagen
    };

    const nuevo = new Producto(productoData);
    await nuevo.save();
    res.status(201).json(nuevo);
    // Auditoría
    AuditLog.create({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'PRODUCT_CREATE',
      method: 'POST',
      path: '/productos',
      resource: 'Producto',
      resourceId: nuevo._id?.toString(),
      token: req.token,
      payload: req.body
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
});

// Actualizar (solo admin)
router.put("/:id", verifyTokenAndAdmin, async (req, res, next) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });

    const productoData = {
      nombre: req.body.nombre,
      precio: req.body.precio,
      descripcion: req.body.descripcion,
      imagen: req.body.imagen !== undefined ? req.body.imagen : producto.imagen // Mantener imagen actual si no se proporciona nueva
    };

    const actualizado = await Producto.findByIdAndUpdate(req.params.id, productoData, { new: true });
    res.json(actualizado);
    // Auditoría
    AuditLog.create({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'PRODUCT_UPDATE',
      method: 'PUT',
      path: `/productos/${req.params.id}`,
      resource: 'Producto',
      resourceId: req.params.id,
      token: req.token,
      payload: req.body
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
});

// Eliminar (solo admin)
router.delete("/:id", verifyTokenAndAdmin, async (req, res, next) => {
  try {
    const eliminado = await Producto.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ error: "Producto no encontrado" });
    
    res.json({ mensaje: "Producto eliminado" });
    // Auditoría
    AuditLog.create({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'PRODUCT_DELETE',
      method: 'DELETE',
      path: `/productos/${req.params.id}`,
      resource: 'Producto',
      resourceId: req.params.id,
      token: req.token
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
