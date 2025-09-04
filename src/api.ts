// npm i axios axios-retry
import axios from "axios";
import axiosRetry from "axios-retry";

// Si ya usas proxy en Netlify, deja baseURL="/api"; si no, pon tu dominio Render
export const api = axios.create({
  baseURL: "/api",
  timeout: 60000, // 60s: suficiente para cold start de Render
});

axiosRetry(api, {
  retries: 2, // 2 reintentos además del original
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) || err.code === "ECONNABORTED",
});

export async function fetchRutasActivas() {
  // 1) Warm-up rápido (no importa si falla)
  try { await api.get("/health", { timeout: 8000 }); } catch {}

  // 2) Pide datos (con reintentos); si aún está frío, espera y reintenta manual
  try {
    const { data } = await api.get("/rutas-activas");
    return data;
  } catch (e) {
    // espera 4s y reintenta una vez más
    await new Promise((r) => setTimeout(r, 4000));
    const { data } = await api.get("/rutas-activas");
    return data;
  }
}
