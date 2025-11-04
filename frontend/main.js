const API_URL = "http://localhost:3000";
let productos = [];
let paginaActual = 1;
const porPagina = 5;
let ordenCampo = null;
let ordenAsc = true;
let userData = null;
let socket = null;

// =================================
// AUTENTICACIÓN
// =================================

// Verificar si hay sesión al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    userData = JSON.parse(user);
    mostrarApp();
  } else {
    mostrarAuth();
  }
});

// Tabs Login/Registro
document.getElementById('tab-login').addEventListener('click', () => {
  document.getElementById('form-login').style.display = 'block';
  document.getElementById('form-register').style.display = 'none';
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-register').classList.remove('active');
});

document.getElementById('tab-register').addEventListener('click', () => {
  document.getElementById('form-login').style.display = 'none';
  document.getElementById('form-register').style.display = 'block';
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('tab-register').classList.add('active');
});

// Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    userData = data.user;

    mostrarAuthMensaje('¡Bienvenido ' + data.user.username + '!', 'ok');
    setTimeout(mostrarApp, 500);
  } catch (error) {
    mostrarAuthMensaje(error.message, 'error');
  }
});

// Registro
document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al registrarse');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    userData = data.user;

    mostrarAuthMensaje('¡Registro exitoso!', 'ok');
    setTimeout(mostrarApp, 500);
  } catch (error) {
    mostrarAuthMensaje(error.message, 'error');
  }
});

// Logout
function logout() {
  // Desconectar socket si existe
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  userData = null;
  productos = [];
  
  // Ocultar chat
  document.getElementById('chat-container').style.display = 'none';
  
  mostrarAuth();
}

// Mostrar panel de autenticación
function mostrarAuth() {
  document.getElementById('auth-container').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';
  document.getElementById('form-login').reset();
  document.getElementById('form-register').reset();
}

// Mostrar aplicación
function mostrarApp() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  
  // Mostrar información del usuario
  document.getElementById('user-welcome').textContent = 
    `Bienvenido ${userData.username} (${userData.role === 'admin' ? 'Administrador' : 'Usuario'})`;

  // Configurar permisos según rol
  configurarPermisos();
  
  // Cargar productos automáticamente
  cargarProductos();
  
  // Inicializar chat
  inicializarChat();
}

// Configurar permisos según rol
function configurarPermisos() {
  const isAdmin = userData.role === 'admin';
  
  // Mostrar/ocultar formulario de añadir producto
  const formContainer = document.getElementById('form-container');
  formContainer.style.display = isAdmin ? 'block' : 'none';
  
  // Mostrar/ocultar columna de acciones si no es admin
  const accionesHeader = document.getElementById('acciones-header');
  accionesHeader.style.display = isAdmin ? '' : 'none';
}

function mostrarAuthMensaje(texto, tipo) {
  const mensaje = document.getElementById('auth-mensaje');
  mensaje.textContent = texto;
  mensaje.className = 'mensaje ' + tipo;
  mensaje.style.display = 'block';
  setTimeout(() => mensaje.style.display = 'none', 3000);
}

// =================================
// CHAT EN TIEMPO REAL
// =================================

function inicializarChat() {
  // Mostrar el chat
  document.getElementById('chat-container').style.display = 'flex';
  
  // Conectar a Socket.IO
  socket = io({
    auth: {
      token: localStorage.getItem('token')
    }
  });
  
  // Escuchar mensajes del chat
  socket.on('chat message', (data) => {
    agregarMensajeChat(data.message, data.username, data.timestamp, data.username !== userData.username);
  });
  
  // Escuchar cuando alguien se une
  socket.on('user joined', (username) => {
    if (username !== userData.username) {
      mostrarNotificacionUsuario(`${username} se ha unido al chat`);
    }
  });
  
  // Configurar eventos del chat
  configurarEventosChat();
}

