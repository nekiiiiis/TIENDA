// Carrito Page JavaScript
const API_URL = window.location.origin || "http://localhost:3000";
let userData = null;
let cart = { items: [], total: 0 };
let myOrders = [];

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
  configurarModal();
  configurarMenuMobile();
});

// Verificar sesión
function verificarSesion() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  const btnAuthNav = document.getElementById('btn-auth-nav');
  const navUserInfo = document.getElementById('nav-user-info');
  const loginRequired = document.getElementById('login-required');
  const emptyCart = document.getElementById('empty-cart');
  const cartContent = document.getElementById('cart-content');
  
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
    
    document.getElementById('btn-logout').onclick = logout;
    
    loginRequired.style.display = 'none';
    
    // Cargar carrito y pedidos
    cargarCarrito();
    cargarMisPedidos();
    
    // Configurar botones
    document.getElementById('btn-clear-cart').onclick = vaciarCarrito;
    document.getElementById('btn-checkout').onclick = finalizarCompra;
  } else {
    btnAuthNav.style.display = 'block';
    navUserInfo.style.display = 'none';
    loginRequired.style.display = 'flex';
    emptyCart.style.display = 'none';
    cartContent.style.display = 'none';
    
    btnAuthNav.onclick = abrirModal;
    document.getElementById('btn-login-cart').onclick = abrirModal;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
}

// ==================== CARRITO ====================

async function cargarCarrito() {
  const token = localStorage.getItem('token');
  mostrarSpinner(true);
  
  try {
    const res = await fetch(`${API_URL}/api/cart`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Error al cargar carrito');
    
    cart = await res.json();
    renderCarrito();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  } finally {
    mostrarSpinner(false);
  }
}

function renderCarrito() {
  const emptyCart = document.getElementById('empty-cart');
  const cartContent = document.getElementById('cart-content');
  const cartItems = document.getElementById('cart-items');
  const navCartCount = document.getElementById('nav-cart-count');
  const fullOrdersSection = document.getElementById('my-orders-full-section');
  
  const itemCount = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
  
  // Actualizar badge del navbar
  if (itemCount > 0) {
    navCartCount.textContent = itemCount;
    navCartCount.style.display = 'inline-block';
  } else {
    navCartCount.style.display = 'none';
  }
  
  if (cart.items.length === 0) {
    // Si hay pedidos, mostrar la sección de pedidos en lugar del carrito vacío
    if (myOrders.length > 0) {
      emptyCart.style.display = 'none';
      fullOrdersSection.style.display = 'block';
    } else {
      emptyCart.style.display = 'flex';
      fullOrdersSection.style.display = 'none';
    }
    cartContent.style.display = 'none';
    return;
  }
  
  emptyCart.style.display = 'none';
  cartContent.style.display = 'block';
  
  // Renderizar items
  cartItems.innerHTML = cart.items.map(item => {
    const imagenHtml = item.imagen 
      ? `<img src="${item.imagen}" alt="${item.nombre}" onerror="this.src=''">`
      : `<div class="item-no-image">📷</div>`;
    
    return `
      <div class="cart-item" data-product-id="${item.productId}">
        <div class="item-image">
          ${imagenHtml}
        </div>
        <div class="item-details">
          <h3 class="item-name">${item.nombre}</h3>
          <p class="item-price">€${item.precio.toFixed(2)}</p>
        </div>
        <div class="item-quantity">
          <button class="qty-btn minus" onclick="cambiarCantidad('${item.productId}', -1)">-</button>
          <span class="qty-value">${item.cantidad}</span>
          <button class="qty-btn plus" onclick="cambiarCantidad('${item.productId}', 1)">+</button>
        </div>
        <div class="item-subtotal">
          <span>€${(item.precio * item.cantidad).toFixed(2)}</span>
        </div>
        <button class="item-remove" onclick="eliminarItem('${item.productId}')">
          🗑️
        </button>
      </div>
    `;
  }).join('');
  
  // Actualizar resumen
  actualizarResumen();
}

function actualizarResumen() {
  const itemCount = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
  document.getElementById('summary-items-count').textContent = `${itemCount} item(s)`;
  document.getElementById('summary-subtotal').textContent = `€${cart.total.toFixed(2)}`;
  document.getElementById('summary-total').textContent = `€${cart.total.toFixed(2)}`;
}

async function cambiarCantidad(productId, delta) {
  const item = cart.items.find(i => i.productId === productId);
  if (!item) return;
  
  const nuevaCantidad = item.cantidad + delta;
  
  if (nuevaCantidad < 1) {
    eliminarItem(productId);
    return;
  }
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/api/cart/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId, cantidad: nuevaCantidad })
    });
    
    if (!res.ok) throw new Error('Error al actualizar cantidad');
    
    const data = await res.json();
    cart = data.cart;
    renderCarrito();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

async function eliminarItem(productId) {
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/api/cart/remove/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Error al eliminar producto');
    
    const data = await res.json();
    cart = data.cart;
    renderCarrito();
    mostrarMensaje('Producto eliminado del carrito', 'ok');
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

async function vaciarCarrito() {
  if (!confirm('¿Estás seguro de vaciar tu carrito?')) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/api/cart/clear`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Error al vaciar carrito');
    
    const data = await res.json();
    cart = data.cart;
    renderCarrito();
    mostrarMensaje('Carrito vaciado', 'ok');
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  }
}

async function finalizarCompra() {
  if (cart.items.length === 0) {
    mostrarMensaje('El carrito está vacío', 'error');
    return;
  }
  
  const token = localStorage.getItem('token');
  mostrarSpinner(true);
  
  try {
    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al crear pedido');
    }
    
    const data = await res.json();
    
    // Mostrar modal de éxito
    document.getElementById('confirm-order-id').textContent = `#${data.order._id.slice(-8).toUpperCase()}`;
    const modal = document.getElementById('checkout-modal');
    modal.classList.add('active');
    modal.style.display = 'flex';
    
    // Configurar botón de cerrar
    document.getElementById('btn-close-checkout').onclick = () => {
      modal.classList.remove('active');
      modal.style.display = 'none';
      cargarCarrito();
      cargarMisPedidos();
    };
    
    // Recargar datos
    cargarCarrito();
    cargarMisPedidos();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  } finally {
    mostrarSpinner(false);
  }
}

// ==================== MIS PEDIDOS ====================

async function cargarMisPedidos() {
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/api/orders/my-orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Error al cargar pedidos');
    
    myOrders = await res.json();
    renderMisPedidos();
    renderMisPedidosFull();
  } catch (error) {
    console.error('Error cargando pedidos:', error);
  }
}

