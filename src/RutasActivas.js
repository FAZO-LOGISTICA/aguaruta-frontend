// src/RutasActivas.js
import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { toast } from "sonner";
import { apiMethods } from "./services/api";
import "./App.css";

/* -------------------- utils -------------------- */
const normalizar = (str) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toNumberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* =====================================================
   🔵 FAZO DATA
===================================================== */
function enviarFAZOData(camionesData, diasData, puntosData) {
  try {
    window.parent.postMessage(
      {
        type: "FAZO_DATA_UPDATE",
        payload: {
          camiones: camionesData || [],
          dias: diasData || [],
          puntos: puntosData || [],
        },
      },
      "*"
    );
    console.log("📤 FAZO DATA enviado:", { camionesData, diasData, puntosData });
  } catch (err) {
    console.error("❌ Error enviando FAZO DATA", err);
  }
}

/* =====================================================
   GET /rutas-activas con reintentos
===================================================== */
async function fetchRutasActivasConReintentos(intentos = 3) {
  let delay = 1500;
  for (let i = 0; i < intentos; i++) {
    try {
      const data = await apiMethods.getRutasActivas();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (i === intentos - 1) throw e;
      await sleep(delay);
      delay *= 2;
    }
  }
}

/* =====================================================
   Normalizar fila backend → frontend
===================================================== */
const normalizaFila = (r) => ({
  id: r.id ?? null,
  camion: r.camion ?? r.CAMION ?? r.camion_asignado ?? r.id_camion ?? "",
  nombre: r.nombre ?? r.NOMBRE ?? r.jefe_hogar ?? r.jefe ?? "",
  dia: r.dia ?? r.dia_asignado ?? r.DIA ?? "",
  litros: toNumberOrNull(r.litros ?? r.LITROS ?? r.litros_de_entrega),
  telefono: r.telefono ?? r.TELEFONO ?? r.phone ?? "",
  correo: r.correo ?? r.email ?? r.CORREO ?? "",
  latitud: toNumberOrNull(r.latitud ?? r.lat ?? r.latitude ?? r.Latitud),
  longitud: toNumberOrNull(r.longitud ?? r.lon ?? r.lng ?? r.longitude ?? r.Longitud),
});

