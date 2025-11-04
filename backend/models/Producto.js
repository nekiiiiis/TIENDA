const mongoose = require("mongoose");

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  precio: { type: Number, required: true, min: 0 },
  descripcion: { type: String, required: true, trim: true },
  imagen: { type: String, default: null } // URL de la imagen
}, { timestamps: true });

module.exports = mongoose.model("Producto", productoSchema);