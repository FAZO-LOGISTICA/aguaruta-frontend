// src/config/camionColors.js

// ===== Paleta de alto contraste (fallback determinístico) =====
export const DEFAULT_PALETTE = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#6b5b95", "#ffa600", "#2b908f", "#f95d6a", "#003f5c",
  "#a05195", "#665191", "#ef5675", "#7a5195", "#45a29e",
];

// ===== Tus colores fijos actuales =====
export const CAMION_COLORS = {
  A1: "#1E90FF", // azul
  A2: "#8A2BE2", // violeta
  A3: "#32CD32", // verde
  A4: "#FF7F50", // coral
  A5: "#FFD700", // dorado
  M1: "#00CED1", // turquesa
  M2: "#FF1493", // fucsia
  M3: "#000000", // negro (pedido)
};

// (opcional para ordenar leyendas)
export const CAMION_ORDER = ["A1","A2","A3","A4","A5","M1","M2","M3"];

// ===== Overrides persistentes (guardar desde el UI) =====
const LS_KEY = "camionColorOverrides";
function readLS() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; } }
function writeLS(obj) { try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch {} }

export function saveCamionColor(codigo, color) {
  const key = normalizeCamion(codigo);
  if (!key || !/^#[0-9A-F]{6}$/i.test(color)) return false;
  const m = { ...readLS(), [key]: color };
  writeLS(m);
  return true;
}
export function removeCamionColor(codigo) {
  const key = normalizeCamion(codigo);
  if (!key) return false;
  const m = readLS(); delete m[key]; writeLS(m);
  return true;
}
export function listCamionColorOverrides() { return readLS(); }

// ===== Normalización robusta (A1..A99, M1..M99, variantes con espacios/guiones) =====
export function normalizeCamion(value) {
  let s = String(value ?? "").toUpperCase().trim();
  if (!s) return null;
  s = s.replace(/ID_?CAMION\s*=\s*/g, "");     // quita "id_camion="
  s = s.replace(/\s+/g, "");                   // quita espacios internos

  // Directo (si ya coincide con las claves conocidas)
  if (CAMION_COLORS[s]) return s;

  // Patrones A-6, A_6, A 6, M-12, etc.
  const m = s.match(/^([A-Z])[-_ ]?(\d{1,2})$/);
  if (m) return `${m[1]}${parseInt(m[2], 10)}`;

  // Si viene como "A6" o "M14" u otro código alfanumérico similar, úsalo tal cual
  if (/^[A-Z]+\d+$/i.test(s)) return s;

  // Como último recurso, devuelve el string limpio (permitimos hashing)
  return s;
}

// ===== Color determinístico por código (djb2 -> índice paleta) =====
function deterministicColor(key) {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) + key.charCodeAt(i);
  const idx = Math.abs(h) % DEFAULT_PALETTE.length;
  return DEFAULT_PALETTE[idx];
}

// ===== API principal =====
export function getCamionColor(value) {
  const key = normalizeCamion(value);
  if (!key) return "#00AEEF"; // celeste si no se reconoce

  const ls = readLS();                // 1) override guardado por el usuario
  if (ls[key]) return ls[key];

  if (CAMION_COLORS[key]) return CAMION_COLORS[key]; // 2) tus colores fijos

  return deterministicColor(key);     // 3) color estable para A6, M4, M5, A7, arrendados, etc.
}