function renderMisPedidos() {
  const container = document.getElementById('my-orders-list');
  const noOrders = document.getElementById('no-my-orders');
  
  if (myOrders.length === 0) {
    container.innerHTML = '';
    noOrders.style.display = 'block';
    return;
  }
  
  noOrders.style.display = 'none';
  
  container.innerHTML = myOrders.slice(0, 5).map(order => {
    const fecha = new Date(order.createdAt).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
    
    const statusClass = order.status === 'completed' ? 'status-completed' : 'status-pending';
    const statusText = order.status === 'completed' ? '✅' : '⏳';
    
    return `
      <div class="my-order-item" onclick="verDetallePedido('${order._id}')" style="cursor:pointer">
        <div class="order-mini-info">
          <span class="order-mini-number">#${order._id.slice(-6).toUpperCase()}</span>
          <span class="order-mini-date">${fecha}</span>
        </div>
        <div class="order-mini-details">
          <span class="order-mini-total">€${order.total.toFixed(2)}</span>
          <span class="status-mini ${statusClass}">${statusText}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderMisPedidosFull() {
  const container = document.getElementById('my-orders-full-list');
  const noOrders = document.getElementById('no-my-orders-full');
  
  if (myOrders.length === 0) {
    container.innerHTML = '';
    noOrders.style.display = 'block';
    return;
  }
  
  noOrders.style.display = 'none';
  
  container.innerHTML = myOrders.map(order => {
    const fecha = new Date(order.createdAt).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const isPending = order.status === 'pending';
    const statusClass = isPending ? 'status-pending' : 'status-completed';
    const statusText = isPending ? '⏳ En curso' : '✅ Completado';
    const itemCount = order.items ? order.items.reduce((sum, item) => sum + item.cantidad, 0) : 0;
    
    return `
      <div class="order-card-user" onclick="verDetallePedido('${order._id}')">
        <div class="order-card-header-user">
          <span class="order-number-user">#${order._id.slice(-8).toUpperCase()}</span>
          <span class="status-badge-user ${statusClass}">${statusText}</span>
        </div>
        <div class="order-card-body-user">
          <div class="order-info-user">
            <div class="info-row-user">
              <span>📅</span>
              <span>${fecha}</span>
            </div>
            <div class="info-row-user">
              <span>🛒</span>
              <span>${itemCount} producto(s)</span>
            </div>
          </div>
          <div class="order-total-user">
            <span class="total-label-user">Total</span>
            <span class="total-value-user">€${order.total.toFixed(2)}</span>
          </div>
        </div>
        <div class="order-card-action">
          <span class="view-details-btn">Ver detalles →</span>
        </div>
      </div>
    `;
  }).join('');
}

function verDetallePedido(orderId) {
  const order = myOrders.find(o => o._id === orderId);
  if (!order) return;
  
  // Rellenar datos del modal
  document.getElementById('user-order-id').textContent = `#${order._id.slice(-8).toUpperCase()}`;
  
  const fecha = new Date(order.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  document.getElementById('user-order-date').textContent = fecha;
  document.getElementById('user-order-total').textContent = `€${order.total.toFixed(2)}`;
  
  // Estado
  const isPending = order.status === 'pending';
  const statusBadge = document.getElementById('user-order-status');
  statusBadge.textContent = isPending ? '⏳ En curso' : '✅ Completado';
  statusBadge.className = `order-status-badge ${isPending ? 'status-pending' : 'status-completed'}`;
  
  // Items
  const itemsList = document.getElementById('user-order-items');
  if (order.items && order.items.length > 0) {
    itemsList.innerHTML = order.items.map(item => `
      <div class="order-product-item">
        <div class="product-item-info">
          <span class="product-item-name">${item.nombre}</span>
          <span class="product-item-qty">x${item.cantidad}</span>
        </div>
        <div class="product-item-prices">
          <span class="product-item-unit">€${item.precio.toFixed(2)} c/u</span>
          <span class="product-item-subtotal">€${item.subtotal.toFixed(2)}</span>
        </div>
      </div>
    `).join('');
  } else {
    itemsList.innerHTML = '<p>Sin productos</p>';
  }
  
  // Mostrar modal
  const modal = document.getElementById('order-detail-modal');
  modal.classList.add('active');
  modal.style.display = 'flex';
  
  // Configurar cierre
  document.getElementById('close-order-detail').onclick = () => {
    modal.classList.remove('active');
    modal.style.display = 'none';
  };
  
  window.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  };
}

// Exponer función globalmente
window.verDetallePedido = verDetallePedido;

// ==================== MODAL Y AUTENTICACIÓN ====================

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
  };
  
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
      
      mostrarMensajeAuth('¡Bienvenido! Recargando...', 'ok');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      mostrarMensajeAuth(error.message, 'error');
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
      
      mostrarMensajeAuth('¡Registro exitoso! Recargando...', 'ok');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      mostrarMensajeAuth(error.message, 'error');
    }
  };
}

function abrirModal() {
  const modal = document.getElementById('auth-modal');
  modal.classList.add('active');
  modal.style.display = 'flex';
}

function mostrarMensajeAuth(texto, tipo) {
  const mensaje = document.getElementById('auth-mensaje');
  mensaje.textContent = texto;
  mensaje.className = 'mensaje ' + tipo;
  mensaje.style.display = 'block';
  setTimeout(() => mensaje.style.display = 'none', 3000);
}

// ==================== UTILIDADES ====================

function mostrarSpinner(show) {
  document.getElementById('spinner').style.display = show ? 'flex' : 'none';
}

function mostrarMensaje(texto, tipo) {
  const toast = document.getElementById('mensaje');
  toast.textContent = texto;
  toast.className = 'mensaje-toast ' + tipo;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 3000);
}

function configurarMenuMobile() {
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileBtn) {
    mobileBtn.onclick = () => {
      navLinks.classList.toggle('active');
    };
  }
}

// Exponer funciones globalmente
window.cambiarCantidad = cambiarCantidad;
window.eliminarItem = eliminarItem;
