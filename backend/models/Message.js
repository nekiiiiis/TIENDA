const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderUsername: { type: String, required: true, trim: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null para admins
  message: { type: String, required: true, trim: true },
  isFromAdmin: { type: Boolean, default: false },
  conversationId: { type: String, required: true }, // Para agrupar mensajes por conversación
  read: { type: Boolean, default: false }
}, { timestamps: true });

// Índices para búsquedas rápidas
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ receiverId: 1 });

module.exports = mongoose.model('Message', messageSchema);


