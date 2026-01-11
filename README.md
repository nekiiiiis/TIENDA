# PyroShop - Plataforma E-Commerce

## Descripción

Aplicación web de comercio electrónico desarrollada con Node.js, Express, MongoDB y GraphQL. Implementa autenticación JWT, control de acceso basado en roles, carrito de compras persistente, gestión de pedidos y comunicación en tiempo real mediante WebSockets.

---

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Backend | Node.js, Express.js, MongoDB, Mongoose |
| API | REST + GraphQL (Apollo Server) |
| Autenticación | JWT, bcryptjs |
| Tiempo Real | Socket.IO |
| Frontend | HTML5, CSS3, JavaScript |

---

## Estructura del Proyecto

```
Tienda/
├── backend/
│   ├── graphql/
│   │   ├── schema.js          # Definición de tipos GraphQL
│   │   └── resolvers.js       # Lógica de resolución
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Cart.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── ProductRoutes.js
│   │   ├── userRoutes.js
│   │   ├── cartRoutes.js
│   │   └── orderRoutes.js
│   ├── middlewares/
│   │   └── auth.js
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── productos.html
│   ├── carrito.html
│   ├── pedidos.html
│   ├── admin.html
│   ├── chat.html
│   └── styles.css
└── README.md
```

---

## Modelos de Datos

### User
- `username`: String (único)
- `password`: String (hash)
- `role`: enum ['user', 'admin']

### Product
- `nombre`: String
- `precio`: Number
- `descripcion`: String
- `imagen`: String (URL)
- `categoria`: enum ['fuegos-artificiales', 'petardos', 'bengalas', 'cohetes', 'otros']

### Cart
- `userId`: ObjectId (ref: User)
- `items`: Array [{productId, nombre, precio, imagen, cantidad}]

### Order
- `userId`: ObjectId (ref: User)
- `username`: String
- `items`: Array [{productId, nombre, precio, cantidad, subtotal}]
- `total`: Number
- `status`: enum ['pending', 'completed']

---

## API REST

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registro |
| POST | `/auth/login` | Login |

### Productos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/productos` | Listar |
| POST | `/productos` | Crear (admin) |
| PUT | `/productos/:id` | Actualizar (admin) |
| DELETE | `/productos/:id` | Eliminar (admin) |

### Carrito
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/cart` | Obtener carrito |
| POST | `/api/cart/add` | Añadir producto |
| PUT | `/api/cart/update` | Actualizar cantidad |
| DELETE | `/api/cart/remove/:id` | Eliminar producto |
| DELETE | `/api/cart/clear` | Vaciar carrito |

### Pedidos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/orders` | Listar (admin) |
| GET | `/api/orders/my-orders` | Mis pedidos |
| POST | `/api/orders` | Crear pedido |
| PUT | `/api/orders/:id/status` | Cambiar estado (admin) |

### Usuarios (Admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users` | Listar usuarios |
| PUT | `/api/users/:id/role` | Cambiar rol |
| DELETE | `/api/users/:id` | Eliminar usuario |

---

## API GraphQL

**Endpoint:** `/graphql`

### Esquema GraphQL

El esquema se divide en tipos, enumeraciones, queries y mutations.

#### Enumeraciones

```graphql
enum OrderStatus { pending, completed }
enum UserRole { user, admin }
enum ProductCategory { fuegos_artificiales, petardos, bengalas, cohetes, otros }
```

#### Tipos Principales

| Tipo | Descripción | Campos clave |
|------|-------------|--------------|
| `User` | Usuario del sistema | id, username, role |
| `Product` | Producto del catálogo | id, nombre, precio, categoria |
| `Cart` | Carrito de compras | id, userId, items[], total |
| `Order` | Pedido realizado | id, userId, username, items[], total, status |
| `CartItem` | Item del carrito | productId, nombre, precio, cantidad |
| `OrderItem` | Item del pedido | productId, nombre, precio, cantidad, subtotal |

