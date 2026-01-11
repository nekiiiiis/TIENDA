// Productos Page JavaScript
const API_URL = window.location.origin || "http://localhost:3000";
let productos = [];
let paginaActual = 1;
const porPagina = 9;
let userData = null;
let categoriaActual = 'todas';
let cartItemCount = 0;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
  configurarModal();
  configurarEventos();
  cargarProductos();
  configurarMenuMobile();
  cargarCartCount();
});

// Verificar sesión
function verificarSesion() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  const btnAuthNav = document.getElementById('btn-auth-nav');
  const navUserInfo = document.getElementById('nav-user-info');
  const adminPanel = document.getElementById('admin-panel');
  
  if (token && user) {
    userData = JSON.parse(user);
    btnAuthNav.style.display = 'none';
    navUserInfo.style.display = 'flex';
    const navUsername = document.getElementById('nav-username');
    navUsername.textContent = userData.username;
    
    // Configurar enlace del nombre según rol
    if (userData.role === 'admin') {
      navUsername.classList.add('is-admin');
      navUsername.href = '/admin.html';
      navUsername.title = 'Panel de Administración';
    } else {
      navUsername.href = '/pedidos.html';
      navUsername.title = 'Mis Pedidos';
    }
    
    // Mostrar botón flotante si es admin
    if (userData.role === 'admin') {
      const btnToggleAdmin = document.getElementById('btn-toggle-admin-panel');
      btnToggleAdmin.style.display = 'flex';
      
      // Configurar toggle del panel
      btnToggleAdmin.onclick = () => {
        toggleAdminPanel();
      };
      
      // Configurar botón de cerrar panel
      const btnClosePanel = document.getElementById('btn-close-admin-panel');
      btnClosePanel.onclick = () => {
        toggleAdminPanel();
      };
    }
    
    // Configurar logout
    document.getElementById('btn-logout').onclick = logout;
  } else {
    btnAuthNav.style.display = 'block';
    navUserInfo.style.display = 'none';
    adminPanel.style.display = 'none';
    btnAuthNav.onclick = abrirModal;
  }
}

