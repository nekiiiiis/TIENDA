const Product = require('../models/Product');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User');

const resolvers = {
  Query: {
    // ==================== PRODUCTOS ====================
    products: async () => {
      return await Product.find().sort({ createdAt: -1 });
    },

    product: async (_, { id }) => {
      return await Product.findById(id);
    },

    productsByCategory: async (_, { categoria }) => {
      return await Product.find({ categoria }).sort({ createdAt: -1 });
    },

    searchProducts: async (_, { search }) => {
      const regex = new RegExp(search, 'i');
      return await Product.find({
        $or: [
          { nombre: regex },
          { descripcion: regex }
        ]
      }).sort({ createdAt: -1 });
    },

    // ==================== PEDIDOS ====================
    orders: async (_, { status }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('No autorizado. Se requiere rol de administrador.');
      }
      
      const filter = status ? { status } : {};
      return await Order.find(filter).sort({ createdAt: -1 });
    },

    order: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error('No autorizado. Debes iniciar sesión.');
      }

      const order = await Order.findById(id);
      if (!order) {
        throw new Error('Pedido no encontrado');
      }

      // Solo el dueño o admin puede ver el pedido
      if (order.userId.toString() !== context.user.id && context.user.role !== 'admin') {
        throw new Error('No autorizado para ver este pedido');
      }

      return order;
    },

    myOrders: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autorizado. Debes iniciar sesión.');
      }

      return await Order.find({ userId: context.user.id }).sort({ createdAt: -1 });
    },

    // ==================== CARRITO ====================
    myCart: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autorizado. Debes iniciar sesión.');
      }

      let cart = await Cart.findOne({ userId: context.user.id });
      
      if (!cart) {
        cart = await Cart.create({
          userId: context.user.id,
          items: []
        });
      }

      return {
        ...cart.toObject(),
        id: cart._id,
        total: cart.getTotal()
      };
    },

    // ==================== USUARIOS (ADMIN) ====================
    users: async (_, __, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('No autorizado. Se requiere rol de administrador.');
      }

      return await User.find().select('-password').sort({ createdAt: -1 });
    },

    user: async (_, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('No autorizado. Se requiere rol de administrador.');
      }

      return await User.findById(id).select('-password');
    }
  },

  Mutation: {
    // ==================== CARRITO ====================
    addToCart: async (_, { productId, cantidad = 1 }, context) => {
      if (!context.user) {
        throw new Error('No autorizado. Debes iniciar sesión.');
      }

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }

      let cart = await Cart.findOne({ userId: context.user.id });
      
      if (!cart) {
        cart = new Cart({
          userId: context.user.id,
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

      return {
        ...cart.toObject(),
        id: cart._id,
        total: cart.getTotal()
      };
    },

    updateCartItem: async (_, { productId, cantidad }, context) => {
      if (!context.user) {
        throw new Error('No autorizado. Debes iniciar sesión.');
      }

      if (cantidad < 1) {
        throw new Error('La cantidad debe ser al menos 1');
      }

      const cart = await Cart.findOne({ userId: context.user.id });
      if (!cart) {
        throw new Error('Carrito no encontrado');
      }

      const itemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
      );

      if (itemIndex === -1) {
        throw new Error('Producto no encontrado en el carrito');
      }

      cart.items[itemIndex].cantidad = cantidad;
      await cart.save();

      return {
        ...cart.toObject(),
        id: cart._id,
        total: cart.getTotal()
      };
    },

    removeFromCart: async (_, { productId }, context) => {
      if (!context.user) {
        throw new Error('No autorizado. Debes iniciar sesión.');
      }

      const cart = await Cart.findOne({ userId: context.user.id });
      if (!cart) {
        throw new Error('Carrito no encontrado');
      }

      cart.items = cart.items.filter(
        item => item.productId.toString() !== productId
      );

      await cart.save();

      return {
        ...cart.toObject(),
        id: cart._id,
        total: cart.getTotal()
      };
    },

    clearCart: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autorizado. Debes iniciar sesión.');
      }

      let cart = await Cart.findOne({ userId: context.user.id });
      
      if (!cart) {
        cart = new Cart({
          userId: context.user.id,
          items: []
        });
      } else {
        cart.items = [];
      }

      await cart.save();

      return {
        ...cart.toObject(),
        id: cart._id,
        total: 0
      };
    },

    // ==================== PEDIDOS ====================
    createOrder: async (_, __, context) => {
      if (!context.user) {
        throw new Error('No autorizado. Debes iniciar sesión.');
      }

      // Obtener el carrito del usuario
      const cart = await Cart.findOne({ userId: context.user.id });
      
      if (!cart || cart.items.length === 0) {
        throw new Error('El carrito está vacío');
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
        userId: context.user.id,
        username: context.user.username,
        items: orderItems,
        total,
        status: 'pending'
      });

      // Vaciar el carrito
      cart.items = [];
      await cart.save();

      return order;
    },

    updateOrderStatus: async (_, { id, status }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('No autorizado. Se requiere rol de administrador.');
      }

      const order = await Order.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!order) {
        throw new Error('Pedido no encontrado');
      }

      return order;
    },

    cancelOrder: async (_, { id }, context) => {
      if (!context.user) {
        throw new Error('No autorizado. Debes iniciar sesión.');
      }

      const order = await Order.findById(id);
      
      if (!order) {
        throw new Error('Pedido no encontrado');
      }

      // Solo el dueño o admin puede cancelar
      if (order.userId.toString() !== context.user.id && context.user.role !== 'admin') {
        throw new Error('No autorizado para cancelar este pedido');
      }

      if (order.status === 'completed') {
        throw new Error('No se puede cancelar un pedido completado');
      }

      // Eliminar el pedido
      await Order.findByIdAndDelete(id);

      return order;
    },

    // ==================== USUARIOS (ADMIN) ====================
    updateUserRole: async (_, { id, role }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('No autorizado. Se requiere rol de administrador.');
      }

      // No permitir que el admin se cambie el rol a sí mismo
      if (id === context.user.id) {
        throw new Error('No puedes cambiar tu propio rol');
      }

      const user = await User.findByIdAndUpdate(
        id,
        { role },
        { new: true }
      ).select('-password');

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return user;
    },

    deleteUser: async (_, { id }, context) => {
      if (!context.user || context.user.role !== 'admin') {
        throw new Error('No autorizado. Se requiere rol de administrador.');
      }

      // No permitir que el admin se elimine a sí mismo
      if (id === context.user.id) {
        throw new Error('No puedes eliminar tu propia cuenta');
      }

      const user = await User.findByIdAndDelete(id);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // También eliminar el carrito y pedidos del usuario
      await Cart.deleteOne({ userId: id });

      return true;
    }
  },

  // Resolvers de campos
  Product: {
    id: (parent) => parent._id || parent.id
  },

  Order: {
    id: (parent) => parent._id || parent.id
  },

  Cart: {
    id: (parent) => parent._id || parent.id
  },

  User: {
    id: (parent) => parent._id || parent.id
  }
};

module.exports = resolvers;