function configurarEventosChat() {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const toggleBtn = document.getElementById('btn-toggle-chat');
  
  // Enviar mensaje
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const mensaje = chatInput.value.trim();
    
    if (mensaje) {
      socket.emit('chat message', { message: mensaje });
      chatInput.value = '';
    }
  });
  
  // Toggle minimizar/expandir
  toggleBtn.addEventListener('click', () => {
    const chatContainer = document.getElementById('chat-container');
    const isMinimized = chatContainer.classList.contains('minimized');
    
    if (isMinimized) {
      chatContainer.classList.remove('minimized');
      toggleBtn.textContent = 'Minimizar';
    } else {
      chatContainer.classList.add('minimized');
      toggleBtn.textContent = 'Expandir';
    }
  });
}

function agregarMensajeChat(mensaje, username, timestamp, esOtroUsuario = true) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  
  messageDiv.className = `chat-message ${esOtroUsuario ? 'other' : 'own'}`;
  
  const infoDiv = document.createElement('div');
  infoDiv.className = 'chat-message-info';
  infoDiv.textContent = `${username} - ${timestamp}`;
  
  const messageTextDiv = document.createElement('div');
  messageTextDiv.textContent = mensaje;
  
  messageDiv.appendChild(infoDiv);
  messageDiv.appendChild(messageTextDiv);
  
  chatMessages.appendChild(messageDiv);
  
  // Scroll hacia abajo
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function mostrarNotificacionUsuario(mensaje) {
  const chatMessages = document.getElementById('chat-messages');
  const notificationDiv = document.createElement('div');
  
  notificationDiv.className = 'user-joined';
  notificationDiv.textContent = mensaje;
  
  chatMessages.appendChild(notificationDiv);
  
  // Scroll hacia abajo
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Remover la notificación después de 3 segundos
  setTimeout(() => {
    if (notificationDiv.parentNode) {
      notificationDiv.parentNode.removeChild(notificationDiv);
    }
  }, 3000);
}

// =================================
// GESTIÓN DE PRODUCTOS
// =================================

const tbody = document.querySelector("#tabla-productos tbody");
const spinner = document.getElementById("spinner");
const mensaje = document.getElementById("mensaje");

document.getElementById("btn-logout").addEventListener("click", logout);
document.getElementById("btn-cargar").addEventListener("click", cargarProductos);
document.getElementById("busqueda").addEventListener("input", renderProductos);
document.getElementById("form-producto").addEventListener("submit", agregarProducto);
document.querySelectorAll("#tabla-productos th[data-field]").forEach(th => {
  th.addEventListener("click", () => ordenarPor(th.dataset.field));
});

// Vista previa de imagen en tiempo real
const imagenInput = document.getElementById("imagen");
const imagePreview = document.getElementById("image-preview");

