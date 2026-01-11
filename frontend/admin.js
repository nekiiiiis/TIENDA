// Admin Panel JavaScript
const API_URL = window.location.origin || "http://localhost:3000";

let userData = null;
let users = [];
let orders = [];
let currentOrderFilter = 'all';
let selectedOrder = null;

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
  verificarSesionAdmin();
  configurarTabs();
  configurarFiltros();
  configurarModal();
  configurarMenuMobile();
});

// ==================== SESIÓN ====================

function verificarSesionAdmin() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    window.location.href = '/productos.html';
    return;
  }

  userData = JSON.parse(user);
  
  if (userData.role !== 'admin') {
    document.getElementById('access-denied').style.display = 'flex';
    document.getElementById('admin-content').style.display = 'none';
    return;
  }

  // Usuario es admin
  document.getElementById('nav-user-info').style.display = 'flex';
  document.getElementById('nav-username').textContent = userData.username;
  document.getElementById('btn-logout').onclick = logout;
  
  document.getElementById('admin-content').style.display = 'block';
  document.getElementById('access-denied').style.display = 'none';
  
  // Cargar datos
  cargarDatos();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// ==================== CARGA DE DATOS ====================

async function cargarDatos() {
  mostrarSpinner(true);
  
  try {
    await Promise.all([
      cargarUsuarios(),
      cargarPedidos()
    ]);
  } catch (error) {
    console.error('Error cargando datos:', error);
  } finally {
    mostrarSpinner(false);
  }
}

async function cargarUsuarios() {
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al cargar usuarios');
    }
    
    users = await res.json();
    actualizarEstadisticas();
    renderUsuarios();
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    mostrarToast(error.message, 'error');
  }
}

async function cargarPedidos() {
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`${API_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al cargar pedidos');
    }
    
    orders = await res.json();
    actualizarEstadisticas();
    renderPedidos();
  } catch (error) {
    console.error('Error cargando pedidos:', error);
    mostrarToast(error.message, 'error');
  }
}

// ==================== ESTADÍSTICAS ====================

function actualizarEstadisticas() {
  document.getElementById('stat-users').textContent = users.length;
  document.getElementById('stat-orders').textContent = orders.length;
  document.getElementById('stat-pending').textContent = orders.filter(o => o.status === 'pending').length;
  document.getElementById('stat-completed').textContent = orders.filter(o => o.status === 'completed').length;
  
  document.getElementById('tab-users-count').textContent = users.length;
  document.getElementById('tab-orders-count').textContent = orders.length;
}

// ==================== TABS ====================

function configurarTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.onclick = () => {
      // Actualizar tabs activos
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Mostrar sección correspondiente
      const tabId = tab.dataset.tab;
      document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(`${tabId}-section`).classList.add('active');
    };
  });
}

// ==================== USUARIOS ====================

function renderUsuarios() {
  const tbody = document.getElementById('users-table-body');
  const noUsers = document.getElementById('no-users');
  const tableWrapper = tbody.closest('.table-wrapper');
  
  if (users.length === 0) {
    tbody.innerHTML = '';
    noUsers.style.display = 'block';
    tableWrapper.style.display = 'none';
    return;
  }
  
  noUsers.style.display = 'none';
  tableWrapper.style.display = 'block';
  
  tbody.innerHTML = users.map(user => {
    const fecha = formatearFecha(user.createdAt);
    const isCurrentUser = user._id === userData.id;
    const isAdmin = user.role === 'admin';
    
    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="user-info">
              <div class="user-name">
                ${user.username}
                ${isCurrentUser ? '<span class="current-user-tag">Tú</span>' : ''}
              </div>
              <div class="user-id">${user._id.slice(-8)}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${isAdmin ? 'badge-admin' : 'badge-user'}">
            ${isAdmin ? '👑 Admin' : '👤 Usuario'}
          </span>
        </td>
        <td>${fecha}</td>
        <td>
          ${!isCurrentUser ? `
            <div class="actions">
              <button class="btn btn-sm ${isAdmin ? 'btn-outline' : 'btn-warning-custom'}" 
                      onclick="cambiarRol('${user._id}', '${isAdmin ? 'user' : 'admin'}')">
                ${isAdmin ? '👤 Hacer Usuario' : '👑 Hacer Admin'}
              </button>
              <button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${user._id}')">
                🗑️ Eliminar
              </button>
            </div>
          ` : '<span style="color: #6c757d">—</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

async function cambiarRol(userId, nuevoRol) {
  if (!confirm(`¿Estás seguro de cambiar el rol a "${nuevoRol}"?`)) return;
  
  const token = localStorage.getItem('token');
  mostrarSpinner(true);
  
  try {
    const res = await fetch(`${API_URL}/api/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role: nuevoRol })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al cambiar rol');
    }
    
    mostrarToast('Rol actualizado correctamente', 'success');
    await cargarUsuarios();
  } catch (error) {
    mostrarToast(error.message, 'error');
  } finally {
    mostrarSpinner(false);
  }
}

