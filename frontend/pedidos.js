// Pedidos Page JavaScript
const API_URL = window.location.origin || "http://localhost:3000";
let userData = null;
let orders = [];

document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
  configurarModal();
  configurarMenuMobile();
});

function verificarSesion() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  const btnAuthNav = document.getElementById('btn-auth-nav');
  const navUserInfo = document.getElementById('nav-user-info');
  const loginRequired = document.getElementById('login-required');
  
  if (token && user) {
    userData = JSON.parse(user);
    btnAuthNav.style.display = 'none';
    navUserInfo.style.display = 'flex';
    
    const navUsername = document.getElementById('nav-username');
    navUsername.textContent = userData.username;
    
    if (userData.role === 'admin') {
      navUsername.classList.add('is-admin');
      navUsername.href = '/admin.html';
      navUsername.title = 'Panel de Administración';
    }
    
    document.getElementById('btn-logout').onclick = logout;
    loginRequired.style.display = 'none';
    
    cargarPedidos();
    cargarCartCount();
  } else {
    btnAuthNav.style.display = 'block';
    navUserInfo.style.display = 'none';
    loginRequired.style.display = 'flex';
    
    btnAuthNav.onclick = abrirModal;
    document.getElementById('btn-login-pedidos').onclick = abrirModal;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

async function cargarPedidos() {
  const token = localStorage.getItem('token');
  mostrarSpinner(true);
  
  try {
    const res = await fetch(`${API_URL}/api/orders/my-orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Error al cargar pedidos');
    
    orders = await res.json();
    renderPedidos();
  } catch (error) {
    mostrarMensaje(error.message, 'error');
  } finally {
    mostrarSpinner(false);
  }
}

function renderPedidos() {
  const noOrders = document.getElementById('no-orders');
  const ordersSection = document.getElementById('orders-section');
  const ordersList = document.getElementById('orders-list');
  
  if (orders.length === 0) {
    noOrders.style.display = 'flex';
    ordersSection.style.display = 'none';
    return;
  }
  
  noOrders.style.display = 'none';
  ordersSection.style.display = 'block';
  
  // Estadísticas
  const pending = orders.filter(o => o.status === 'pending').length;
  const completed = orders.filter(o => o.status === 'completed').length;
  
  document.getElementById('stat-total').textContent = orders.length;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-completed').textContent = completed;
  
  // Renderizar lista
  ordersList.innerHTML = orders.map(order => {
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
      <div class="order-card-user" onclick="verDetalle('${order._id}')">
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

function verDetalle(orderId) {
  const order = orders.find(o => o._id === orderId);
  if (!order) return;
  
  document.getElementById('modal-order-id').textContent = `#${order._id.slice(-8).toUpperCase()}`;
  
  const fecha = new Date(order.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  document.getElementById('modal-order-date').textContent = fecha;
  document.getElementById('modal-order-total').textContent = `€${order.total.toFixed(2)}`;
  
  const isPending = order.status === 'pending';
  const statusBadge = document.getElementById('modal-order-status');
  statusBadge.textContent = isPending ? '⏳ En curso' : '✅ Completado';
  statusBadge.className = `order-status-badge ${isPending ? 'status-pending' : 'status-completed'}`;
  
  const itemsList = document.getElementById('modal-order-items');
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
  
  const modal = document.getElementById('order-modal');
  modal.classList.add('active');
  modal.style.display = 'flex';
  
  document.getElementById('close-order-modal').onclick = cerrarModal;
}

function cerrarModal() {
  const modal = document.getElementById('order-modal');
  modal.classList.remove('active');
  modal.style.display = 'none';
}

async function cargarCartCount() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  try {
    const res = await fetch(`${API_URL}/api/cart`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      const cart = await res.json();
      const count = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
      const badge = document.getElementById('nav-cart-count');
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

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
    const orderModal = document.getElementById('order-modal');
    if (e.target === orderModal) cerrarModal();
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
      if (!res.ok) throw new Error(data.error || 'Error');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.reload();
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
      if (!res.ok) throw new Error(data.error || 'Error');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.reload();
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
    mobileBtn.onclick = () => navLinks.classList.toggle('active');
  }
}

window.verDetalle = verDetalle;
