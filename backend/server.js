const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const { ApolloServer } = require('@apollo/server');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const Message = require('./models/Message');
const typeDefs = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

// Cargar variables de entorno
dotenv.config();

const productRoutes = require("./routes/ProductRoutes");
const authRouter = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");

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

// Rutas API REST
app.use("/auth", authRouter);
app.use("/productos", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Rutas HTML
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/productos.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/productos.html"));
});

app.get("/chat.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/chat.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin.html"));
});

app.get("/carrito.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/carrito.html"));
});

// Función para extraer usuario del token
const getUserFromToken = (token) => {
  if (!token) return null;
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_default';
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
};

// Autenticación de sockets con JWT
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || null;
    if (!token) {
      return next(new Error('Authentication error: token missing'));
    }
    const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_default';
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch (err) {
    return next(new Error('Authentication error: invalid token'));
  }
});

// Socket.IO - Chat en tiempo real
io.on('connection', (socket) => {
  const username = socket.user?.username || 'usuario';
  const userId = socket.user?.id;
  const userRole = socket.user?.role || 'user';
  console.log(`Nuevo cliente conectado al chat: ${socket.id} (${username}, ${userRole})`);

  if (userRole === 'admin') {
    socket.join('admins');
  } else {
    const conversationId = `user-${userId}`;
    socket.join(conversationId);
    socket.conversationId = conversationId;
    socket.to('admins').emit('user online', { userId, username, conversationId });
  }

  socket.on('request conversations', async () => {
    if (userRole !== 'admin') return;
    try {
      const conversations = await Message.aggregate([
        {
          $group: {
            _id: '$conversationId',
            lastMessage: { $last: '$message' },
            lastMessageTime: { $last: '$createdAt' },
            senderUsername: { $last: '$senderUsername' },
            senderId: { $last: '$senderId' },
            unreadCount: {
              $sum: { $cond: [{ $and: [{ $eq: ['$read', false] }, { $eq: ['$isFromAdmin', false] }] }, 1, 0] }
            }
          }
        },
        { $sort: { lastMessageTime: -1 } }
      ]);
      socket.emit('conversations list', conversations);
    } catch (err) {
      console.error('Error obteniendo conversaciones:', err);
    }
  });

  socket.on('join conversation', async (conversationId) => {
    if (userRole !== 'admin') return;
    socket.join(conversationId);
    try {
      const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).limit(100);
      socket.emit('conversation history', { conversationId, messages });
      await Message.updateMany({ conversationId, isFromAdmin: false, read: false }, { read: true });
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  });

  socket.on('chat message', async (data) => {
    const { message, conversationId, receiverId } = data;
    if (!message) return;
    const isFromAdmin = userRole === 'admin';
    const targetConversation = conversationId || socket.conversationId;
    if (!targetConversation) return;
    try {
      const newMessage = await Message.create({
        senderId: userId,
        senderUsername: username,
        receiverId: receiverId || null,
        message,
        isFromAdmin,
        conversationId: targetConversation,
        read: false
      });
      const messageData = {
        _id: newMessage._id,
        message,
        senderUsername: username,
        senderId: userId,
        isFromAdmin,
        conversationId: targetConversation,
        timestamp: new Date().toLocaleTimeString(),
        createdAt: newMessage.createdAt
      };
      io.to(targetConversation).emit('chat message', messageData);
      if (!isFromAdmin) {
        socket.to('admins').emit('new message notification', {
          conversationId: targetConversation,
          message,
          senderUsername: username,
          senderId: userId
        });
      }
    } catch (err) {
      console.error('Error guardando mensaje:', err);
    }
  });

  socket.on('request history', async () => {
    if (userRole === 'admin') return;
    try {
      const conversationId = `user-${userId}`;
      const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).limit(100);
      socket.emit('conversation history', { conversationId, messages });
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  });

  socket.on('delete message', async (data) => {
    if (userRole !== 'admin') return;
    try {
      const { messageId, conversationId } = data;
      await Message.findByIdAndDelete(messageId);
      io.to(conversationId).emit('message deleted', { messageId, conversationId });
      socket.to('admins').emit('refresh conversations');
    } catch (err) {
      console.error('Error eliminando mensaje:', err);
    }
  });

  socket.on('delete conversation', async (data) => {
    if (userRole !== 'admin') return;
    try {
      const { conversationId } = data;
      await Message.deleteMany({ conversationId });
      io.to(conversationId).emit('conversation deleted', { conversationId });
      io.to('admins').emit('refresh conversations');
      socket.emit('conversation deleted success', { conversationId });
    } catch (err) {
      console.error('Error eliminando conversación:', err);
    }
  });

  socket.on('disconnect', () => {
    if (userRole !== 'admin') {
      socket.to('admins').emit('user offline', {
        userId,
        username,
        conversationId: socket.conversationId
      });
    }
  });
});

