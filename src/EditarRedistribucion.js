import axios from "axios";
import API_URL from "./config";

// si no la tienes ya, pon este normalizador arriba del componente:
function normaliza(r, idx) {
  const lat = r.latitud ?? r.lat ?? r.latitude ?? r.Latitud ?? null;
  const lon = r.longitud ?? r.lon ?? r.lng ?? r.longitude ?? r.Longitud ?? null;
  const dia = r.dia_asignado ?? r.dia ?? r.DIA ?? r.diaAsignado ?? null;
  return {
    id: r.id ?? idx + 1,
    camion: r.camion ?? r.CAMION ?? r.camion_asignado ?? null,
    nombre: r.nombre ?? r.NOMBRE ?? r.jefe_hogar ?? r.jefe ?? null,
    litros: r.litros ?? r.LITROS ?? r.litros_de_entrega ?? null,
    telefono: r.telefono ?? r.TELEFONO ?? r.phone ?? null,
    dia,
    dia_asignado: r.dia_asignado ?? null,
    latitud: lat != null ? Number(lat) : null,
    longitud: lon != null ? Number(lon) : null,
  };
}

// dentro del componente (usa tus propios setters: setFilas, setCamiones, setDias, etc.)
async function cargarRedistribucion() {
  // 1) DB
  try {
    const { data } = await axios.get(`${API_URL}/redistribucion`, { timeout: 15000 });
    const arr = Array.isArray(data) ? data : [];
    if (arr.length > 0) {
      const filas = arr.map(normaliza).filter(p => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
      setFilas(filas);
      setCamiones([...new Set(filas.map(p => p.camion))].filter(Boolean));
      setDias([...new Set(filas.map(p => p.dia_asignado || p.dia))].filter(Boolean));
      return;
    }
  } catch (e) {
    console.warn("DB /redistribucion vacía o error:", e?.message || e);
  }

  // 2) Fallback JSON estático (mismo sitio: no necesita CORS)
  const rutasJSON = [
    "/datos/RutasMapaFinal_con_telefono.json",
    "/data/RutasMapaFinal_con_telefono.json",
  ];
  for (const ruta of rutasJSON) {
    try {
      const { data } = await axios.get(ruta, { timeout: 15000 });
      const arr = Array.isArray(data) ? data : [];
      const filas = arr.map(normaliza).filter(p => Number.isFinite(p.latitud) && Number.isFinite(p.longitud));
      if (filas.length > 0) {
        setFilas(filas);
        setCamiones([...new Set(filas.map(p => p.camion))].filter(Boolean));
        setDias([...new Set(filas.map(p => p.dia_asignado || p.dia))].filter(Boolean));
        return;
      }
    } catch {}
  }

  // 3) Nada disponible
  setFilas([]);
  setCamiones([]);
  setDias([]);
}
