// src/components/CamionColorPicker.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_URL from "../config";
import {
  getCamionColor,
  saveCamionColor,
  normalizeCamion,
} from "../config/camionColors";

// Cliente con timeout alto (Render frío)
const api = axios.create({ baseURL: API_URL, timeout: 60000 });

async function warmUp() {
  try { await api.get("/health", { timeout: 8000 }); } catch {}
}

// Trae set de camiones existentes:
// 1) /camiones (si existe en backend),
// 2) si falla, arma set desde /rutas-activas.
async function fetchExistingCamiones() {
  await warmUp();
  try {
    const { data } = await api.get("/camiones?only_active=false");
    if (Array.isArray(data)) {
      const set = new Set(
        data.map((c) => (c?.codigo ?? "").toString().toUpperCase()).filter(Boolean)
      );
      return set;
    }
  } catch {}
  // fallback a rutas-activas
  try {
    const { data } = await api.get("/rutas-activas");
    const arr = Array.isArray(data) ? data : [];
    const set = new Set(
      arr.map((r) => normalizeCamion(r?.camion ?? r?.CAMION)).filter(Boolean)
    );
    return set;
  } catch {}
  return new Set();
}

// Sugiere el siguiente disponible A1..A99 o M1..M99
function suggestNext(prefix, existingSet) {
  const P = String(prefix || "").toUpperCase();
  for (let i = 1; i <= 99; i++) {
    const cand = `${P}${i}`;
    if (!existingSet.has(cand)) return cand;
  }
  return null;
}

/**
 * Props:
 *  - camion: string (código actual, ej. "A6", "M4")
 *  - onChangeCamion?: (nuevoCodigo) => void
 */
export default function CamionColorPicker({ camion = "", onChangeCamion }) {
  const norm = useMemo(() => normalizeCamion(camion) || "", [camion]);
  const [color, setColor] = useState("#888888");
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [available, setAvailable] = useState(null); // null | true | false
  const [existing, setExisting] = useState(new Set());

  // Color sugerido por código
  useEffect(() => {
    setColor(getCamionColor(norm || camion));
  }, [norm, camion]);

  // Carga set de existentes al montar
  useEffect(() => {
    (async () => {
      const set = await fetchExistingCamiones();
      setExisting(set);
      if (norm) setAvailable(!set.has(norm));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify() {
    setChecking(true);
    try {
      const set = await fetchExistingCamiones();
      setExisting(set);
      setAvailable(norm ? !set.has(norm) : null);
    } finally {
      setChecking(false);
    }
  }

  function suggest(prefix) {
    const cand = suggestNext(prefix, existing);
    if (cand) onChangeCamion?.(cand);
    else alert(`No hay códigos libres con prefijo ${prefix}`);
  }

  async function crearEnBackend() {
    if (!norm) return alert("Código inválido");
    try {
      setCreating(true);
      await api.post("/camiones", {
        codigo: norm,
        nombre: null,
        capacidad_litros: null,
        activo: true,
      });
      // Después de crear, vuelve a verificar y marca como no disponible
      await verify();
      setAvailable(false);
      alert(`Camión ${norm} creado/actualizado en backend`);
    } catch (e) {
      alert(
        e?.response?.data?.detail ||
          "No se pudo crear en backend. ¿Tienes /camiones implementado?"
      );
    } finally {
      setCreating(false);
    }
  }

  const stateBadge =
    available === null ? null : available ? (
      <span className="badge-ok">Disponible ✓</span>
    ) : (
      <span className="badge-busy">Ya existe ✗</span>
    );

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Código (A6, M4, A7...)"
          value={camion}
          onChange={(e) => {
            onChangeCamion?.(e.target.value.toUpperCase());
            setAvailable(null); // reset estado al tipear
          }}
          style={{ flex: "1 1 220px" }}
        />

        <button type="button" onClick={() => suggest("A")}>Sugerir A</button>
        <button type="button" onClick={() => suggest("M")}>Sugerir M</button>

        <button type="button" onClick={verify} disabled={!norm || checking}>
          {checking ? "Verificando…" : "Verificar"}
        </button>

        {stateBadge}

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Color del camión en el mapa"
        />
        <span
          title="Vista previa"
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: color,
            border: "1px solid rgba(0,0,0,.3)",
          }}
        />

        <button
          type="button"
          onClick={() => {
            const ok = saveCamionColor(norm || camion, color);
            alert(ok ? `Color guardado para ${norm || camion}` : "Código/color inválido");
          }}
          disabled={!norm}
        >
          Guardar color
        </button>

        <button type="button" onClick={crearEnBackend} disabled={!norm || creating}>
          {creating ? "Creando…" : "Crear en backend"}
        </button>
      </div>

      {norm && (
        <small style={{ opacity: 0.8 }}>
          Código normalizado: <b>{norm}</b> — Color sugerido:{" "}
          <span style={{ color }}>{color}</span>
        </small>
      )}

      <style>{`
        .badge-ok {
          background:#e8f5e9; color:#1b5e20; border:1px solid #c8e6c9;
          padding:2px 6px; border-radius:6px; font-size:12px;
        }
        .badge-busy {
          background:#ffebee; color:#b71c1c; border:1px solid #ffcdd2;
          padding:2px 6px; border-radius:6px; font-size:12px;
        }
      `}</style>
    </div>
  );
}
