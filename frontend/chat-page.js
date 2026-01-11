// Chat Page JavaScript - Sistema de Conversaciones
const API_URL = window.location.origin || "http://localhost:3000";
let socket = null;
let userData = null;
let activeConversationId = null;
let conversations = {};

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
  const chatLoginRequired = document.getElementById('chat-login-required');
  const chatUser = document.getElementById('chat-user');
  const chatAdmin = document.getElementById('chat-admin');
  const btnLoginChat = document.getElementById('btn-login-chat');
  
  if (token && user) {
    userData = JSON.parse(user);
    
    // Actualizar navbar
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
    
    // Ocultar login requerido
    chatLoginRequired.style.display = 'none';
    
    // Mostrar interfaz según rol
    if (userData.role === 'admin') {
      chatAdmin.style.display = 'block';
      chatUser.style.display = 'none';
      inicializarChatAdmin();
    } else {
      chatUser.style.display = 'block';
      chatAdmin.style.display = 'none';
      document.getElementById('chat-username').textContent = userData.username;
      inicializarChatUsuario();
    }
    
    // Configurar logout
    document.getElementById('btn-logout').onclick = logout;
  } else {
    // Mostrar mensaje de login requerido
    btnAuthNav.style.display = 'block';
    navUserInfo.style.display = 'none';
    chatLoginRequired.style.display = 'flex';
    chatUser.style.display = 'none';
    chatAdmin.style.display = 'none';
    
    btnAuthNav.onclick = abrirModal;
    btnLoginChat.onclick = abrirModal;
  }
}

function logout() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
}

// ============================================
// CHAT USUARIO NORMAL
// ============================================

function inicializarChatUsuario() {
  const token = localStorage.getItem('token');
  
  // Conectar a Socket.IO
  socket = io({
    auth: { token }
  });
  
  socket.on('connect', () => {
    console.log('Conectado al chat');
    agregarMensajeSistema('🟢 Conectado al chat de soporte');
    // Solicitar historial
    socket.emit('request history');
  });
  
  socket.on('disconnect', () => {
    console.log('Desconectado del chat');
    agregarMensajeSistema('🔴 Desconectado del chat');
  });
  
  socket.on('conversation history', (data) => {
    const chatMessages = document.getElementById('chat-messages');
    // Limpiar mensajes anteriores excepto el de sistema
    const systemMsg = chatMessages.querySelector('.chat-system-message');
    chatMessages.innerHTML = '';
    if (systemMsg) chatMessages.appendChild(systemMsg);
    
    // Cargar historial
    data.messages.forEach(msg => {
      agregarMensaje(
        msg.message,
        msg.senderUsername,
        new Date(msg.createdAt).toLocaleTimeString(),
        msg.isFromAdmin
      );
    });
  });
  
  socket.on('chat message', (data) => {
    agregarMensaje(
      data.message,
      data.senderUsername,
      data.timestamp,
      data.senderId !== userData.id
    );
  });
  
  // Configurar formulario
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  
  chatForm.onsubmit = (e) => {
    e.preventDefault();
    const mensaje = chatInput.value.trim();
    
    if (mensaje && socket) {
      socket.emit('chat message', { message: mensaje });
      chatInput.value = '';
    }
  };
}

function agregarMensaje(mensaje, username, timestamp, esOtro = true) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  
  messageDiv.className = `chat-message ${esOtro ? 'other' : 'own'}`;
  
  const infoDiv = document.createElement('div');
  infoDiv.className = 'chat-message-info';
  infoDiv.textContent = `${username} - ${timestamp}`;
  
  const messageTextDiv = document.createElement('div');
  messageTextDiv.textContent = mensaje;
  
  messageDiv.appendChild(infoDiv);
  messageDiv.appendChild(messageTextDiv);
  chatMessages.appendChild(messageDiv);
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function agregarMensajeSistema(texto) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  
  messageDiv.className = 'chat-system-message';
  messageDiv.innerHTML = `<p>${texto}</p>`;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============================================
// CHAT ADMIN - SISTEMA DE CONVERSACIONES
// ============================================

