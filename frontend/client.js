// Alias para cumplir con la estructura solicitada.
// Reutiliza la lógica existente de la app.
// Nota: mantenemos `index.html` usando `main.js` para no romper la UI.

// Cargamos el script principal dinámicamente para mantener una única fuente de verdad
(function loadMain() {
  var s = document.createElement('script');
  s.src = 'main.js';
  document.head.appendChild(s);
})();


