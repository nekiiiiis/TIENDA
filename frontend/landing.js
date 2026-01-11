// Landing Page JavaScript
const API_URL = window.location.origin || "http://localhost:3000";

// Verificar si hay sesión al cargar
document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
  configurarModal();
  configurarMenuMobile();
});

// Verificar sesión
function verificarSesion() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  const btnAuth = document.getElementById('btn-auth');
  
  if (token && user) {
    const userData = JSON.parse(user);
    btnAuth.textContent = `Hola, ${userData.username}`;
    btnAuth.onclick = () => {
      window.location.href = '/productos.html';
    };
  } else {
    btnAuth.textContent = 'Iniciar Sesión';
    btnAuth.onclick = () => {
      abrirModal();
    };
  }
}

// Configurar modal
function configurarModal() {
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.querySelector('.modal-close');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  
  // Cerrar modal
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
  
  // Tabs
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
  
  // Login
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
      
      mostrarMensaje('¡Bienvenido! Redirigiendo...', 'ok');
      setTimeout(() => {
        window.location.href = '/productos.html';
      }, 1000);
    } catch (error) {
      mostrarMensaje(error.message, 'error');
    }
  };
  
  // Registro
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
      
      mostrarMensaje('¡Registro exitoso! Redirigiendo...', 'ok');
      setTimeout(() => {
        window.location.href = '/productos.html';
      }, 1000);
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

