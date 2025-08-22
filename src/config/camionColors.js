// src/config/camionColors.js
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

export const CAMION_ORDER = ["A1", "A2", "A3", "A4", "A5", "M1", "M2", "M3"];

// Normaliza valores raros: "a 1", "A-1", " id_camion=A1 "
export function normalizeCamion(value) {
  const s = String(value ?? "").toUpperCase().trim();
  if (!s) return null;
  // Intento directo
  if (CAMION_COLORS[s]) return s;
  // Captura patrones tipo "A 1" / "A-1" / "M 2"
  const m = s.match(/\b([AM])\s*-?\s*(\d)\b/);
  if (m) {
    const key = `${m[1]}${m[2]}`;
    return CAMION_COLORS[key] ? key : null;
  }
  return null;
}

export function getCamionColor(value) {
  const key = normalizeCamion(value);
  // celeste claro si no se reconoce (deberías ver MUY pocos así)
  return key ? CAMION_COLORS[key] : "#00AEEF";
}
