const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  token: { type: String, required: true },
  emittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);