function inicializarChatAdmin() {
  const token = localStorage.getItem('token');
  
  // Conectar a Socket.IO
  socket = io({
    auth: { token }
  });
  
  socket.on('connect', () => {
    console.log('Admin conectado al chat');
    // Solicitar lista de conversaciones
    socket.emit('request conversations');
  });
  
  socket.on('disconnect', () => {
    console.log('Admin desconectado del chat');
  });
  
  // Recibir lista de conversaciones
  socket.on('conversations list', (conversationsList) => {
    renderConversations(conversationsList);
  });
  
  // Nuevo mensaje en una conversación
  socket.on('new message notification', (data) => {
    console.log('Nueva notificación de mensaje:', data);
    
    // Si no es la conversación activa, actualizar la lista
    if (activeConversationId !== data.conversationId) {
      socket.emit('request conversations');
    }
  });
  
  // Recibir historial de conversación
  socket.on('conversation history', (data) => {
    renderConversationMessages(data.messages);
  });
  
  // Recibir mensaje en tiempo real
  socket.on('chat message', (data) => {
    if (activeConversationId === data.conversationId) {
      agregarMensajeConversacion(data);
    } else {
      // Actualizar lista de conversaciones
      socket.emit('request conversations');
    }
  });
  
  // Usuario en línea/offline
  socket.on('user online', (data) => {
    console.log('Usuario en línea:', data.username);
    socket.emit('request conversations');
  });
  
  socket.on('user offline', (data) => {
    console.log('Usuario desconectado:', data.username);
  });
  
  // Configurar formulario de admin
  const adminChatForm = document.getElementById('admin-chat-form');
  const adminChatInput = document.getElementById('admin-chat-input');
  
  adminChatForm.onsubmit = (e) => {
    e.preventDefault();
    const mensaje = adminChatInput.value.trim();
    
    if (mensaje && socket && activeConversationId) {
      // Extraer userId del conversationId
      const userId = activeConversationId.replace('user-', '');
      
      socket.emit('chat message', {
        message: mensaje,
        conversationId: activeConversationId,
        receiverId: userId
      });
      
      adminChatInput.value = '';
    }
  };

  // Configurar botón de eliminar conversación
  const btnDeleteConversation = document.getElementById('btn-delete-conversation');
  btnDeleteConversation.onclick = () => {
    if (!activeConversationId) return;
    
    if (confirm('¿Estás seguro de que deseas eliminar esta conversación completa? Esta acción no se puede deshacer.')) {
      socket.emit('delete conversation', { conversationId: activeConversationId });
    }
  };

  // Escuchar eventos de eliminación
  socket.on('message deleted', (data) => {
    // Eliminar mensaje de la UI
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
      messageElement.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => messageElement.remove(), 300);
    }
  });

  socket.on('conversation deleted', (data) => {
    if (activeConversationId === data.conversationId) {
      // Cerrar conversación actual
      activeConversationId = null;
      document.getElementById('no-conversation-selected').style.display = 'flex';
      document.getElementById('active-conversation').style.display = 'none';
    }
  });

  socket.on('conversation deleted success', (data) => {
    // Actualizar lista de conversaciones
    socket.emit('request conversations');
    // Cerrar conversación
    activeConversationId = null;
    document.getElementById('no-conversation-selected').style.display = 'flex';
    document.getElementById('active-conversation').style.display = 'none';
  });

  socket.on('refresh conversations', () => {
    socket.emit('request conversations');
  });

  socket.on('error', (data) => {
    alert(data.message || 'Ha ocurrido un error');
  });
}

function renderConversations(conversationsList) {
  const conversationsList_el = document.getElementById('conversations-list');
  const countBadge = document.getElementById('conversations-count');
  
  if (!conversationsList || conversationsList.length === 0) {
    conversationsList_el.innerHTML = `
      <div class="no-conversations">
        <p>😴 No hay conversaciones activas</p>
      </div>
    `;
    countBadge.textContent = '0';
    return;
  }
  
  countBadge.textContent = conversationsList.length;
  
  conversationsList_el.innerHTML = conversationsList.map(conv => {
    const time = new Date(conv.lastMessageTime).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const isActive = activeConversationId === conv._id;
    const unreadBadge = conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : '';
    
    return `
      <div class="conversation-item ${isActive ? 'active' : ''}" data-conversation-id="${conv._id}" data-user-id="${conv.senderId}" data-username="${conv.senderUsername}">
        <div class="conversation-item-header">
          <span class="conversation-username">${conv.senderUsername}${unreadBadge}</span>
          <span class="conversation-time">${time}</span>
        </div>
        <div class="conversation-preview">${conv.lastMessage}</div>
      </div>
    `;
  }).join('');
  
  // Añadir event listeners
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.onclick = () => {
      const conversationId = item.dataset.conversationId;
      const username = item.dataset.username;
      seleccionarConversacion(conversationId, username);
    };
  });
}

function seleccionarConversacion(conversationId, username) {
  activeConversationId = conversationId;
  
  // Actualizar UI
  document.getElementById('no-conversation-selected').style.display = 'none';
  document.getElementById('active-conversation').style.display = 'flex';
  document.getElementById('active-user-name').textContent = username;
  document.getElementById('active-user-avatar').textContent = username.charAt(0).toUpperCase();
  
  // Limpiar mensajes anteriores
  document.getElementById('conversation-messages').innerHTML = '';
  
  // Unirse a la conversación
  socket.emit('join conversation', conversationId);
  
  // Actualizar lista de conversaciones para marcar como activa
  socket.emit('request conversations');
}

function renderConversationMessages(messages) {
  const container = document.getElementById('conversation-messages');
  container.innerHTML = '';
  
  messages.forEach(msg => {
    agregarMensajeConversacion({
      message: msg.message,
      senderUsername: msg.senderUsername,
      isFromAdmin: msg.isFromAdmin,
      createdAt: msg.createdAt
    });
  });
}

function agregarMensajeConversacion(data) {
  const container = document.getElementById('conversation-messages');
  const messageDiv = document.createElement('div');
  
  const esPropio = data.isFromAdmin;
  messageDiv.className = `chat-message ${esPropio ? 'own' : 'other'}`;
  
  // Añadir ID del mensaje para poder eliminarlo
  if (data._id) {
    messageDiv.setAttribute('data-message-id', data._id);
  }
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  
  const infoDiv = document.createElement('div');
  infoDiv.className = 'chat-message-info';
  const time = data.createdAt ? new Date(data.createdAt).toLocaleTimeString() : data.timestamp;
  infoDiv.textContent = `${data.senderUsername} - ${time}`;
  
  const messageTextDiv = document.createElement('div');
  messageTextDiv.textContent = data.message;
  
  messageContent.appendChild(infoDiv);
  messageContent.appendChild(messageTextDiv);
  messageDiv.appendChild(messageContent);
  
  // Botón de eliminar para admin (solo si hay ID de mensaje)
  if (data._id) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete-message';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Eliminar mensaje';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm('¿Eliminar este mensaje?')) {
        socket.emit('delete message', {
          messageId: data._id,
          conversationId: activeConversationId
        });
      }
    };
    messageDiv.appendChild(deleteBtn);
  }
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

// ============================================
// MODAL Y AUTENTICACIÓN
// ============================================

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
