# Gestión de Productos - Sistema Web Full Stack

Sistema web de gestión de productos desarrollado con **Node.js, Express, MongoDB y Vanilla JavaScript**. Permite a los usuarios registrarse, iniciar sesión, ver productos y a los administradores gestionar productos (crear, editar, eliminar) con imágenes mediante URLs. Incluye un chat en tiempo real para comunicación entre usuarios.

---

## Resumen de Funcionalidades

### Autenticación
- Registro de usuarios
- Inicio de sesión con JWT
- Roles de usuario (admin/usuario)
- Protección de rutas según permisos

### Gestión de Productos
- **Usuarios**: Visualización de productos con imágenes, búsqueda, ordenamiento y paginación
- **Administradores**: 
  - Crear productos con nombre, precio, descripción e imagen (URL)
  - Editar productos existentes
  - Eliminar productos
  - Añadir y eliminar imagenes

### Chat en Tiempo Real
- Chat en vivo entre usuarios autenticados
- Persistencia de mensajes en base de datos
- Notificaciones de usuarios conectados

### Auditoría
- Registro de todas las acciones realizadas por usuarios y administradores
- Logs de autenticación, creación, actualización y eliminación de productos

---

## Estructura del Proyecto

```
TIENDA/
├── backend/
│   ├── config.js                 # Configuración de variables de entorno
│   ├── server.js                 # Servidor principal Express + Socket.IO
│   ├── package.json              # Dependencias del backend
│   ├── routes/
│   │   ├── authRoutes.js         # Rutas de autenticación
│   │   ├── productRoutes.js      # Rutas de productos (alias)
│   │   ├── productos.js          # Rutas de productos
│   │   └── chatRoutes.js         # Rutas de chat
│   ├── models/
│   │   ├── User.js               # Modelo de usuario
│   │   ├── Product.js            # Modelo de producto (alias)
│   │   ├── Producto.js           # Modelo de producto
│   │   ├── Message.js            # Modelo de mensajes del chat
│   │   └── AuditLog.js           # Modelo de auditoría
│   ├── middlewares/
│   │   ├── auth.js               # Middleware de autenticación JWT
│   │   └── authenticateJWT.js    # Alias del middleware
│   └── tests/
│       └── productos.test.js     # Tests de productos
└── frontend/
    ├── index.html                # Página principal
    ├── main.js                   # Lógica del frontend
    ├── styles.css                # Estilos CSS
    ├── client.js                 # Cliente adicional
    └── chat.html                 # Página de chat
```

---

## Librerías Utilizadas y su Uso

### Backend

**Dependencias principales:**
- **express** (^4.19.2): Framework web para Node.js, maneja las rutas y middleware del servidor
- **mongoose** (^8.0.0): ODM para MongoDB, gestiona los modelos y conexión a la base de datos
- **socket.io** (^4.7.2): Comunicación en tiempo real bidireccional para el chat
- **jsonwebtoken** (^9.0.2): Generación y verificación de tokens JWT para autenticación
- **bcryptjs** (^3.0.2): Hash de contraseñas para almacenamiento seguro
- **cors** (^2.8.5): Permite solicitudes cross-origin desde el frontend
- **dotenv** (^16.4.5): Carga variables de entorno desde archivo .env
- **morgan** (^1.10.0): Logger HTTP para desarrollo, registra las peticiones al servidor

**Dependencias de desarrollo:**
- **nodemon** (^3.1.0): Reinicia automáticamente el servidor durante el desarrollo
- **jest** (^29.7.0): Framework de testing para pruebas unitarias
- **supertest** (^6.3.4): Testing de APIs HTTP
- **eslint** (^9.0.0): Linter para análisis de código
- **prettier** (^3.3.2): Formateador automático de código

### Frontend

- **Vanilla JavaScript**: Lógica del frontend sin frameworks
- **Socket.IO Client**: Cliente para conexión al servidor de Socket.IO
- **CSS3**: Estilos modernos con gradientes, transiciones y diseño responsive

---

## Instrucciones para Correr en Local

### 1. Prerrequisitos

- Node.js (versión 14 o superior)
- MongoDB instalado y corriendo localmente
- npm o yarn

### 2. Configuración del archivo .env

Crear un archivo `.env` en la carpeta `backend/` con el siguiente contenido:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/tienda
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
NODE_ENV=development
```

**Nota**: El archivo `.env` está en `.gitignore` y no debe subirse al repositorio.

### 3. Instalación de dependencias

```bash
cd backend
npm install
```

### 4. Iniciar MongoDB

Asegúrate de que MongoDB esté corriendo:

```bash
# En Linux/Mac
mongod

# O si tienes MongoDB como servicio
sudo systemctl start mongod
```

### 5. Comandos para ejecutar

#### Desarrollo (con auto-reload)
```bash
cd backend
npm run dev
```

#### Producción
```bash
cd backend
npm start
```

#### Otros comandos útiles
```bash
npm run lint          # Analizar código con ESLint
npm run lint:fix      # Corregir problemas de ESLint automáticamente
npm run format        # Formatear código con Prettier
npm test              # Ejecutar tests
```

### 6. Acceder a la aplicación

Una vez iniciado el servidor, abre tu navegador en:

```
http://localhost:3000
```

El servidor sirve automáticamente los archivos estáticos del frontend desde la carpeta `frontend/`.

---

## Notas Adicionales

- El servidor se ejecuta en el puerto 3000 por defecto (configurable en `.env`)
- La base de datos MongoDB se llama `tienda` (configurable en `.env`)
- Los usuarios registrados por defecto tienen rol `user`, los administradores deben crearse manualmente en la base de datos
- El chat requiere autenticación para funcionar
