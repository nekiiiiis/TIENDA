const express = require("express");
const router = express.Router();
const Producto = require("../models/Producto");

// Obtener todos
router.get("/", async (req, res, next) => {
  try {
    const productos = await Producto.find().sort({ createdAt: -1 });
    res.json(productos);
  } catch (err) {
    next(err);
  }
});

// Crear
router.post("/", async (req, res, next) => {
  try {
    const nuevo = new Producto(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

// Actualizar
router.put("/:id", async (req, res, next) => {
  try {
    const actualizado = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!actualizado) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(actualizado);
  } catch (err) {
    next(err);
  }
});

// Eliminar
router.delete("/:id", async (req, res, next) => {
  try {
    const eliminado = await Producto.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ error: "Producto no encontrado" });
    res.json({ mensaje: "Producto eliminado" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
