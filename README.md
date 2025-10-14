# Gestión de Productos

Proyecto trabajado en clase con **Node.js, Express, MongoDB y Vanilla JS** para la gestión de productos.  
Incluye un frontend sencillo y un backend con API REST.

---

## Estructura del proyecto

```
/project
 ├── backend/
 │    ├── .env
 │    ├── .gitignore
 │    ├── .eslintrc.json
 │    ├── .prettierrc
 │    ├── package.json
 │    ├── server.js
 │    ├── routes/
 │    │    └── productos.js
 │    ├── models/
 │    │    └── Producto.js
 │    └── tests/
 │         └── productos.test.js
 ├── frontend/
 │    ├── index.html
 │    ├── main.js
 │    └── styles.css

```

---

## Instalación

Clonar el repositorio e instalar dependencias:

```bash
npm install
```

Instalar también las dependencias de desarrollo:

```bash
npm install --save-dev nodemon eslint prettier jest supertest
```

---

## Variables de entorno

El proyecto usa [`dotenv`](https://www.npmjs.com/package/dotenv).  
Crear un archivo **.env** en la raíz del proyecto con este contenido:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/tienda
NODE_ENV=development
```

**IMPORTANTE:** El archivo `.env` está en `.gitignore`, no lo subas nunca al repositorio.

---

## Scripts disponibles

En `package.json` tienes los siguientes scripts:

```bash
npm run dev       # Arranca el servidor con nodemon
npm start         # Arranca el servidor con node
npm run lint      # Analiza el código con ESLint
npm run lint:fix  # Corrige problemas de ESLint automáticamente
npm run format    # Formatea el código con Prettier
npm test          # Ejecuta los tests con Jest
```

---

## Herramientas

### 1. Nodemon
Reinicia el servidor automáticamente al cambiar archivos.

```bash
npm run dev
```

### 2. ESLint
Analiza el código y muestra errores de estilo o sintaxis.

```bash
npm run lint
npm run lint:fix
```

### 3. Prettier
Formatea el código automáticamente.

```bash
npm run format
```

### 4. Jest + Supertest
Framework de testing para probar la API.

Ejemplo de test (`backend/tests/productos.test.js`):

```js
const request = require('supertest');
const express = require('express');
const productosRouter = require('../routes/productos');

const app = express();
app.use(express.json());
app.use('/productos', productosRouter);

describe('API Productos', () => {
  it('debería devolver un array (GET /productos)', async () => {
    const res = await request(app).get('/productos');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

Ejecutar:
```bash
npm test
```

### 5. PM2
Gestor de procesos para producción.

Instalación global:
```bash
npm install -g pm2
```

Arrancar el servidor en producción:
```bash
pm2 start backend/server.js --name productos-app
pm2 save
pm2 startup
```

Ver logs:
```bash
pm2 logs productos-app
```

---

## Despliegue

1. Configura tu `.env` con la URL de MongoDB de producción.  
2. Instala dependencias en modo producción:
   ```bash
   npm install --production
   ```
3. Levanta el servidor con PM2:
   ```bash
   pm2 start backend/server.js --name productos-app
   pm2 save
   ```

---

## Próximos pasos en las siguientes clases

- Añadir autenticación con JWT.
- Dockerizar la aplicación (`docker-compose` con MongoDB).
- Configurar CI/CD con GitHub Actions.
