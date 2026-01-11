const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { verifyToken } = require('../middlewares/auth');

// Obtener el carrito del usuario
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      cart = await Cart.create({
        userId: req.user.id,
        items: []
      });
    }

    res.json({
      ...cart.toObject(),
      total: cart.getTotal()
    });
  } catch (err) {
    next(err);
  }
});

// Añadir producto al carrito
router.post('/add', verifyToken, async (req, res, next) => {
  try {
    const { productId, cantidad = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Se requiere el ID del producto' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      cart = new Cart({
        userId: req.user.id,
        items: []
      });
    }

    // Verificar si el producto ya está en el carrito
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].cantidad += cantidad;
    } else {
      cart.items.push({
        productId: product._id,
        nombre: product.nombre,
        precio: product.precio,
        imagen: product.imagen,
        cantidad
      });
    }

    await cart.save();

    res.json({
      message: 'Producto añadido al carrito',
      cart: {
        ...cart.toObject(),
        total: cart.getTotal()
      }
    });
  } catch (err) {
    next(err);
  }
});

// Actualizar cantidad de un producto en el carrito
router.put('/update', verifyToken, async (req, res, next) => {
  try {
    const { productId, cantidad } = req.body;

    if (!productId || cantidad === undefined) {
      return res.status(400).json({ error: 'Se requiere productId y cantidad' });
    }

    if (cantidad < 1) {
      return res.status(400).json({ error: 'La cantidad debe ser al menos 1' });
    }

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }

    cart.items[itemIndex].cantidad = cantidad;
    await cart.save();

    res.json({
      message: 'Carrito actualizado',
      cart: {
        ...cart.toObject(),
        total: cart.getTotal()
      }
    });
  } catch (err) {
    next(err);
  }
});

// Eliminar producto del carrito
router.delete('/remove/:productId', verifyToken, async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    cart.items = cart.items.filter(
      item => item.productId.toString() !== productId
    );

    await cart.save();

    res.json({
      message: 'Producto eliminado del carrito',
      cart: {
        ...cart.toObject(),
        total: cart.getTotal()
      }
    });
  } catch (err) {
    next(err);
  }
});

// Vaciar carrito
router.delete('/clear', verifyToken, async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) {
      cart = new Cart({
        userId: req.user.id,
        items: []
      });
    } else {
      cart.items = [];
    }

    await cart.save();

    res.json({
      message: 'Carrito vaciado',
      cart: {
        ...cart.toObject(),
        total: 0
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
