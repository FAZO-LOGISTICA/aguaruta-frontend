import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Crear instancia de Axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15s timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error:", error);
    return Promise.reject(
      error.response?.data?.detail || "Error en la comunicación con el servidor"
    );
  }
);

export const apiMethods = {
  // Obtener rutas activas
  getRutasActivas: async () => {
    const res = await api.get("/rutas-activas");
    return res.data;
  },

  // Registrar entrega desde la app móvil (JSON o FormData con foto)
  registrarEntrega: async (data) => {
    let config = {};
    let body = data;

    // Si viene una foto, usamos FormData
    if (data.foto) {
      body = new FormData();
      body.append("entrega_id", data.entrega_id);
      body.append("estado", data.estado);
      if (data.notas) body.append("notas", data.notas);
      if (data.latitud_entrega) body.append("latitud_entrega", data.latitud_entrega);
      if (data.longitud_entrega) body.append("longitud_entrega", data.longitud_entrega);
      body.append("foto", data.foto);

      config.headers = { "Content-Type": "multipart/form-data" };
    }

    const res = await api.post("/entregas-app", body, config);
    return res.data;
  },

  // Listar camiones
  getCamiones: async () => {
    const res = await api.get("/camiones");
    return res.data;
  },

  // Obtener ruta diaria por conductor y fecha
  getRutaDiaria: async (conductorCodigo, fecha) => {
    const res = await api.get(`/rutas-diarias/${conductorCodigo}?fecha=${fecha}`);
    return res.data;
  },

  // Estadísticas del dashboard
  getEstadisticasDashboard: async (fecha) => {
    const res = await api.get(`/dashboard/estadisticas?fecha=${fecha}`);
    return res.data;
  },

  // Entregas en tiempo real
  getEntregasTiempoReal: async (fecha) => {
    const res = await api.get(`/dashboard/entregas?fecha=${fecha}`);
    return res.data;
  },
};