// Toggle del panel de administración
function toggleAdminPanel() {
  const adminPanel = document.getElementById('admin-panel');
  const btnToggle = document.getElementById('btn-toggle-admin-panel');
  
  if (adminPanel.classList.contains('admin-panel-collapsed')) {
    // Mostrar panel
    adminPanel.style.display = 'block';
    setTimeout(() => {
      adminPanel.classList.remove('admin-panel-collapsed');
      adminPanel.classList.add('admin-panel-expanded');
    }, 10);
    btnToggle.classList.add('hidden');
  } else {
    // Ocultar panel
    adminPanel.classList.remove('admin-panel-expanded');
    adminPanel.classList.add('admin-panel-collapsed');
    setTimeout(() => {
      adminPanel.style.display = 'none';
    }, 300);
    btnToggle.classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
}

// Configurar eventos
function configurarEventos() {
  document.getElementById('busqueda').oninput = filtrarProductos;
  document.getElementById('form-producto')?.addEventListener('submit', agregarProducto);
  document.getElementById('form-editar')?.addEventListener('submit', guardarEdicion);
  document.getElementById('close-edit-modal')?.addEventListener('click', cerrarModalEdit);
  
  // Filtros de categoría
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      categoriaActual = btn.dataset.category;
      paginaActual = 1;
      renderProductos();
    };
  });
  
  // Vista previa de imagen en formulario de añadir
  const imagenInput = document.getElementById('imagen');
  const imagePreview = document.getElementById('image-preview');
  
  if (imagenInput && imagePreview) {
    imagenInput.oninput = function() {
      const url = this.value.trim();
      if (url && isValidUrl(url)) {
        imagePreview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='❌ Error al cargar imagen'" onload="this.style.display='block'" style="width:100%;height:100%;object-fit:cover;display:none;">`;
        imagePreview.classList.add('has-image');
      } else {
        imagePreview.innerHTML = '';
        imagePreview.classList.remove('has-image');
      }
    };
  }
  
  // Vista previa en formulario de edición
  const editImagenInput = document.getElementById('edit-imagen');
  const editImagePreview = document.getElementById('edit-image-preview');
  
  if (editImagenInput && editImagePreview) {
    editImagenInput.oninput = function() {
      const url = this.value.trim();
      if (url && isValidUrl(url)) {
        editImagePreview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='❌ Error al cargar imagen'" onload="this.style.display='block'" style="width:100%;height:100%;object-fit:cover;display:none;">`;
        editImagePreview.classList.add('has-image');
      } else {
        editImagePreview.innerHTML = '';
        editImagePreview.classList.remove('has-image');
      }
    };
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Cargar productos
async function cargarProductos() {
  mostrarSpinner(true);
  try {
    const res = await fetch(`${API_URL}/productos`);
    if (!res.ok) throw new Error('Error al cargar productos');
    productos = await res.json();
    paginaActual = 1;
    renderProductos();
    mostrarMensajeToast('Productos cargados', 'ok');
  } catch (error) {
    mostrarMensajeToast(error.message, 'error');
  } finally {
    mostrarSpinner(false);
  }
}

// Filtrar productos
function filtrarProductos() {
  paginaActual = 1;
  renderProductos();
}

// Renderizar productos
function renderProductos() {
  const busqueda = document.getElementById('busqueda').value.toLowerCase();
  let filtrados = productos.filter(p => 
    (p.nombre.toLowerCase().includes(busqueda) ||
    p.descripcion.toLowerCase().includes(busqueda))
  );
  
  // Filtrar por categoría
  if (categoriaActual !== 'todas') {
    filtrados = filtrados.filter(p => p.categoria === categoriaActual);
  }
  
  const inicio = (paginaActual - 1) * porPagina;
  const visibles = filtrados.slice(inicio, inicio + porPagina);
  
  const grid = document.getElementById('products-grid');
  const noProducts = document.getElementById('no-products');
  
  if (visibles.length === 0) {
    grid.innerHTML = '';
    noProducts.style.display = 'block';
  } else {
    noProducts.style.display = 'none';
    grid.innerHTML = visibles.map(p => crearProductoCard(p)).join('');
  }
  
  renderPaginacion(filtrados.length);
}

// Crear card de producto
function crearProductoCard(producto) {
  const isAdmin = userData && userData.role === 'admin';
  const isLoggedIn = userData !== null;
  
  const imagenHtml = producto.imagen 
    ? `<img src="${producto.imagen}" alt="${producto.nombre}" class="product-image" onerror="this.parentElement.innerHTML='<div class=\\'product-no-image\\'>Sin imagen</div>'">`
    : `<div class="product-no-image">📷 Sin imagen</div>`;
  
  // Mapeo de categorías a emojis
  const categoriaEmojis = {
    'fuegos-artificiales': '🎆',
    'petardos': '💥',
    'bengalas': '✨',
    'cohetes': '🎇',
    'otros': '📦'
  };
  
  const categoriaNames = {
    'fuegos-artificiales': 'Fuegos Artificiales',
    'petardos': 'Petardos',
    'bengalas': 'Bengalas',
    'cohetes': 'Cohetes',
    'otros': 'Otros'
  };
  
  const categoriaEmoji = categoriaEmojis[producto.categoria] || '📦';
  const categoriaName = categoriaNames[producto.categoria] || 'Otros';
  
  const actionsHtml = isAdmin ? `
    <div class="product-actions">
      <button class="btn-edit" onclick="abrirModalEdit('${producto._id}'); event.stopPropagation();">✏️ Editar</button>
      <button class="btn-delete" onclick="eliminarProducto('${producto._id}'); event.stopPropagation();">🗑️ Eliminar</button>
    </div>
  ` : '';
  
  // Botón de añadir al carrito (solo para usuarios logueados)
  const addToCartHtml = isLoggedIn && !isAdmin ? `
    <button class="btn-add-cart" onclick="agregarAlCarrito('${producto._id}'); event.stopPropagation();">
      🛒 Añadir al Carrito
    </button>
  ` : '';
  
  return `
    <div class="product-card" onclick="abrirDetalleProducto('${producto._id}')">
      <div class="product-image-container">
        ${imagenHtml}
        <span class="product-category-badge">${categoriaEmoji} ${categoriaName}</span>
      </div>
      <div class="product-info">
        <h3 class="product-name">${producto.nombre}</h3>
        <p class="product-description">${producto.descripcion}</p>
        <div class="product-price">€${producto.precio.toFixed(2)}</div>
        ${addToCartHtml}
        ${actionsHtml}
      </div>
    </div>
  `;
}

// Abrir modal de detalles del producto
window.abrirDetalleProducto = function(id) {
  const producto = productos.find(p => p._id === id);
  if (!producto) return;
  
  // Mapeo de categorías
  const categoriaEmojis = {
    'fuegos-artificiales': '🎆',
    'petardos': '💥',
    'bengalas': '✨',
    'cohetes': '🎇',
    'otros': '📦'
  };
  
  const categoriaNames = {
    'fuegos-artificiales': 'Fuegos Artificiales',
    'petardos': 'Petardos',
    'bengalas': 'Bengalas',
    'cohetes': 'Cohetes',
    'otros': 'Otros'
  };
  
  const categoriaEmoji = categoriaEmojis[producto.categoria] || '📦';
  const categoriaName = categoriaNames[producto.categoria] || 'Otros';
  
  // Rellenar modal
  document.getElementById('detail-nombre').textContent = producto.nombre;
  document.getElementById('detail-precio').textContent = `€${producto.precio.toFixed(2)}`;
  document.getElementById('detail-descripcion').textContent = producto.descripcion;
  document.getElementById('detail-categoria-badge').textContent = `${categoriaEmoji} ${categoriaName}`;
  document.getElementById('detail-categoria-text').textContent = `${categoriaEmoji} ${categoriaName}`;
  
  // Metadata solo para admin
  const metaSection = document.querySelector('.product-detail-meta');
  const isAdmin = userData && userData.role === 'admin';
  
  if (isAdmin) {
    metaSection.style.display = 'flex';
    document.getElementById('detail-id').textContent = producto._id;
    
    // Fecha formateada
    const fecha = new Date(producto.createdAt || producto.updatedAt || Date.now());
    document.getElementById('detail-fecha').textContent = fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else {
    metaSection.style.display = 'none';
  }
  
  // Imagen
  const imgElement = document.getElementById('detail-imagen');
  if (producto.imagen) {
    imgElement.src = producto.imagen;
    imgElement.style.display = 'block';
    imgElement.onerror = function() {
      this.style.display = 'none';
      this.parentElement.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
      this.parentElement.innerHTML += '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:48px;">📷</div>';
    };
  } else {
    imgElement.style.display = 'none';
    document.querySelector('.product-detail-image').style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
    document.querySelector('.product-detail-image').innerHTML += '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:48px;">📷</div>';
  }
  
  // Abrir modal
  const modal = document.getElementById('product-detail-modal');
  modal.classList.add('active');
  modal.style.display = 'flex';
};

// Cerrar modal de detalles
function cerrarDetalleProducto() {
  const modal = document.getElementById('product-detail-modal');
  modal.classList.remove('active');
  modal.style.display = 'none';
  
  // Limpiar imagen
  const imgContainer = document.querySelector('.product-detail-image');
  imgContainer.innerHTML = '<img id="detail-imagen" src="" alt="Producto"><span id="detail-categoria-badge" class="detail-category-badge"></span>';
  imgContainer.style.background = '';
}

// Paginación
function renderPaginacion(total) {
  const totalPaginas = Math.ceil(total / porPagina);
  const pagDiv = document.getElementById('paginacion');
  
  if (totalPaginas <= 1) {
    pagDiv.innerHTML = '';
    return;
  }
  
  let html = '';
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button class="${i === paginaActual ? 'active' : ''}" onclick="irAPagina(${i})">${i}</button>`;
  }
  pagDiv.innerHTML = html;
}

function irAPagina(pagina) {
  paginaActual = pagina;
  renderProductos();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Añadir producto
async function agregarProducto(e) {
  e.preventDefault();
  
  const nombre = document.getElementById('nombre').value.trim();
  const precio = parseFloat(document.getElementById('precio').value);
  const descripcion = document.getElementById('descripcion').value.trim();
  const imagen = document.getElementById('imagen').value.trim() || null;
  const categoria = document.getElementById('categoria').value;
  
  if (!nombre || !descripcion || !categoria) {
    mostrarMensajeToast('Por favor completa todos los campos', 'error');
    return;
  }
  
  if (precio <= 0 || isNaN(precio)) {
    mostrarMensajeToast('El precio debe ser mayor que 0', 'error');
    return;
  }
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/productos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, precio, descripcion, imagen, categoria })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al añadir producto');
    }
    
    const nuevo = await res.json();
    productos.unshift(nuevo);
    renderProductos();
    e.target.reset();
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('image-preview').classList.remove('has-image');
    mostrarMensajeToast('Producto añadido correctamente', 'ok');
    
    // Cerrar panel automáticamente después de añadir
    setTimeout(() => {
      toggleAdminPanel();
    }, 1500);
  } catch (error) {
    mostrarMensajeToast(error.message, 'error');
  }
}

// Abrir modal de edición
window.abrirModalEdit = function(id) {
  const producto = productos.find(p => p._id === id);
  if (!producto) return;
  
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-nombre').value = producto.nombre;
  document.getElementById('edit-precio').value = producto.precio;
  document.getElementById('edit-descripcion').value = producto.descripcion;
  document.getElementById('edit-imagen').value = producto.imagen || '';
  document.getElementById('edit-categoria').value = producto.categoria || 'otros';
  
  const editImagePreview = document.getElementById('edit-image-preview');
  if (producto.imagen) {
    editImagePreview.innerHTML = `<img src="${producto.imagen}" alt="Preview" style="width:100%;height:100%;object-fit:cover;">`;
    editImagePreview.classList.add('has-image');
  } else {
    editImagePreview.innerHTML = '';
    editImagePreview.classList.remove('has-image');
  }
  
  const modal = document.getElementById('edit-modal');
  modal.style.display = 'flex';
  modal.classList.add('active');
};

function cerrarModalEdit() {
  const modal = document.getElementById('edit-modal');
  modal.style.display = 'none';
  modal.classList.remove('active');
}

// Guardar edición
async function guardarEdicion(e) {
  e.preventDefault();
  
  const id = document.getElementById('edit-id').value;
  const nombre = document.getElementById('edit-nombre').value.trim();
  const precio = parseFloat(document.getElementById('edit-precio').value);
  const descripcion = document.getElementById('edit-descripcion').value.trim();
  const imagen = document.getElementById('edit-imagen').value.trim() || null;
  const categoria = document.getElementById('edit-categoria').value;
  
  if (!nombre || !descripcion || !categoria) {
    mostrarMensajeToast('Por favor completa todos los campos', 'error');
    return;
  }
  
  if (precio <= 0 || isNaN(precio)) {
    mostrarMensajeToast('El precio debe ser mayor que 0', 'error');
    return;
  }
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/productos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, precio, descripcion, imagen, categoria })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al actualizar producto');
    }
    
    const actualizado = await res.json();
    productos = productos.map(p => p._id === id ? actualizado : p);
    renderProductos();
    cerrarModalEdit();
    mostrarMensajeToast('Producto actualizado correctamente', 'ok');
  } catch (error) {
    mostrarMensajeToast(error.message, 'error');
  }
}

// Eliminar producto
window.eliminarProducto = async function(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/productos/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al eliminar producto');
    }
    
    productos = productos.filter(p => p._id !== id);
    renderProductos();
    mostrarMensajeToast('Producto eliminado correctamente', 'ok');
  } catch (error) {
    mostrarMensajeToast(error.message, 'error');
  }
};

// Modal de autenticación
function configurarModal() {
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('close-auth-modal');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  
  closeBtn.onclick = () => {
    modal.classList.remove('active');
    modal.style.display = 'none';
  };
  
  window.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
    
    // Cerrar modal de detalles de producto
    const productModal = document.getElementById('product-detail-modal');
    if (e.target === productModal) {
      cerrarDetalleProducto();
    }
  };
  
  // Configurar cierre de modal de detalles
  const closeProductDetail = document.getElementById('close-product-detail');
  if (closeProductDetail) {
    closeProductDetail.onclick = cerrarDetalleProducto;
  }
  
  tabLogin.onclick = () => {
    formLogin.style.display = 'flex';
    formRegister.style.display = 'none';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  };
  
  tabRegister.onclick = () => {
    formLogin.style.display = 'none';
    formRegister.style.display = 'flex';
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  };
  
  formLogin.onsubmit = async (e) => {
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
      
      mostrarMensaje('¡Bienvenido! Recargando...', 'ok');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      mostrarMensaje(error.message, 'error');
    }
  };
  
  formRegister.onsubmit = async (e) => {
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
      
      mostrarMensaje('¡Registro exitoso! Recargando...', 'ok');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      mostrarMensaje(error.message, 'error');
    }
  };
}

function abrirModal() {
  const modal = document.getElementById('auth-modal');
  modal.classList.add('active');
  modal.style.display = 'flex';
}

function mostrarMensaje(texto, tipo) {
  const mensaje = document.getElementById('auth-mensaje');
  mensaje.textContent = texto;
  mensaje.className = 'mensaje ' + tipo;
  mensaje.style.display = 'block';
  setTimeout(() => mensaje.style.display = 'none', 3000);
}

// Spinner
function mostrarSpinner(show) {
  document.getElementById('spinner').style.display = show ? 'flex' : 'none';
}

// Toast
function mostrarMensajeToast(texto, tipo) {
  const toast = document.getElementById('mensaje');
  toast.textContent = texto;
  toast.className = 'mensaje-toast ' + tipo;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 3000);
}

// Menú móvil
function configurarMenuMobile() {
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileBtn) {
    mobileBtn.onclick = () => {
      navLinks.classList.toggle('active');
    };
  }
}

// ==================== CARRITO ====================

// Cargar cantidad de items en el carrito
async function cargarCartCount() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    const res = await fetch(`${API_URL}/api/cart`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      const cart = await res.json();
      cartItemCount = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
      actualizarCartBadge();
    }
  } catch (error) {
    console.error('Error cargando carrito:', error);
  }
}

// Actualizar badge del carrito en navbar
function actualizarCartBadge() {
  const badge = document.getElementById('nav-cart-count');
  if (badge) {
    if (cartItemCount > 0) {
      badge.textContent = cartItemCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Añadir producto al carrito
window.agregarAlCarrito = async function(productId) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    abrirModal();
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId, cantidad: 1 })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al añadir al carrito');
    }
    
    const data = await res.json();
    cartItemCount = data.cart.items.reduce((sum, item) => sum + item.cantidad, 0);
    actualizarCartBadge();
    
    mostrarMensajeToast('¡Producto añadido al carrito!', 'ok');
  } catch (error) {
    mostrarMensajeToast(error.message, 'error');
  }
};