async function eliminarUsuario(userId) {
  if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
  
  const token = localStorage.getItem('token');
  mostrarSpinner(true);
  
  try {
    const res = await fetch(`${API_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al eliminar usuario');
    }
    
    mostrarToast('Usuario eliminado correctamente', 'success');
    await cargarUsuarios();
  } catch (error) {
    mostrarToast(error.message, 'error');
  } finally {
    mostrarSpinner(false);
  }
}

// ==================== PEDIDOS ====================

function configurarFiltros() {
  document.querySelectorAll('.filter-btn-custom').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn-custom').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentOrderFilter = btn.dataset.filter;
      renderPedidos();
    };
  });
}

function renderPedidos() {
  const grid = document.getElementById('orders-grid');
  const noOrders = document.getElementById('no-orders');
  
  // Filtrar pedidos
  let filteredOrders = orders;
  if (currentOrderFilter !== 'all') {
    filteredOrders = orders.filter(o => o.status === currentOrderFilter);
  }
  
  if (filteredOrders.length === 0) {
    grid.innerHTML = '';
    noOrders.style.display = 'block';
    return;
  }
  
  noOrders.style.display = 'none';
  
  grid.innerHTML = filteredOrders.map(order => {
    const fecha = formatearFecha(order.createdAt);
    const isPending = order.status === 'pending';
    const itemCount = order.items ? order.items.reduce((sum, item) => sum + item.cantidad, 0) : 0;
    
    return `
      <div class="order-card-custom" onclick="verDetallePedido('${order._id}')">
        <div class="order-card-header-custom">
          <span class="order-number">#${order._id.slice(-8).toUpperCase()}</span>
          <span class="badge ${isPending ? 'badge-pending' : 'badge-completed'}">
            ${isPending ? '⏳ En curso' : '✅ Completado'}
          </span>
        </div>
        <div class="order-card-body-custom">
          <div class="order-info-row">
            <div class="icon">👤</div>
            <span>${order.username || 'Usuario'}</span>
          </div>
          <div class="order-info-row">
            <div class="icon">📅</div>
            <span>${fecha}</span>
          </div>
          <div class="order-info-row">
            <div class="icon">🛒</div>
            <span>${itemCount} producto(s)</span>
          </div>
        </div>
        <div class="order-card-footer-custom">
          <span style="color: #6c757d">Total</span>
          <span class="order-total-value">€${order.total.toFixed(2)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== MODAL PEDIDO ====================

function configurarModal() {
  const modal = document.getElementById('order-modal');
  const closeBtn = document.getElementById('close-modal');
  
  closeBtn.onclick = cerrarModal;
  
  window.onclick = (e) => {
    if (e.target === modal) {
      cerrarModal();
    }
  };
  
  document.getElementById('btn-mark-completed').onclick = () => {
    if (selectedOrder) cambiarEstadoPedido(selectedOrder._id, 'completed');
  };
  
  document.getElementById('btn-mark-pending').onclick = () => {
    if (selectedOrder) cambiarEstadoPedido(selectedOrder._id, 'pending');
  };
}

function verDetallePedido(orderId) {
  const order = orders.find(o => o._id === orderId);
  if (!order) return;
  
  selectedOrder = order;
  
  // Rellenar datos del modal
  document.getElementById('modal-order-id').textContent = order._id;
  document.getElementById('modal-order-user').textContent = order.username || 'Usuario';
  document.getElementById('modal-order-date').textContent = formatearFechaCompleta(order.createdAt);
  document.getElementById('modal-order-total').textContent = `€${order.total.toFixed(2)}`;
  
  // Estado
  const isPending = order.status === 'pending';
  const statusEl = document.getElementById('modal-order-status');
  statusEl.innerHTML = `<span class="badge ${isPending ? 'badge-pending' : 'badge-completed'}">
    ${isPending ? '⏳ En curso' : '✅ Completado'}
  </span>`;
  
  // Botones de acción
  document.getElementById('btn-mark-completed').style.display = isPending ? 'block' : 'none';
  document.getElementById('btn-mark-pending').style.display = isPending ? 'none' : 'block';
  
  // Items
  const itemsList = document.getElementById('modal-order-items');
  if (order.items && order.items.length > 0) {
    itemsList.innerHTML = order.items.map(item => `
      <div class="order-item-custom">
        <div class="item-info-custom">
          <div class="item-name-custom">${item.nombre}</div>
          <div class="item-quantity-custom">Cantidad: ${item.cantidad} × €${item.precio.toFixed(2)}</div>
        </div>
        <div class="item-subtotal-custom">€${item.subtotal.toFixed(2)}</div>
      </div>
    `).join('');
  } else {
    itemsList.innerHTML = '<div class="order-item-custom"><span>Sin productos</span></div>';
  }
  
  // Mostrar modal
  document.getElementById('order-modal').classList.add('active');
}

function cerrarModal() {
  document.getElementById('order-modal').classList.remove('active');
  selectedOrder = null;
}

async function cambiarEstadoPedido(orderId, nuevoEstado) {
  const token = localStorage.getItem('token');
  mostrarSpinner(true);
  
  try {
    const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: nuevoEstado })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al actualizar estado');
    }
    
    mostrarToast('Estado actualizado correctamente', 'success');
    cerrarModal();
    await cargarPedidos();
  } catch (error) {
    mostrarToast(error.message, 'error');
  } finally {
    mostrarSpinner(false);
  }
}

// ==================== UTILIDADES ====================

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatearFechaCompleta(fecha) {
  return new Date(fecha).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function mostrarSpinner(show) {
  document.getElementById('spinner').style.display = show ? 'flex' : 'none';
}

function mostrarToast(mensaje, tipo = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.className = `toast-custom ${tipo} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function configurarMenuMobile() {
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');
  
  if (mobileBtn && navLinks) {
    mobileBtn.onclick = () => {
      navLinks.classList.toggle('active');
    };
  }
}

// Exponer funciones globalmente
window.cambiarRol = cambiarRol;
window.eliminarUsuario = eliminarUsuario;
window.verDetallePedido = verDetallePedido;
