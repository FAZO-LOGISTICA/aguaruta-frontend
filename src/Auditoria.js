// src/Auditoria.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import API_URL from "./config";
import "./App.css";

const FIELDS = ["camion", "nombre", "dia", "litros", "telefono", "latitud", "longitud"];

function safeJSON(v) {
  try {
    if (v == null) return {};
    if (typeof v === "string") return JSON.parse(v);
    return v;
  } catch {
    return {};
  }
}

function toDate(ts) {
  // admite "2025-09-04T12:34:56Z" o similar
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(ts) {
  const d = toDate(ts);
  if (!d) return ts || "-";
  return d.toLocaleString();
}

function diffBeforeAfter(before, after) {
  const a = safeJSON(before);
  const b = safeJSON(after);
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  const changes = [];
  for (const k of keys) {
    const va = a?.[k];
    const vb = b?.[k];
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      changes.push({ campo: k, antes: va, despues: vb });
    }
  }
  // mostramos primero los campos típicos
  changes.sort((x, y) => {
    const ix = FIELDS.indexOf(x.campo); const iy = FIELDS.indexOf(y.campo);
    return (ix === -1 ? 999 : ix) - (iy === -1 ? 999 : iy);
  });
  return changes;
}

export default function Auditoria() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filtros
  const [q, setQ] = useState("");
  const [user, setUser] = useState("");
  const [accion, setAccion] = useState("ALL"); // ALL | INSERT | UPDATE | DELETE
  const [desde, setDesde] = useState("");      // yyyy-mm-dd
  const [hasta, setHasta] = useState("");      // yyyy-mm-dd
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    let tm;
    if (auto) {
      tm = setInterval(() => fetchData(), 15000);
    }
    return () => tm && clearInterval(tm);
  }, [auto]);

  async function fetchData() {
    setErr("");
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/auditoria/rutas-activas`, { timeout: 20000 });
      // esperamos un arreglo de objetos con al menos: ts, usuario, accion, before, after
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Error cargando auditoría");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const filtrados = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const dFrom = desde ? new Date(`${desde}T00:00:00`) : null;
    const dTo   = hasta ? new Date(`${hasta}T23:59:59`) : null;

    return rows.filter(r => {
      if (accion !== "ALL" && String(r.accion).toUpperCase() !== accion) return false;
      if (user && String(r.usuario || "").toLowerCase() !== user.toLowerCase()) return false;

      // rango de fechas por ts
      const d = toDate(r.ts);
      if (dFrom && (!d || d < dFrom)) return false;
      if (dTo && (!d || d > dTo)) return false;

      if (!qn) return true;

      // búsqueda simple en usuario/accion y en campos claves del after/before
      const after = safeJSON(r.after);
      const before = safeJSON(r.before);
      const pool = [
        r.usuario, r.accion, r.ts,
        after?.camion, after?.nombre, after?.dia,
        before?.camion, before?.nombre, before?.dia
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return pool.includes(qn);
    });
  }, [rows, q, user, accion, desde, hasta]);

  function exportar() {
    const data = filtrados.map(r => ({
      ts: fmtDate(r.ts),
      usuario: r.usuario,
      accion: r.accion,
      ...FIELDS.reduce((acc, k) => {
        const b = safeJSON(r.before)[k];
        const a = safeJSON(r.after)[k];
        acc[`antes.${k}`] = b ?? "";
        acc[`despues.${k}`] = a ?? "";
        return acc;
      }, {})
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, "auditoria_ruta_activa.xlsx");
  }

  return (
    <div className="main-container fade-in" style={{ maxWidth: 1200 }}>
      <h2 className="titulo">Auditoría de Cambios — Rutas Activas</h2>

      <div className="botones-exportar" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="Buscar… (usuario/nombre/camión)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <input
          placeholder="Usuario exacto (ej: operaciones)"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select value={accion} onChange={(e) => setAccion(e.target.value)}>
          <option value="ALL">Todas</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <label>Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <button onClick={fetchData} disabled={loading}>{loading ? "Cargando…" : "Actualizar"}</button>
        <button onClick={exportar} disabled={!filtrados.length}>Exportar Excel</button>

        <label style={{ marginLeft: 10 }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-refrescar
        </label>
      </div>

      {err && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{err}</div>}

      <table className="tabla">
        <thead>
          <tr>
            <th style={{ minWidth: 160 }}>Fecha</th>
            <th>Usuario</th>
            <th>Acción</th>
            <th style={{ minWidth: 200 }}>Resumen</th>
            <th style={{ minWidth: 380 }}>Cambios</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((r, i) => {
            const before = safeJSON(r.before);
            const after = safeJSON(r.after);
            const changes = diffBeforeAfter(r.before, r.after);
            return (
              <tr key={r.id || i}>
                <td>{fmtDate(r.ts)}</td>
                <td>{r.usuario || "-"}</td>
                <td>{String(r.accion || "").toUpperCase()}</td>
                <td>
                  <div><b>Camión:</b> {after.camion ?? before.camion ?? "-"}</div>
                  <div><b>Nombre:</b> {after.nombre ?? before.nombre ?? "-"}</div>
                  <div><b>Día:</b> {after.dia ?? before.dia ?? "-"}</div>
                </td>
                <td style={{ textAlign: "left" }}>
                  {changes.length === 0 ? (
                    <i>Sin diferencias</i>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {changes.map((c, j) => (
                        <li key={j}>
                          <b>{c.campo}:</b> <span style={{ color: "#7f1d1d" }}>{String(c.antes ?? "")}</span> {"→"} <span style={{ color: "#065f46" }}>{String(c.despues ?? "")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            );
          })}
          {!filtrados.length && (
            <tr>
              <td colSpan={5} style={{ opacity: 0.7 }}>Sin resultados</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
