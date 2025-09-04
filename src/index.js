// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// === Auditoría: adjunta siempre el usuario en cada request Axios ===
function applyUserHeader() {
  axios.defaults.headers.common['X-User'] =
    localStorage.getItem('usuario') || 'anon';
}
applyUserHeader();

// Si cambia en otra pestaña, se vuelve a aplicar
window.addEventListener('storage', (e) => {
  if (e.key === 'usuario') applyUserHeader();
});

// (Opcional) helper para setear el usuario desde tu login
export function setUsuarioActual(nick) {
  localStorage.setItem('usuario', nick || 'anon');
  applyUserHeader();
}
// ===================================================================

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
