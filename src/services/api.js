// src/services/api.js
// Configuración centralizada de API para AguaRuta (Render + Netlify)

import axios from "axios";

const BASE_URL =
  process.env.REACT_APP_BACKEND_URL || "https://aguaruta-backend.onrender.com";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("❌ API error:", error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

/* ---------------------------------------------------------------------------
   MÉTODOS DE API CENTRALIZADOS
--------------------------------------------------------------------------- */
export const apiMethods = {

  /* ---------------- RUTAS ACTIVAS ---------------- */
  async getRutasActivas() {
    const { data } = await api.get("/rutas-activas");
    return Array.isArray(data) ? data : (data.data || []);
  },

  async updateRutaActiva(id, cambios) {
    const { data } = await api.put(`/rutas-activas/${id}`, cambios);
    return data;
  },

  async deleteRutaActiva(id) {
    const { data } = await api.delete(`/rutas-activas/${id}`);
    return data;
  },

  async addRutaActiva(nuevo) {
    const { data } = await api.post("/rutas-activas", nuevo);
    return data;
  },

  /* ---------------- ENTREGAS ---------------- */
  registrarEntrega(formData) {
    return api.post("/registrar-entregas", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  async getEntregas(params = {}) {
    const { data } = await api.get("/entregas", { params });
    return data;
  },

  async getEntregasTodas(params = {}) {
    const { data } = await api.get("/entregas-todas", { params });
    return data;
  },

  /* ---------------- CAMIONES ---------------- */
  async getCamiones() {
    const { data } = await api.get("/camiones");
    return data;
  },

  /* ---------------- ESTADÍSTICAS ---------------- */
  async getEstadisticasCamion(params = {}) {
    const { data } = await api.get("/estadisticas-camion", { params });
    return data;
  },

  async getNoEntregadas(params = {}) {
    const { data } = await api.get("/no-entregadas", { params });
    return data;
  },

  /* ---------------- HEALTH CHECK ---------------- */
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

export default api;
