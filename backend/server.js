const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');

// Cargar variables de entorno
dotenv.config();

const productosRouter = require("./routes/productos");
const productRoutes = require("./routes/productRoutes");
const chatRoutes = require("./routes/chatRoutes");
const authRouter = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

// Rutas API
app.use("/auth", authRouter);
app.use("/productos", productosRouter);
app.use("/products", productRoutes);
app.use("/chat", chatRoutes);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Ruta para devolver index.html cuando entren a /
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Middleware de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Error interno del servidor" });
});

// Autenticación de sockets con JWT
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || null;
    if (!token) {
      return next(new Error('Authentication error: token missing'));
    }
    const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_default';
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded; // { id, username, role }
    return next();
  } catch (err) {
    return next(new Error('Authentication error: invalid token'));
  }
});

// Socket.IO - Chat en tiempo real (solo usuarios autenticados)
io.on('connection', (socket) => {
  const username = socket.user?.username || 'usuario';
  const userId = socket.user?.id;
  const token = socket.handshake?.auth?.token;
  console.log(`Nuevo cliente conectado al chat: ${socket.id} (${username})`);

  // Notificar a otros usuarios que alguien se unió
  socket.broadcast.emit('user joined', username);

  socket.on('chat message', (msg) => {
    const messageText = typeof msg === 'string' ? msg : msg?.message;
    if (!messageText) return;
    // Persistir mensaje
    if (userId && token) {
      Message.create({
        userId,
        username,
        message: messageText,
        token
      }).catch(err => console.error('Error guardando mensaje:', err));
    }
    io.emit('chat message', {
      message: messageText,
      username,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado del chat:', socket.id);
  });
});

// Conexión a Mongo y arranque del servidor
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tienda";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("Conectado a MongoDB");
    server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("Error al conectar a MongoDB", err);
    process.exit(1);
  });


module.exports = app;