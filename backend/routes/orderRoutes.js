const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { verifyToken, verifyTokenAndAdmin } = require('../middlewares/auth');

// Obtener todos los pedidos (solo admin)
router.get('/', verifyTokenAndAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Obtener pedidos del usuario actual
router.get('/my-orders', verifyToken, async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Obtener un pedido por ID
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Solo el dueño o admin puede ver el pedido
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado para ver este pedido' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Crear pedido (desde el carrito)
router.post('/', verifyToken, async (req, res, next) => {
  try {
    // Obtener el carrito del usuario
    const cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Crear items del pedido con subtotales
    const orderItems = cart.items.map(item => ({
      productId: item.productId,
      nombre: item.nombre,
      precio: item.precio,
      cantidad: item.cantidad,
      subtotal: item.precio * item.cantidad
    }));

    // Calcular total
    const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Crear el pedido
    const order = await Order.create({
      userId: req.user.id,
      username: req.user.username,
      items: orderItems,
      total,
      status: 'pending'
    });

    // Vaciar el carrito
    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: 'Pedido creado exitosamente',
      order
    });
  } catch (err) {
    next(err);
  }
});

// Actualizar estado del pedido (solo admin)
router.put('/:id/status', verifyTokenAndAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['pending', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser "pending" o "completed"' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json({
      message: 'Estado del pedido actualizado',
      order
    });
  } catch (err) {
    next(err);
  }
});

// Cancelar pedido
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Solo el dueño o admin puede cancelar
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado para cancelar este pedido' });
    }

    if (order.status === 'completed') {
      return res.status(400).json({ error: 'No se puede cancelar un pedido completado' });
    }

    await Order.findByIdAndDelete(req.params.id);

    res.json({ message: 'Pedido cancelado correctamente' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
