// src/config/api.js
// npm i axios axios-retry
import axios from "axios";
import axiosRetry from "axios-retry";

// Si usas el proxy de Netlify, deja "/api". Si no, pon la URL completa del backend.
const API_BASE = "/api";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s para el cold start de Render
});

axiosRetry(api, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) || err.code === "ECONNABORTED",
});

export async function fetchRutasActivas() {
  // Warm-up rápido: despierta el backend si está dormido
  try { await api.get("/health", { timeout: 8000 }); } catch {}
  // Petición real (axios-retry ya reintenta)
  const { data } = await api.get("/rutas-activas");
  return data;
}
