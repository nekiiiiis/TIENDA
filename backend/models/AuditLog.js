const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  role: { type: String },
  action: { type: String, required: true }, // e.g., PRODUCT_CREATE, PRODUCT_UPDATE, PRODUCT_DELETE, PRODUCT_LIST
  method: { type: String },
  path: { type: String },
  resource: { type: String }, // e.g., Producto
  resourceId: { type: String },
  token: { type: String, required: true },
  payload: { type: Object }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);


