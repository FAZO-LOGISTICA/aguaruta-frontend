// src/services/api.js
// Configuración centralizada de API para AguaRuta (Render + Netlify)
// Autor: Equipo FAZO-LOGÍSTICA — Octubre 2025

import axios from "axios";

// ✅ URL base automática (usa .env si existe, o Render directo)
const BASE_URL =
  process.env.REACT_APP_BACKEND_URL || "https://aguaruta-backend.onrender.com";

// ✅ Instancia centralizada de axios
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Interceptor global: logs y manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API error:", error?.response || error.message);
    return Promise.reject(error);
  }
);

/* ---------------------------------------------------------------------------
   MÉTODOS DE API CENTRALIZADOS
--------------------------------------------------------------------------- */
export const apiMethods = {
  /* ---------------- RUTAS ACTIVAS ---------------- */
  async getRutasActivas() {
    // El backend devuelve { data: [...] }
    const { data } = await api.get("/rutas-activas");
    return data.data || [];
  },

  async updateRutaActiva(id, payload) {
    const { data } = await api.put(`/rutas-activas/${id}`, payload);
    return data;
  },

  async deleteRutaActiva(id) {
    const { data } = await api.delete(`/rutas-activas/${id}`);
    return data;
  },

  /* ---------------- ENTREGAS (APP MÓVIL) ---------------- */
  registrarEntrega(formData) {
    return api.post("/entregas-app", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /* ---------------- CAMIONES ---------------- */
  async getCamiones() {
    const { data } = await api.get("/camiones");
    return data;
  },

  /* ---------------- ESTADÍSTICAS / DASHBOARD ---------------- */
  async getEstadisticasDashboard(fecha) {
    const { data } = await api.get(`/estadisticas?fecha=${fecha}`);
    return data;
  },

  async getEntregasTiempoReal(fecha) {
    const { data } = await api.get(`/entregas-tiempo-real?fecha=${fecha}`);
    return data;
  },

  /* ---------------- TEST / DIAGNÓSTICO ---------------- */
  async healthCheck() {
    try {
      const { data } = await api.get("/health");
      console.log("✅ Backend activo:", data);
      return data;
    } catch (error) {
      console.error("❌ Backend inactivo:", error.message);
      return null;
    }
  },
};

/* ---------------------------------------------------------------------------
   NOTA IMPORTANTE
   - Si la tabla Rutas Activas sigue vacía, verifica que BASE_URL sea exactamente:
     https://aguaruta-backend.onrender.com
   - Si usas variables de entorno en Netlify, agrégala así:
     REACT_APP_BACKEND_URL=https://aguaruta-backend.onrender.com
--------------------------------------------------------------------------- */

export default api;