if (imagenInput && imagePreview) {
  imagenInput.addEventListener("input", function() {
    const url = this.value.trim();
    if (url && isValidUrl(url)) {
      const img = imagePreview.querySelector("img") || document.createElement("img");
      img.src = url;
      img.onerror = function() {
        imagePreview.classList.remove("has-image");
        imagePreview.innerHTML = '<div style="color: #dc3545; padding: 20px; text-align: center;">❌ Error al cargar la imagen</div>';
      };
      img.onload = function() {
        imagePreview.classList.add("has-image");
        if (!imagePreview.querySelector("img")) {
          imagePreview.innerHTML = "";
          imagePreview.appendChild(img);
        }
      };
    } else {
      imagePreview.classList.remove("has-image");
      imagePreview.innerHTML = "";
    }
  });
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

async function cargarProductos() {
  mostrarSpinner(true);
  try {
    const res = await fetch(`${API_URL}/productos`);
    if (!res.ok) throw new Error("Error al cargar productos");
    productos = await res.json();
    paginaActual = 1;
    renderProductos();
    mostrarMensaje("Productos cargados", "ok");
  } catch (err) {
    mostrarMensaje(err.message, "error");
  } finally {
    mostrarSpinner(false);
  }
}

function renderProductos() {
  let filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(document.getElementById("busqueda").value.toLowerCase())
  );

  if (ordenCampo) {
    filtrados.sort((a, b) => {
      if (a[ordenCampo] < b[ordenCampo]) return ordenAsc ? -1 : 1;
      if (a[ordenCampo] > b[ordenCampo]) return ordenAsc ? 1 : -1;
      return 0;
    });
  }

  const inicio = (paginaActual - 1) * porPagina;
  const visibles = filtrados.slice(inicio, inicio + porPagina);

  tbody.innerHTML = "";
  const isAdmin = userData && userData.role === 'admin';

  visibles.forEach(p => {
    const tr = document.createElement("tr");
    
    // Imagen del producto
    const imagenHtml = p.imagen 
      ? `<img src="${p.imagen}" alt="${p.nombre}" class="product-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23ddd\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\'%3EImagen no disponible%3C/text%3E%3C/svg%3E'">`
      : `<div class="no-image">Sin imagen</div>`;
    
    if (isAdmin) {
      tr.innerHTML = `
        <td>${imagenHtml}</td>
        <td><input type="text" value="${p.nombre}" data-id="${p._id}" data-field="nombre" disabled></td>
        <td><input type="number" value="${p.precio}" data-id="${p._id}" data-field="precio" disabled></td>
        <td><input type="text" value="${p.descripcion}" data-id="${p._id}" data-field="descripcion" disabled></td>
        <td>
          <button class="edit-btn" onclick="editarProducto('${p._id}')">Editar</button>
          <button class="save-btn" onclick="guardarProducto('${p._id}')" style="display:none">Guardar</button>
          <button class="delete-btn" onclick="eliminarProducto('${p._id}')">Eliminar</button>
        </td>
      `;
    } else {
      tr.innerHTML = `
        <td>${imagenHtml}</td>
        <td>${p.nombre}</td>
        <td>$${p.precio}</td>
        <td>${p.descripcion}</td>
      `;
    }
    
    tbody.appendChild(tr);
  });

  renderPaginacion(filtrados.length);
}

function renderPaginacion(total) {
  const totalPaginas = Math.ceil(total / porPagina);
  const pagDiv = document.getElementById("paginacion");
  pagDiv.innerHTML = "";
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === paginaActual) btn.style.background = "#0056b3";
    btn.addEventListener("click", () => {
      paginaActual = i;
      renderProductos();
    });
    pagDiv.appendChild(btn);
  }
}

function ordenarPor(campo) {
  if (ordenCampo === campo) {
    ordenAsc = !ordenAsc;
  } else {
    ordenCampo = campo;
    ordenAsc = true;
  }
  renderProductos();
}

