// src/config/api.js
import axios from "axios";

const API_URL =
  (typeof window !== "undefined" && window._env_?.REACT_APP_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "";

if (!API_URL) {
  console.error("[AguaRuta] Falta REACT_APP_API_URL en Netlify.");
}

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });
