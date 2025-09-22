// src/services/api.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

// ✅ instancia centralizada de axios
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para logs y manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API error:", error?.response || error.message);
    return Promise.reject(error);
  }
);

/* ---------------- Métodos de API ---------------- */
export const apiMethods = {
  // Rutas activas
  getRutasActivas: () => api.get("/rutas-activas"),

  updateRutaActiva: (id, data) => api.put(`/rutas-activas/${id}`, data),

  deleteRutaActiva: (id) => api.delete(`/rutas-activas/${id}`),

  // Entregas desde la app móvil
  registrarEntrega: (formData) =>
    api.post("/entregas-app", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Camiones
  getCamiones: () => api.get("/camiones"),

  // Estadísticas y dashboard
  getEstadisticasDashboard: (fecha) =>
    api.get(`/estadisticas?fecha=${fecha}`),

  getEntregasTiempoReal: (fecha) =>
    api.get(`/entregas-tiempo-real?fecha=${fecha}`),
};