async function eliminarProducto(id) {
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/productos/${id}`, { 
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al eliminar');
    }
    
    productos = productos.filter(p => p._id !== id);
    renderProductos();
    mostrarMensaje("Producto eliminado", "ok");
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

function editarProducto(id) {
  const inputs = document.querySelectorAll(`input[data-id="${id}"]`);
  inputs.forEach(i => i.disabled = false);
  const row = inputs[0].closest("tr");
  row.querySelector(".edit-btn").style.display = "none";
  row.querySelector(".save-btn").style.display = "inline-block";
  
  // Agregar input de URL para editar imagen
  const imagenCell = row.querySelector("td:first-child");
  const producto = productos.find(p => p._id === id);
  
  // Crear contenedor para imagen y input
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "10px";
  container.style.alignItems = "center";
  
  // Mostrar imagen actual si existe
  const imagePreview = document.createElement("div");
  imagePreview.style.width = "120px";
  imagePreview.style.height = "120px";
  imagePreview.style.borderRadius = "12px";
  imagePreview.style.overflow = "hidden";
  imagePreview.style.border = "2px solid #e1e8ed";
  imagePreview.style.background = "#f8f9fa";
  imagePreview.style.display = "flex";
  imagePreview.style.alignItems = "center";
  imagePreview.style.justifyContent = "center";
  
  if (producto && producto.imagen) {
    const img = document.createElement("img");
    img.src = producto.imagen;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.onerror = function() {
      imagePreview.innerHTML = '<div style="color: #999; font-size: 12px; text-align: center; padding: 10px;">❌ Error</div>';
    };
    imagePreview.appendChild(img);
  } else {
    imagePreview.innerHTML = '<div style="color: #999; font-size: 12px; text-align: center; padding: 10px;">📷 Sin imagen</div>';
  }
  
  // Crear input de URL para editar imagen
  const urlInput = document.createElement("input");
  urlInput.type = "url";
  urlInput.id = `imagen-edit-${id}`;
  urlInput.value = producto?.imagen || "";
  urlInput.placeholder = "URL de la imagen";
  urlInput.style.width = "100%";
  urlInput.style.padding = "8px";
  urlInput.style.fontSize = "12px";
  urlInput.style.border = "2px solid #e1e8ed";
  urlInput.style.borderRadius = "6px";
  urlInput.style.transition = "all 0.2s";
  
  urlInput.addEventListener("focus", function() {
    this.style.borderColor = "#667eea";
    this.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
  });
  
  urlInput.addEventListener("blur", function() {
    this.style.borderColor = "#e1e8ed";
    this.style.boxShadow = "none";
  });
  
  // Actualizar vista previa cuando cambie la URL
  urlInput.addEventListener("input", function() {
    const url = this.value.trim();
    if (url && isValidUrl(url)) {
      const img = imagePreview.querySelector("img") || document.createElement("img");
      img.src = url;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.onerror = function() {
        imagePreview.innerHTML = '<div style="color: #dc3545; font-size: 12px; text-align: center; padding: 10px;">❌ Error</div>';
      };
      img.onload = function() {
        imagePreview.innerHTML = "";
        imagePreview.appendChild(img);
      };
      if (!imagePreview.querySelector("img")) {
        imagePreview.innerHTML = "";
        imagePreview.appendChild(img);
      }
    } else if (!url) {
      imagePreview.innerHTML = '<div style="color: #999; font-size: 12px; text-align: center; padding: 10px;">📷 Sin imagen</div>';
    }
  });
  
  container.appendChild(imagePreview);
  container.appendChild(urlInput);
  
  imagenCell.innerHTML = "";
  imagenCell.appendChild(container);
}

async function guardarProducto(id) {
  const inputs = document.querySelectorAll(`input[data-id="${id}"]`);
  const actualizado = {};
  inputs.forEach(i => {
    actualizado[i.dataset.field] = i.type === "number" ? parseFloat(i.value) : i.value;
    i.disabled = true;
  });

  // Obtener URL de imagen si existe
  const imagenInput = document.getElementById(`imagen-edit-${id}`);
  if (imagenInput) {
    actualizado.imagen = imagenInput.value.trim() || null;
  }

  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_URL}/productos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(actualizado)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al actualizar');
    }
    
    const actualizadoData = await res.json();
    productos = productos.map(p => p._id === id ? actualizadoData : p);
    renderProductos();
    mostrarMensaje("Producto actualizado", "ok");
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

async function agregarProducto(e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);
  const descripcion = document.getElementById("descripcion").value.trim();
  const imagenInput = document.getElementById("imagen");

  if (!nombre) return mostrarMensaje("El nombre no puede estar vacío", "error");
  if (precio <= 0 || isNaN(precio)) return mostrarMensaje("El precio debe ser mayor que 0", "error");
  if (!descripcion) return mostrarMensaje("La descripción no puede estar vacía", "error");

  const nuevo = {
    nombre,
    precio,
    descripcion,
    imagen: imagenInput.value.trim() || null
  };

  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_URL}/productos`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(nuevo)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al añadir');
    }
    
    const creado = await res.json();
    productos.push(creado);
    renderProductos();
    e.target.reset();
    // Limpiar vista previa de imagen
    if (imagePreview) {
      imagePreview.classList.remove("has-image");
      imagePreview.innerHTML = "";
    }
    mostrarMensaje("Producto añadido", "ok");
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

function mostrarSpinner(show) {
  spinner.style.display = show ? "block" : "none";
}

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = "mensaje " + tipo;
  mensaje.style.display = "block";
  setTimeout(() => mensaje.style.display = "none", 3000);
}