/* -------------------- estilos inline -------------------- */
const sTh = {
  backgroundColor: "#0f4c81",
  color: "#ffffff",
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const sTd = {
  padding: "8px 12px",
  color: "#0f172a",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 13,
};

const sInputFiltro = {
  width: "100%",
  padding: "4px 6px",
  marginTop: 4,
  border: "1.5px solid #93c5fd",
  borderRadius: 6,
  fontSize: 12,
  color: "#0f172a",
  backgroundColor: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const sInputEdicion = {
  width: "100%",
  padding: "5px 8px",
  border: "1.5px solid #3b82f6",
  borderRadius: 6,
  fontSize: 12,
  color: "#0f172a",
  backgroundColor: "#eff6ff",
  outline: "none",
  boxSizing: "border-box",
};

const sBtn = (bg, color = "#fff") => ({
  padding: "5px 10px",
  borderRadius: 6,
  border: "none",
  background: bg,
  color,
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  marginRight: 4,
  marginBottom: 2,
});

const CAMPOS = ["camion", "nombre", "dia", "litros", "telefono", "correo", "latitud", "longitud"];

/* -------------------- componente -------------------- */
export default function RutasActivas() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [soloLectura, setSoloLectura] = useState(false);

  const [filtro, setFiltro] = useState({ camion: "", dia: "", nombre: "", litros: "" });
  const [editandoId, setEditandoId] = useState(null);
  const [cambios, setCambios] = useState({});
  const [guardando, setGuardando] = useState(false);

  /* =====================================================
     CARGA DE DATOS
  ===================================================== */
  useEffect(() => {
    let cancel = false;

    (async () => {
      setCargando(true);
      setError(""); setWarning(""); setSoloLectura(false);

      try {
        const arr = await fetchRutasActivasConReintentos(3);
        if (!cancel) {
          const normalizados = arr.map(normalizaFila);
          setDatos(normalizados);
          setCargando(false);
          enviarFAZOData(calcularCamiones(normalizados), calcularDias(normalizados), normalizados);
        }
        return;
      } catch (e) {
        console.warn("Backend /rutas-activas no disponible:", e?.message || e);
      }

      try {
        const resp = await fetch("/datos/RutasMapaFinal_con_telefono.json");
        if (resp.ok) {
          const data = await resp.json();
          if (!cancel) {
            const normalizados = (Array.isArray(data) ? data : []).map(normalizaFila);
            setDatos(normalizados);
            setWarning("Mostrando datos de respaldo (solo lectura).");
            setSoloLectura(true);
            setCargando(false);
            enviarFAZOData(calcularCamiones(normalizados), calcularDias(normalizados), normalizados);
          }
        }
      } catch {
        if (!cancel) {
          setError("No se pudieron cargar las rutas.");
          setDatos([]);
          setCargando(false);
        }
      }
    })();

    return () => { cancel = true; };
  }, []);

  function calcularCamiones(lista) {
    const mapa = {};
    for (let r of lista) {
      if (!mapa[r.camion]) mapa[r.camion] = 0;
      mapa[r.camion] += Number(r.litros || 0);
    }
    return Object.entries(mapa).map(([nombre, litros]) => ({ nombre, litros }));
  }

  function calcularDias(lista) {
    const mapa = {};
    for (let r of lista) {
      if (!mapa[r.dia]) mapa[r.dia] = 0;
      mapa[r.dia] += 1;
    }
    return Object.entries(mapa).map(([nombre, entregas]) => ({ nombre, entregas }));
  }

  /* =====================================================
     EDICIÓN
  ===================================================== */
  const onEditar = (row) => { setEditandoId(row.id); setCambios({ ...row }); };

  const guardarCambios = async (row) => {
    if (soloLectura) { toast.warning("Estás en modo solo lectura (fallback)."); return; }
    if (!row.id) { toast.error("Este registro no tiene ID real. Recarga la página."); return; }
    if (!window.confirm("¿Guardar cambios en este registro?")) return;

    const diff = {};
    for (const key of ["camion", "nombre", "dia", "telefono", "correo"]) {
      if (cambios[key] !== row[key]) diff[key] = cambios[key]?.trim() || null;
    }
    if (toNumberOrNull(cambios.litros) !== row.litros) diff.litros = toNumberOrNull(cambios.litros);
    if (toNumberOrNull(cambios.latitud) !== row.latitud) diff.latitud = toNumberOrNull(cambios.latitud);
    if (toNumberOrNull(cambios.longitud) !== row.longitud) diff.longitud = toNumberOrNull(cambios.longitud);

    if (Object.keys(diff).length === 0) { setEditandoId(null); setCambios({}); return; }

    try {
      setGuardando(true);
      await apiMethods.updateRutaActiva(row.id, diff);
      setDatos((prev) => prev.map((r0) => (r0.id === row.id ? { ...r0, ...diff } : r0)));
      toast.success("✅ Cambios guardados");
      setEditandoId(null); setCambios({});
    } catch (e) {
      toast.error("Error al guardar cambios");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarFila = async (row) => {
    if (soloLectura) { toast.warning("Estás en modo solo lectura (fallback)."); return; }
    if (!row.id) { toast.error("Este registro no tiene ID real. Recarga la página."); return; }
    if (!window.confirm(`¿Eliminar "${row.nombre || "registro"}"?`)) return;

    try {
      await apiMethods.deleteRutaActiva(row.id);
      setDatos((prev) => prev.filter((r0) => r0.id !== row.id));
      toast.success("🗑️ Registro eliminado");
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  /* -------- Exportar -------- */
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RutasActivas");
    XLSX.writeFile(wb, "rutas_activas.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.autoTable({
      head: [["Camión","Nombre","Día","Litros","Teléfono","Correo","Latitud","Longitud"]],
      body: datos.map((d) => [d.camion, d.nombre, d.dia, d.litros, d.telefono, d.correo, d.latitud, d.longitud]),
      headStyles: { fillColor: [15, 76, 129] },
    });
    doc.save("rutas_activas.pdf");
  };

  /* -------- Filtros -------- */
  const datosFiltrados = useMemo(() => {
    return datos.filter(
      (d) =>
        normalizar(d.camion).includes(normalizar(filtro.camion)) &&
        normalizar(d.dia).includes(normalizar(filtro.dia)) &&
        normalizar(d.nombre).includes(normalizar(filtro.nombre)) &&
        String(d.litros ?? "").includes(filtro.litros)
    );
  }, [datos, filtro]);

  /* -------- UI -------- */
  if (cargando) return <div className="main-container fade-in"><p>Cargando…</p></div>;
  if (error) return <div className="main-container fade-in"><p style={{ color: "#dc2626" }}>{error}</p></div>;

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">📋 Rutas Activas por Camión</h2>

      {warning && (
        <div style={{
          background: "#fef9c3", color: "#854d0e", padding: "10px 16px",
          borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: 13
        }}>
          ⚠️ {warning}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <button onClick={exportarExcel} style={sBtn("#16a34a")}>📊 Exportar Excel</button>
        <button onClick={exportarPDF} style={sBtn("#dc2626")}>🧾 Exportar PDF</button>
        <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 13 }}>
          {datosFiltrados.length} de {datos.length} registros
        </span>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, backgroundColor: "#fff" }}>
          <thead>
            <tr>
              {/* Camión */}
              <th style={sTh}>
                CAMIÓN
                <br />
                <input
                  value={filtro.camion}
                  onChange={(e) => setFiltro({ ...filtro, camion: e.target.value })}
                  placeholder="Filtrar..."
                  style={sInputFiltro}
                />
              </th>

              {/* Nombre */}
              <th style={sTh}>
                NOMBRE
                <br />
                <input
                  value={filtro.nombre}
                  onChange={(e) => setFiltro({ ...filtro, nombre: e.target.value })}
                  placeholder="Filtrar..."
                  style={sInputFiltro}
                />
              </th>

              {/* Día */}
              <th style={sTh}>
                DÍA
                <br />
                <input
                  value={filtro.dia}
                  onChange={(e) => setFiltro({ ...filtro, dia: e.target.value })}
                  placeholder="Filtrar..."
                  style={sInputFiltro}
                />
              </th>

              {/* Litros */}
              <th style={sTh}>
                LITROS
                <br />
                <input
                  value={filtro.litros}
                  onChange={(e) => setFiltro({ ...filtro, litros: e.target.value })}
                  placeholder="Filtrar..."
                  style={sInputFiltro}
                />
              </th>

              <th style={sTh}>TELÉFONO</th>
              <th style={{ ...sTh, backgroundColor: "#166534" }}>📧 CORREO</th>
              <th style={sTh}>LATITUD</th>
              <th style={sTh}>LONGITUD</th>
              <th style={sTh}>ACCIÓN</th>
            </tr>
          </thead>

          <tbody>
            {datosFiltrados.map((d, idx) => {
              const enEdicion = editandoId === d.id;
              const bgFila = enEdicion ? "#eff6ff" : idx % 2 === 0 ? "#ffffff" : "#f8fafc";

              return (
                <tr key={d.id ?? `${d.camion}-${d.nombre}`} style={{ background: bgFila }}>
                  {CAMPOS.map((campo) => (
                    <td key={campo} style={sTd}>
                      {enEdicion ? (
                        <input
                          value={cambios[campo] ?? ""}
                          onChange={(e) => setCambios({ ...cambios, [campo]: e.target.value })}
                          style={sInputEdicion}
                          type={campo === "correo" ? "email" : "text"}
                          placeholder={campo === "correo" ? "email@ejemplo.com" : ""}
                        />
                      ) : campo === "correo" && d[campo] ? (
                        <a href={`mailto:${d[campo]}`} style={{ color: "#0f4c81" }}>
                          {d[campo]}
                        </a>
                      ) : (
                        d[campo]
                      )}
                    </td>
                  ))}

                  <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                    {enEdicion ? (
                      <>
                        <button onClick={() => guardarCambios(d)} disabled={guardando} style={sBtn("#16a34a")}>
                          💾 Guardar
                        </button>
                        <button onClick={() => { setEditandoId(null); setCambios({}); }} style={sBtn("#6b7280")}>
                          ❌ Cancelar
                        </button>
                        <button onClick={() => eliminarFila(d)} style={sBtn("#dc2626")}>
                          🗑️
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => onEditar(d)} disabled={soloLectura} style={sBtn("#0f4c81")}>
                          ✏️ Editar
                        </button>
                        <button onClick={() => eliminarFila(d)} style={sBtn("#dc2626")}>
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}

            {datosFiltrados.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...sTd, textAlign: "center", color: "#94a3b8", padding: "30px 0" }}>
                  Sin resultados con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