// Configurar Apollo Server y conexión a MongoDB
async function startServer() {
  const PORT = process.env.PORT || 3000;
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tienda";

  await mongoose.connect(MONGO_URI);
  console.log("Conectado a MongoDB");

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer: server })],
    introspection: true,
  });

  await apolloServer.start();

  // GraphQL Playground HTML para GET requests
  const graphqlPlaygroundHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GraphQL Playground - PyroShop</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1e272e 0%, #2c3e50 100%); min-height: 100vh; color: white; }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2.5rem; margin-bottom: 10px; }
    h1 span { color: #ff4757; }
    .subtitle { color: rgba(255,255,255,0.7); margin-bottom: 40px; }
    .playground-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .panel { background: rgba(255,255,255,0.05); border-radius: 15px; padding: 20px; }
    .panel h3 { color: #ffa502; margin-bottom: 15px; font-size: 1.1rem; }
    textarea { width: 100%; height: 200px; background: #1e272e; border: 2px solid rgba(255,255,255,0.1); border-radius: 10px; color: #a8e6cf; font-family: 'Courier New', monospace; font-size: 14px; padding: 15px; resize: vertical; }
    textarea:focus { outline: none; border-color: #ff4757; }
    #result { height: 250px; background: #1e272e; color: #ffd93d; overflow: auto; white-space: pre-wrap; }
    .btn-execute { background: linear-gradient(135deg, #ff4757 0%, #ffa502 100%); color: white; border: none; padding: 15px 40px; border-radius: 30px; font-size: 16px; font-weight: 600; cursor: pointer; margin: 20px 0; transition: all 0.3s; }
    .btn-execute:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(255,71,87,0.3); }
    .examples { margin-top: 40px; }
    .example-card { background: rgba(255,255,255,0.05); border-radius: 15px; padding: 20px; margin-bottom: 15px; cursor: pointer; transition: all 0.3s; border: 2px solid transparent; }
    .example-card:hover { border-color: #ff4757; transform: translateX(5px); }
    .example-card h4 { color: #ffa502; margin-bottom: 10px; }
    .example-card code { display: block; background: #1e272e; padding: 15px; border-radius: 8px; font-size: 13px; color: #a8e6cf; overflow-x: auto; }
    .auth-info { background: rgba(255,165,2,0.2); border-left: 4px solid #ffa502; padding: 15px 20px; border-radius: 0 10px 10px 0; margin-bottom: 30px; }
    .auth-info p { margin: 5px 0; }
    .auth-info code { background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px; }
    @media (max-width: 768px) { .playground-container { grid-template-columns: 1fr; } h1 { font-size: 1.8rem; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 GraphQL <span>Playground</span></h1>
    <p class="subtitle">API GraphQL de PyroShop - E-Commerce</p>
    
    <div class="auth-info">
      <p><strong>🔐 Autenticación:</strong> Algunas queries/mutations requieren autenticación.</p>
      <p>Añade el header: <code>Authorization: Bearer TU_TOKEN_JWT</code></p>
    </div>

    <div class="playground-container">
      <div class="panel">
        <h3>📝 Query / Mutation</h3>
        <textarea id="query" placeholder="Escribe tu query GraphQL aquí...">query {
  products {
    id
    nombre
    precio
    categoria
  }
}</textarea>
      </div>
      <div class="panel">
        <h3>📋 Variables (JSON)</h3>
        <textarea id="variables" placeholder='{"key": "value"}'>{}</textarea>
      </div>
    </div>

    <div class="panel">
      <h3>🔑 Token JWT (opcional)</h3>
      <textarea id="token" style="height: 60px;" placeholder="Pega tu token JWT aquí si necesitas autenticación..."></textarea>
    </div>

    <button class="btn-execute" onclick="executeQuery()">▶️ Ejecutar Query</button>

    <div class="panel">
      <h3>📤 Resultado</h3>
      <div id="result">// El resultado aparecerá aquí...</div>
    </div>

    <div class="examples">
      <h2 style="margin-bottom: 20px;">📚 Ejemplos de Queries</h2>
      
      <div class="example-card" onclick="loadExample('products')">
        <h4>📦 Obtener Productos</h4>
        <code>query { products { id nombre precio categoria descripcion } }</code>
      </div>

      <div class="example-card" onclick="loadExample('orders')">
        <h4>📋 Obtener Pedidos (Admin)</h4>
        <code>query { orders { id username total status createdAt items { nombre cantidad } } }</code>
      </div>

      <div class="example-card" onclick="loadExample('myCart')">
        <h4>🛒 Mi Carrito (Auth)</h4>
        <code>query { myCart { id items { nombre precio cantidad } total } }</code>
      </div>

      <div class="example-card" onclick="loadExample('addToCart')">
        <h4>➕ Añadir al Carrito (Auth)</h4>
        <code>mutation { addToCart(productId: "ID_PRODUCTO", cantidad: 1) { id total } }</code>
      </div>

      <div class="example-card" onclick="loadExample('createOrder')">
        <h4>💳 Crear Pedido (Auth)</h4>
        <code>mutation { createOrder { id total status createdAt } }</code>
      </div>

      <div class="example-card" onclick="loadExample('users')">
        <h4>👥 Listar Usuarios (Admin)</h4>
        <code>query { users { id username role createdAt } }</code>
      </div>
    </div>
  </div>

  <script>
    const examples = {
      products: 'query {\\n  products {\\n    id\\n    nombre\\n    precio\\n    categoria\\n    descripcion\\n  }\\n}',
      orders: 'query {\\n  orders {\\n    id\\n    username\\n    total\\n    status\\n    createdAt\\n    items {\\n      nombre\\n      cantidad\\n      precio\\n    }\\n  }\\n}',
      myCart: 'query {\\n  myCart {\\n    id\\n    items {\\n      productId\\n      nombre\\n      precio\\n      cantidad\\n    }\\n    total\\n  }\\n}',
      addToCart: 'mutation {\\n  addToCart(productId: "REEMPLAZA_CON_ID", cantidad: 1) {\\n    id\\n    items {\\n      nombre\\n      cantidad\\n    }\\n    total\\n  }\\n}',
      createOrder: 'mutation {\\n  createOrder {\\n    id\\n    total\\n    status\\n    createdAt\\n    items {\\n      nombre\\n      cantidad\\n      subtotal\\n    }\\n  }\\n}',
      users: 'query {\\n  users {\\n    id\\n    username\\n    role\\n    createdAt\\n  }\\n}'
    };

    function loadExample(name) {
      document.getElementById('query').value = examples[name];
    }

    async function executeQuery() {
      const query = document.getElementById('query').value;
      const variables = document.getElementById('variables').value;
      const token = document.getElementById('token').value.trim();
      const resultDiv = document.getElementById('result');

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const response = await fetch('/graphql', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query,
            variables: JSON.parse(variables || '{}')
          })
        });

        const data = await response.json();
        resultDiv.textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        resultDiv.textContent = 'Error: ' + error.message;
      }
    }
  </script>
</body>
</html>`;

  // Endpoint GraphQL
  app.get('/graphql', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(graphqlPlaygroundHTML);
  });

  app.post('/graphql', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      const user = getUserFromToken(token);
      
      if (!req.body.query) {
        return res.status(400).json({ 
          errors: [{ message: 'Se requiere una query GraphQL' }] 
        });
      }

      const response = await apolloServer.executeOperation(
        {
          query: req.body.query,
          variables: req.body.variables || {},
          operationName: req.body.operationName,
        },
        { contextValue: { user } }
      );

      if (response.body.kind === 'single') {
        res.json(response.body.singleResult);
      } else {
        res.json({ errors: [{ message: 'Incremental delivery not supported' }] });
      }
    } catch (error) {
      console.error('GraphQL Error:', error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });

  console.log('Apollo Server iniciado en /graphql');

  // Middleware de errores (después de GraphQL)
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`URL: http://0.0.0.0:${PORT}`);
    console.log(`GraphQL Playground: http://0.0.0.0:${PORT}/graphql`);
  });
}

startServer().catch(err => {
  console.error("Error al iniciar el servidor:", err);
  process.exit(1);
});

module.exports = app;
