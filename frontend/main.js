const API_URL = "http://localhost:3000";
let productos = [];
let paginaActual = 1;
const porPagina = 5;
let ordenCampo = null;
let ordenAsc = true;

const tbody = document.querySelector("#tabla-productos tbody");
const spinner = document.getElementById("spinner");
const mensaje = document.getElementById("mensaje");

document.getElementById("btn-cargar").addEventListener("click", cargarProductos);
document.getElementById("busqueda").addEventListener("input", renderProductos);
document.getElementById("form-producto").addEventListener("submit", agregarProducto);
document.querySelectorAll("#tabla-productos th[data-field]").forEach(th => {
  th.addEventListener("click", () => ordenarPor(th.dataset.field));
});

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
  visibles.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${p.nombre}" data-id="${p._id}" data-field="nombre" disabled></td>
      <td><input type="number" value="${p.precio}" data-id="${p._id}" data-field="precio" disabled></td>
      <td><input type="text" value="${p.descripcion}" data-id="${p._id}" data-field="descripcion" disabled></td>
      <td>
        <button class="edit-btn" onclick="editarProducto('${p._id}')">Editar</button>
        <button class="save-btn" onclick="guardarProducto('${p._id}')" style="display:none">Guardar</button>
        <button class="delete-btn" onclick="eliminarProducto('${p._id}')">Eliminar</button>
      </td>
    `;
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
  try {
    await fetch(`${API_URL}/productos/${id}`, { method: "DELETE" });
    productos = productos.filter(p => p._id !== id);
    renderProductos();
    mostrarMensaje("Producto eliminado", "ok");
  } catch {
    mostrarMensaje("Error al eliminar producto", "error");
  }
}

function editarProducto(id) {
  const inputs = document.querySelectorAll(`input[data-id="${id}"]`);
  inputs.forEach(i => i.disabled = false);
  const row = inputs[0].closest("tr");
  row.querySelector(".edit-btn").style.display = "none";
  row.querySelector(".save-btn").style.display = "inline-block";
}

async function guardarProducto(id) {
  const inputs = document.querySelectorAll(`input[data-id="${id}"]`);
  const actualizado = {};
  inputs.forEach(i => {
    actualizado[i.dataset.field] = i.type === "number" ? parseFloat(i.value) : i.value;
    i.disabled = true;
  });

  try {
    await fetch(`${API_URL}/productos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actualizado)
    });
    productos = productos.map(p => p._id === id ? { ...p, ...actualizado } : p);
    renderProductos();
    mostrarMensaje("Producto actualizado", "ok");
  } catch {
    mostrarMensaje("Error al actualizar producto", "error");
  }
}

async function agregarProducto(e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);
  const descripcion = document.getElementById("descripcion").value.trim();

  if (!nombre) return mostrarMensaje("El nombre no puede estar vacío", "error");
  if (precio <= 0 || isNaN(precio)) return mostrarMensaje("El precio debe ser mayor que 0", "error");
  if (!descripcion) return mostrarMensaje("La descripción no puede estar vacía", "error");

  const nuevo = { nombre, precio, descripcion };

  try {
    const res = await fetch(`${API_URL}/productos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo)
    });
    const creado = await res.json();
    productos.push(creado);
    renderProductos();
    e.target.reset();
    mostrarMensaje("Producto añadido", "ok");
  } catch {
    mostrarMensaje("Error al añadir producto", "error");
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
