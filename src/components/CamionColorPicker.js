// src/components/CamionColorPicker.js
import React, { useEffect, useMemo, useState } from "react";
import { getCamionColor, saveCamionColor, normalizeCamion } from "../config/camionColors";

/**
 * Props:
 *  - camion: string  (código actual, ej: "A6", "M4")
 *  - onChangeCamion?: (nuevoCodigo) => void
 */
export default function CamionColorPicker({ camion = "", onChangeCamion }) {
  const norm = useMemo(() => normalizeCamion(camion) || "", [camion]);
  const [color, setColor] = useState("#888888");

  useEffect(() => {
    setColor(getCamionColor(norm || camion));
  }, [norm, camion]);

  const handleGuardar = () => {
    const ok = saveCamionColor(norm || camion, color);
    alert(ok ? `Color guardado para ${norm || camion}` : "Código/color inválido");
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Código (A6, M4, A7...)"
          value={camion}
          onChange={(e) => onChangeCamion?.(e.target.value.toUpperCase())}
          style={{ flex: 1 }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Color del camión en el mapa"
        />
        <span
          title="Vista previa"
          style={{
            width: 18, height: 18, borderRadius: "50%",
            background: color, border: "1px solid rgba(0,0,0,.3)"
          }}
        />
        <button type="button" onClick={handleGuardar} disabled={!norm && !camion}>
          Guardar color
        </button>
      </div>
      {norm && (
        <small style={{ opacity: 0.8 }}>
          Código normalizado: <b>{norm}</b> — Color sugerido: <span style={{ color }}>{color}</span>
        </small>
      )}
    </div>
  );
}
