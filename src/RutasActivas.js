// src/RutasActivas.js
import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { toast } from "sonner";
import { apiMethods } from "./services/api"; // ✅ usamos apiMethods centralizado
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

// GET /rutas-activas con reintentos
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

// Normalizar fila de backend → frontend
const normalizaFila = (r) => ({
  id: r.id ?? null,
  camion: r.camion ?? r.CAMION ?? r.camion_asignado ?? r.id_camion ?? "",
  nombre: r.nombre ?? r.NOMBRE ?? r.jefe_hogar ?? r.jefe ?? "",
  dia: r.dia ?? r.dia_asignado ?? r.DIA ?? "",
  litros: toNumberOrNull(r.litros ?? r.LITROS ?? r.litros_de_entrega),
  telefono: r.telefono ?? r.TELEFONO ?? r.phone ?? "",
  latitud: toNumberOrNull(r.latitud ?? r.lat ?? r.latitude ?? r.Latitud),
  longitud: toNumberOrNull(r.longitud ?? r.lon ?? r.lng ?? r.longitude ?? r.Longitud),
});

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

  useEffect(() => {
    let cancel = false;

    (async () => {
      setCargando(true);
      setError("");
      setWarning("");
      setSoloLectura(false);

      try {
        const arr = await fetchRutasActivasConReintentos(3);
        if (!cancel) {
          setDatos(arr.map(normalizaFila));
          setCargando(false);
        }
        return;
      } catch (e) {
        console.warn("Backend /rutas-activas no disponible:", e?.message || e);
      }

      // Fallback JSON local
      try {
        const resp = await fetch("/datos/RutasMapaFinal_con_telefono.json");
        if (resp.ok) {
          const data = await resp.json();
          if (!cancel) {
            setDatos((Array.isArray(data) ? data : []).map(normalizaFila));
            setWarning("Mostrando datos de respaldo (solo lectura).");
            setSoloLectura(true);
            setCargando(false);
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

    return () => {
      cancel = true;
    };
  }, []);

  const onEditar = (row) => {
    setEditandoId(row.id);
    setCambios({ ...row });
  };

  const guardarCambios = async (row) => {
    if (soloLectura) {
      toast.warning("Estás en modo solo lectura (fallback).");
      return;
    }
    if (!row.id) {
      toast.error("Este registro no tiene ID real. Recarga la página.");
      return;
    }
    if (!window.confirm("¿Guardar cambios en este registro?")) return;

    const diff = {};
    for (const key of ["camion", "nombre", "dia", "telefono"]) {
      if (cambios[key] !== row[key]) diff[key] = cambios[key]?.trim() || null;
    }
    if (toNumberOrNull(cambios.litros) !== row.litros)
      diff.litros = toNumberOrNull(cambios.litros);
    if (toNumberOrNull(cambios.latitud) !== row.latitud)
      diff.latitud = toNumberOrNull(cambios.latitud);
    if (toNumberOrNull(cambios.longitud) !== row.longitud)
      diff.longitud = toNumberOrNull(cambios.longitud);

    if (Object.keys(diff).length === 0) {
      setEditandoId(null);
      setCambios({});
      return;
    }

    try {
      setGuardando(true);
      await apiMethods.updateRutaActiva(row.id, diff);
      setDatos((prev) => prev.map((r0) => (r0.id === row.id ? { ...r0, ...diff } : r0)));
      toast.success("✅ Cambios guardados");
      setEditandoId(null);
      setCambios({});
    } catch (e) {
      toast.error("Error al guardar cambios");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarFila = async (row) => {
    if (soloLectura) {
      toast.warning("Estás en modo solo lectura (fallback).");
      return;
    }
    if (!row.id) {
      toast.error("Este registro no tiene ID real. Recarga la página.");
      return;
    }
    if (!window.confirm(`¿Eliminar “${row.nombre || "registro"}”?`)) return;

    try {
      await apiMethods.deleteRutaActiva(row.id);
      setDatos((prev) => prev.filter((r0) => r0.id !== row.id));
      toast.success("🗑️ Registro eliminado");
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  /* -------- exportaciones -------- */
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RutasActivas");
    XLSX.writeFile(wb, "rutas_activas.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [["Camión", "Nombre", "Día", "Litros", "Teléfono", "Latitud", "Longitud"]],
      body: datos.map((d) => [
        d.camion,
        d.nombre,
        d.dia,
        d.litros,
        d.telefono,
        d.latitud,
        d.longitud,
      ]),
    });
    doc.save("rutas_activas.pdf");
  };

  /* -------- filtros -------- */
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
  if (error) return <div className="main-container fade-in"><p>{error}</p></div>;

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Rutas Activas por Camión</h2>

      {warning && <div className="alert alert-warning">{warning}</div>}

      <div className="botones-exportar">
        <button onClick={exportarExcel}>📊 Exportar Excel</button>
        <button onClick={exportarPDF}>🧾 Exportar PDF</button>
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Camión<br /><input value={filtro.camion} onChange={(e) => setFiltro({ ...filtro, camion: e.target.value })} /></th>
            <th>Nombre<br /><input value={filtro.nombre} onChange={(e) => setFiltro({ ...filtro, nombre: e.target.value })} /></th>
            <th>Día<br /><input value={filtro.dia} onChange={(e) => setFiltro({ ...filtro, dia: e.target.value })} /></th>
            <th>Litros<br /><input value={filtro.litros} onChange={(e) => setFiltro({ ...filtro, litros: e.target.value })} /></th>
            <th>Teléfono</th><th>Latitud</th><th>Longitud</th><th>Acción</th>
          </tr>
        </thead>

        <tbody>
          {datosFiltrados.map((d) => {
            const enEdicion = editandoId === d.id;
            return (
              <tr key={d.id ?? `${d.camion}-${d.nombre}`} className={enEdicion ? "bg-yellow-50" : ""}>
                {["camion", "nombre", "dia", "litros", "telefono", "latitud", "longitud"].map((campo) => (
                  <td key={campo}>
                    {enEdicion ? (
                      <input
                        value={cambios[campo] ?? ""}
                        onChange={(e) => setCambios({ ...cambios, [campo]: e.target.value })}
                      />
                    ) : (
                      d[campo]
                    )}
                  </td>
                ))}
                <td>
                  {enEdicion ? (
                    <>
                      <button onClick={() => guardarCambios(d)} disabled={guardando}>💾 Guardar</button>
                      <button onClick={() => { setEditandoId(null); setCambios({}); }}>❌ Cancelar</button>
                      <button onClick={() => eliminarFila(d)}>🗑️ Eliminar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => onEditar(d)} disabled={soloLectura}>✏️ Editar</button>
                      <button onClick={() => eliminarFila(d)}>🗑️ Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
