// src/Auditoria.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_URL from "./config";

function toLocal(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default function Auditoria() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [actor, setActor] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await axios.get(`${API_URL}/auditoria`, { timeout: 20000 });
        if (Array.isArray(data)) {
          setRows(data);
        } else {
          setRows([]);
        }
      } catch (e) {
        // fallback local
        const local = JSON.parse(localStorage.getItem("AGUARUTA_AUDIT") || "[]");
        setRows(Array.isArray(local) ? local : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtrados = useMemo(() => {
    return rows.filter((r) => {
      const s = JSON.stringify(r).toLowerCase();
      const okQ = q ? s.includes(q.toLowerCase()) : true;
      const okActor = actor ? String(r?.actor || "").toLowerCase().includes(actor.toLowerCase()) : true;
      const t = r?.ts ? new Date(r.ts).getTime() : null;
      const okDesde = desde ? (t ? t >= new Date(desde).getTime() : true) : true;
      const okHasta = hasta ? (t ? t <= new Date(hasta).getTime() + 86400000 - 1 : true) : true;
      return okQ && okActor && okDesde && okHasta;
    });
  }, [rows, q, actor, desde, hasta]);

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Auditoría</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <input placeholder="Buscar texto" value={q} onChange={(e) => setQ(e.target.value)} />
        <input placeholder="Actor (usuario)" value={actor} onChange={(e) => setActor(e.target.value)} />
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>

      {loading ? <p>Cargando…</p> : null}
      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

      <table className="tabla" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Actor</th>
            <th>Acción</th>
            <th>IP</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((r, idx) => (
            <tr key={idx}>
              <td>{toLocal(r.ts || r.fecha || r.datetime)}</td>
              <td>{r.actor || "-"}</td>
              <td>{r.accion || r.action || "-"}</td>
              <td>{r.ip || "-"}</td>
              <td style={{ textAlign: "left" }}>
                <code style={{ whiteSpace: "pre-wrap" }}>
                  {typeof r.detalle === "object" ? JSON.stringify(r.detalle) : (r.detalle || r.detail || "-")}
                </code>
              </td>
            </tr>
          ))}
          {!loading && filtrados.length === 0 && (
            <tr><td colSpan={5}>Sin registros</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