#### Queries

| Query | Descripción | Autenticación |
|-------|-------------|---------------|
| `products` | Lista todos los productos | No |
| `product(id)` | Obtiene un producto | No |
| `productsByCategory(categoria)` | Filtra por categoría | No |
| `searchProducts(search)` | Búsqueda por texto | No |
| `myCart` | Carrito del usuario | Sí |
| `myOrders` | Pedidos del usuario | Sí |
| `orders(status)` | Todos los pedidos | Admin |
| `order(id)` | Detalle de pedido | Sí |
| `users` | Lista usuarios | Admin |
| `user(id)` | Detalle usuario | Admin |

#### Mutations

| Mutation | Descripción | Autenticación |
|----------|-------------|---------------|
| `addToCart(productId, cantidad)` | Añade al carrito | Sí |
| `updateCartItem(productId, cantidad)` | Actualiza cantidad | Sí |
| `removeFromCart(productId)` | Elimina del carrito | Sí |
| `clearCart` | Vacía el carrito | Sí |
| `createOrder` | Crea pedido desde carrito | Sí |
| `updateOrderStatus(id, status)` | Cambia estado | Admin |
| `cancelOrder(id)` | Cancela pedido | Sí |
| `updateUserRole(id, role)` | Cambia rol | Admin |
| `deleteUser(id)` | Elimina usuario | Admin |

---

## Decisiones de Diseño

### Arquitectura Híbrida REST + GraphQL

Se optó por mantener ambas APIs para:
- **REST**: Autenticación (login/register) por su simplicidad y compatibilidad universal
- **GraphQL**: Consultas de productos y gestión de pedidos por su flexibilidad en las consultas

### Desnormalización en Cart y Order

Los items del carrito y pedidos almacenan `nombre`, `precio` e `imagen` del producto directamente, no solo el `productId`. Esto permite:
- Preservar el precio al momento de la compra
- Evitar joins costosos en consultas frecuentes
- Mantener historial preciso si el producto cambia

### Autenticación via Contexto GraphQL

El token JWT se extrae del header `Authorization` y se decodifica en el contexto de Apollo Server:

```javascript
context: async ({ req }) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { user: decoded };
  }
  return {};
}
```

Los resolvers acceden a `context.user` para validar permisos.

### Separación de Responsabilidades

- **Schema (`schema.js`)**: Define la estructura de datos y operaciones disponibles
- **Resolvers (`resolvers.js`)**: Implementa la lógica de negocio y acceso a datos
- **Models**: Definen la estructura en MongoDB con Mongoose

### Control de Acceso

Tres niveles de acceso implementados en los resolvers:
1. **Público**: Queries de productos (sin autenticación)
2. **Usuario autenticado**: Operaciones de carrito y pedidos propios
3. **Administrador**: Gestión de usuarios, todos los pedidos, cambio de estados

---

## Instalación

```bash
cd backend
npm install
```

Crear `.env`:
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/tienda
JWT_SECRET=clave_secreta
```

Iniciar:
```bash
npm run dev
```

Acceder: `http://localhost:3000`

GraphQL Playground: `http://localhost:3000/graphql`

---

## Funcionalidades por Rol

### Usuario
- Registro y autenticación
- Explorar y buscar productos
- Gestionar carrito de compras
- Realizar pedidos
- Consultar historial de pedidos (`/pedidos.html`)
- Chat de soporte

### Administrador
- Gestión CRUD de productos
- Panel de administración (`/admin.html`)
- Gestión de usuarios (roles, eliminación)
- Gestión de pedidos (estados, visualización)
- Responder chat de soporte

---

## Navegación

| Elemento | Usuario | Administrador |
|----------|---------|---------------|
| Clic en nombre | → Mis Pedidos | → Panel Admin |
| Carrito | → `/carrito.html` | → `/carrito.html` |

---

## Autor

Neco Martinez - Programación Web I
