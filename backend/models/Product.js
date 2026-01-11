const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  precio: { type: Number, required: true, min: 0 },
  descripcion: { type: String, required: true, trim: true },
  imagen: { type: String, default: null }, // URL de la imagen
  categoria: { 
    type: String, 
    required: true,
    enum: ['fuegos-artificiales', 'petardos', 'bengalas', 'cohetes', 'otros'],
    default: 'otros'
  }
}, { timestamps: true });

module.exports = mongoose.model("Producto", productSchema);

