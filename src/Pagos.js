// src/Pagos.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import API_URL from "./config";

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const FORMAS_PAGO = ["efectivo","transferencia","otro"];

const hoy = new Date();
const AÑO_HOY = hoy.getFullYear();
const MES_HOY = hoy.getMonth() + 1;

// ─── Colores estado ───
function badgeEstado(estado) {
  if (estado === "pagado")       return { bg: "#dcfce7", color: "#166534", label: "✅ Pagado" };
  if (estado === "moroso")       return { bg: "#fee2e2", color: "#991b1b", label: "🔴 Moroso" };
  return                                { bg: "#f1f5f9", color: "#64748b", label: "⬜ Sin entregas" };
}

export default function Pagos() {
  const [vista, setVista] = useState("resumen"); // resumen | familia
  const [anio, setAnio]   = useState(AÑO_HOY);
  const [mes, setMes]     = useState(MES_HOY);
  const [camion, setCamion] = useState("");
  const [diaFiltro, setDiaFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [rutasDias, setRutasDias] = useState({}); // camion -> dias disponibles
  const [resumen, setResumen]   = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState("");

  // Vista familia
  const [familiaActual, setFamiliaActual] = useState(null);
  const [cargandoFamilia, setCargandoFamilia] = useState(false);

  // Precio editable
  const [editandoPrecio, setEditandoPrecio] = useState(false);
  const [nuevoPrecio, setNuevoPrecio]       = useState("");

  // Pago
  const [modalPago, setModalPago] = useState(null); // familia del modal
  const [formPago, setFormPago]   = useState({ monto: "", forma_pago: "efectivo", observacion: "" });

  // Editar jefe de hogar
  const [modalEditarFamilia, setModalEditarFamilia] = useState(false);
  const [formFamilia, setFormFamilia] = useState({ nombre: "", camion: "", litros: "", telefono: "" });

  // Residente
  const [modalResidente, setModalResidente] = useState(null); // familia_id
  const [formResidente, setFormResidente]   = useState({ nombre: "", rut: "", observacion: "" });
  const [editResidente, setEditResidente]   = useState(null);

  const camiones = ["A1","A2","A3","A4","A5","M1","M2","M3"];
  const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"];

  // Cargar días disponibles por camión
  useEffect(() => {
    axios.get(`${API_URL}/rutas-activas`).then(res => {
      const map = {};
      (res.data || []).forEach(r => {
        if (!map[r.camion]) map[r.camion] = new Set();
        if (r.dia) map[r.camion].add(r.dia.toUpperCase());
      });
      const result = {};
      Object.keys(map).forEach(c => { result[c] = [...map[c]].sort(); });
      setRutasDias(result);
    }).catch(() => {});
  }, []);

  // ── Cargar resumen ──
  const cargarResumen = async () => {
    try {
      setCargando(true); setError("");
      const params = { anio, mes };
      if (camion) params.camion = camion;
      const res = await axios.get(`${API_URL}/resumen-pagos`, { params });
      setResumen(res.data);
      setNuevoPrecio(res.data.precio_unitario || "");
    } catch (e) {
      setError("No se pudo cargar el resumen.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarResumen(); }, [anio, mes, camion]);

  // ── Cargar detalle familia ──
  const abrirFamilia = async (fid) => {
    try {
      setCargandoFamilia(true);
      const res = await axios.get(`${API_URL}/familias/${fid}`);
      setFamiliaActual(res.data);
      setVista("familia");
    } catch { setError("No se pudo cargar la familia."); }
    finally { setCargandoFamilia(false); }
  };

  // ── Guardar precio ──
  const guardarPrecio = async () => {
    try {
      await axios.post(`${API_URL}/precios-mes`, {
        anio, mes, precio_unitario: parseFloat(nuevoPrecio)
      });
      setEditandoPrecio(false);
      cargarResumen();
    } catch { alert("Error guardando precio"); }
  };

  // ── Registrar pago ──
  const registrarPago = async () => {
    if (!formPago.monto) return alert("Ingresa el monto");
    try {
      await axios.post(`${API_URL}/pagos`, {
        jefe_id: modalPago.id,
        anio, mes,
        monto: parseFloat(formPago.monto),
        forma_pago: formPago.forma_pago,
        observacion: formPago.observacion,
      });
      setModalPago(null);
      setFormPago({ monto: "", forma_pago: "efectivo", observacion: "" });
      cargarResumen();
      if (familiaActual?.id === modalPago.id) abrirFamilia(modalPago.id);
    } catch { alert("Error registrando pago"); }
  };

  // ── Editar jefe de hogar ──
  const abrirEditarFamilia = () => {
    setFormFamilia({
      nombre: familiaActual.nombre,
      camion: familiaActual.camion,
      litros: String(familiaActual.litros),
      telefono: familiaActual.telefono || "",
    });
    setModalEditarFamilia(true);
  };

  const guardarFamilia = async () => {
    if (!formFamilia.nombre.trim()) return alert("El nombre es obligatorio");
    if (!formFamilia.litros || isNaN(formFamilia.litros)) return alert("Los litros deben ser un número");
    try {
      await axios.put(`${API_URL}/familias/${familiaActual.id}`, {
        nombre: formFamilia.nombre.trim(),
        camion: formFamilia.camion.toUpperCase(),
        litros: parseInt(formFamilia.litros),
        telefono: formFamilia.telefono,
      });
      setModalEditarFamilia(false);
      abrirFamilia(familiaActual.id);
      cargarResumen();
    } catch { alert("Error guardando cambios"); }
  };

  // ── Agregar residente ──
  const guardarResidente = async () => {
    if (!formResidente.nombre.trim()) return alert("Ingresa el nombre");
    try {
      if (editResidente) {
        await axios.put(`${API_URL}/residentes/${editResidente}`, formResidente);
      } else {
        await axios.post(`${API_URL}/familias/${modalResidente}/residentes`, formResidente);
      }
      setModalResidente(null); setEditResidente(null);
      setFormResidente({ nombre: "", rut: "", observacion: "" });
      if (familiaActual) abrirFamilia(familiaActual.id);
    } catch { alert("Error guardando residente"); }
  };

  const eliminarResidente = async (rid) => {
    if (!window.confirm("¿Eliminar este residente?")) return;
    try {
      await axios.delete(`${API_URL}/residentes/${rid}`);
      abrirFamilia(familiaActual.id);
    } catch { alert("Error eliminando residente"); }
  };

  const eliminarPago = async (pid) => {
    if (!window.confirm("¿Eliminar este pago?")) return;
    try {
      await axios.delete(`${API_URL}/pagos/${pid}`);
      abrirFamilia(familiaActual.id);
      cargarResumen();
    } catch { alert("Error eliminando pago"); }
  };

  // ── Filtro local (día se filtra desde rutas) ──
  const familiasFiltradas = useMemo(() => {
    if (!resumen?.familias) return [];
    const q = busqueda.toLowerCase();
    let lista = resumen.familias.filter(f => !q || f.nombre.toLowerCase().includes(q));
    // Filtro por día: comparar contra rutas activas usando los nombres
    if (diaFiltro && camion) {
      lista = lista.filter(f => f._dias?.includes(diaFiltro));
    }
    return lista;
  }, [resumen, busqueda, diaFiltro, camion]);

  // ── Datos familia en resumen ──
  const datosFamiliaEnResumen = (fid) =>
    resumen?.familias?.find(f => f.id === fid);

  // ============================================================
  // RENDER VISTA FAMILIA
  // ============================================================
  if (vista === "familia" && familiaActual) {
    const datos = datosFamiliaEnResumen(familiaActual.id);
    const badge = badgeEstado(datos?.estado);
    return (
      <div className="main-container fade-in">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => setVista("resumen")} style={sBtn("#f1f5f9","#1e293b")}>
            ← Volver
          </button>
          <h2 className="titulo" style={{ margin: 0 }}>👨‍👩‍👧 {familiaActual.nombre}</h2>
          <span style={{ ...sBadge, background: badge.bg, color: badge.color }}>{badge.label}</span>
          <button onClick={abrirEditarFamilia} style={sBtn("#e0f2fe","#0369a1")}>
            ✏️ Editar jefe de hogar
          </button>
        </div>

        {/* Info familia */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Camión",    val: familiaActual.camion },
            { label: "Litros/sem",val: `${familiaActual.litros?.toLocaleString()} L` },
            { label: "Personas",  val: `${familiaActual.personas} persona${familiaActual.personas !== 1 ? "s" : ""}` },
            { label: "Teléfono",  val: familiaActual.telefono || "—" },
          ].map((k,i) => (
            <div key={i} style={sKpi}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Cobro del mes seleccionado */}
        {datos && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
              💰 Cobro {MESES[mes]} {anio}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {[
                { label: "Entregas del mes", val: datos.entregas_mes },
                { label: "Total calculado",  val: `$${datos.cobro_calculado?.toLocaleString()}` },
                { label: "Pagado",           val: `$${datos.pagado?.toLocaleString()}`, color: "#16a34a" },
                { label: "Deuda",            val: `$${datos.deuda?.toLocaleString()}`, color: datos.deuda > 0 ? "#dc2626" : "#16a34a" },
              ].map((k,i) => (
                <div key={i} style={sKpi}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: k.color || "#0f172a" }}>{k.val}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setModalPago(datos)}
              style={{ ...sBtn("#1d4ed8","#fff"), marginTop: 14, width: "100%", padding: "12px 0" }}
            >
              💳 Registrar pago {MESES[mes]}
            </button>
          </div>
        )}

        {/* Residentes */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              👥 Grupo familiar ({familiaActual.residentes?.length || 0} residente{familiaActual.residentes?.length !== 1 ? "s" : ""})
            </div>
            <button
              onClick={() => { setModalResidente(familiaActual.id); setEditResidente(null); setFormResidente({ nombre: "", rut: "", observacion: "" }); }}
              style={sBtn("#0f4c81","#fff")}
            >
              + Agregar residente
            </button>
          </div>

          {familiaActual.residentes?.length === 0 ? (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0", fontSize: 13 }}>
              Sin residentes registrados — agrega los miembros del hogar
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Nombre","RUT","Observación",""].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {familiaActual.residentes.map(r => (
                  <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{r.nombre}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{r.rut || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{r.observacion || "—"}</td>
                    <td style={{ padding: "10px 12px", display: "flex", gap: 6 }}>
                      <button onClick={() => {
                        setEditResidente(r.id);
                        setFormResidente({ nombre: r.nombre, rut: r.rut || "", observacion: r.observacion || "" });
                        setModalResidente(familiaActual.id);
                      }} style={sBtn("#e0f2fe","#0369a1")}>✏️</button>
                      <button onClick={() => eliminarResidente(r.id)} style={sBtn("#fee2e2","#dc2626")}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Historial pagos */}
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📋 Historial de pagos</div>
          {familiaActual.pagos?.length === 0 ? (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0", fontSize: 13 }}>Sin pagos registrados</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Mes","Año","Monto","Forma","Observación",""].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {familiaActual.pagos.map(p => (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px" }}>{MESES[p.mes]}</td>
                    <td style={{ padding: "10px 12px" }}>{p.anio}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#16a34a" }}>${Number(p.monto).toLocaleString()}</td>
                    <td style={{ padding: "10px 12px", textTransform: "capitalize" }}>{p.forma_pago}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{p.observacion || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button onClick={() => eliminarPago(p.id)} style={sBtn("#fee2e2","#dc2626")}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER VISTA RESUMEN
  // ============================================================
  return (
    <div className="main-container fade-in">
      <h2 className="titulo">💰 Gestión de Pagos</h2>

      {/* Filtros + precio */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <label style={sLabel}>Mes</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={sInput}>
            {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={sLabel}>Año</label>
          <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ ...sInput, width: 90 }} />
        </div>
        <div>
          <label style={sLabel}>Camión</label>
          <select value={camion} onChange={e => { setCamion(e.target.value); setDiaFiltro(""); }} style={sInput}>
            <option value="">Todos</option>
            {camiones.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={sLabel}>Día</label>
          <select
            value={diaFiltro}
            onChange={e => setDiaFiltro(e.target.value)}
            style={sInput}
            disabled={!camion}
          >
            <option value="">Todos los días</option>
            {(camion && rutasDias[camion] ? rutasDias[camion] : ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"]).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={sLabel}>Buscar nombre</label>
          <input
            placeholder="Nombre jefe de hogar..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...sInput, minWidth: 200 }}
          />
        </div>
        <button onClick={cargarResumen} disabled={cargando} style={sBtn("#1d4ed8","#fff")}>
          {cargando ? "..." : "🔄 Actualizar"}
        </button>
      </div>

      {/* Precio del mes */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "14px 20px", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>💵 Precio unitario {MESES[mes]} {anio} (por entrega 700L):</span>
        {editandoPrecio ? (
          <>
            <input
              type="number"
              value={nuevoPrecio}
              onChange={e => setNuevoPrecio(e.target.value)}
              style={{ ...sInput, width: 120 }}
              placeholder="Ej: 1000"
            />
            <button onClick={guardarPrecio} style={sBtn("#16a34a","#fff")}>💾 Guardar</button>
            <button onClick={() => setEditandoPrecio(false)} style={sBtn("#f1f5f9","#374151")}>Cancelar</button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#0f4c81" }}>
              {resumen?.precio_unitario > 0 ? `$${Number(resumen.precio_unitario).toLocaleString()}` : "⚠️ Sin precio definido"}
            </span>
            <button onClick={() => setEditandoPrecio(true)} style={sBtn("#e0f2fe","#0369a1")}>✏️ Editar</button>
          </>
        )}
      </div>

      {/* KPIs resumen */}
      {resumen?.resumen && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Total familias",  val: resumen.resumen.total_familias,                            color: "#0f172a" },
            { label: "✅ Pagados",      val: resumen.resumen.pagados,                                   color: "#16a34a" },
            { label: "🔴 Morosos",      val: resumen.resumen.morosos,                                   color: "#dc2626" },
            { label: "Total cobrado",   val: `$${resumen.resumen.total_cobrado?.toLocaleString()}`,     color: "#0f4c81" },
            { label: "Total pagado",    val: `$${resumen.resumen.total_pagado?.toLocaleString()}`,      color: "#16a34a" },
            { label: "Total deuda",     val: `$${resumen.resumen.total_deuda?.toLocaleString()}`,       color: "#dc2626" },
          ].map((k,i) => (
            <div key={i} style={sKpi}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.val}</div>
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ color: "#dc2626", marginBottom: 12 }}>{error}</div>}

      {/* Panel familias con búsqueda inline */}
      <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>

        {/* Contador + filtros activos */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
          {resumen?.familias?.length > 0 && (
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
              Mostrando {familiasFiltradas.length} de {resumen.familias.length} familias
              {camion && <span style={{ marginLeft: 8, background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>🚚 {camion}</span>}
              {diaFiltro && <span style={{ marginLeft: 6, background: "#ede9fe", color: "#7c3aed", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>📅 {diaFiltro}</span>}
              {busqueda && <span style={{ marginLeft: 6, background: "#fef9c3", color: "#854d0e", padding: "2px 8px", borderRadius: 12, fontSize: 11 }}>🔍 "{busqueda}"</span>}
            </div>
          )}
          {(camion || diaFiltro || busqueda) && (
            <button
              onClick={() => { setCamion(""); setDiaFiltro(""); setBusqueda(""); }}
              style={{ ...sBtn("#f1f5f9","#64748b"), fontSize: 11, padding: "4px 10px", marginLeft: "auto" }}
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        {/* Cabecera tabla */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Jefe de hogar","Camión","Litros","Personas","Entregas","Cobro","Pagado","Deuda","Estado",""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>⏳ Cargando familias...</td></tr>
              )}
              {!cargando && familiasFiltradas.map(f => {
                const badge = badgeEstado(f.estado);
                return (
                  <tr key={f.id} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                  >
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}
                      onClick={() => abrirFamilia(f.id)}>{f.nombre}</td>
                    <td style={{ padding: "10px 14px" }} onClick={() => abrirFamilia(f.id)}>{f.camion}</td>
                    <td style={{ padding: "10px 14px" }} onClick={() => abrirFamilia(f.id)}>{f.litros?.toLocaleString()} L</td>
                    <td style={{ padding: "10px 14px" }} onClick={() => abrirFamilia(f.id)}>{f.personas}</td>
                    <td style={{ padding: "10px 14px" }} onClick={() => abrirFamilia(f.id)}>{f.entregas_mes}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }} onClick={() => abrirFamilia(f.id)}>${f.cobro_calculado?.toLocaleString()}</td>
                    <td style={{ padding: "10px 14px", color: "#16a34a", fontWeight: 600 }} onClick={() => abrirFamilia(f.id)}>${f.pagado?.toLocaleString()}</td>
                    <td style={{ padding: "10px 14px", color: f.deuda > 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }} onClick={() => abrirFamilia(f.id)}>${f.deuda?.toLocaleString()}</td>
                    <td style={{ padding: "10px 14px" }} onClick={() => abrirFamilia(f.id)}>
                      <span style={{ ...sBadge, background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => setModalPago(f)} style={sBtn("#dcfce7","#16a34a")}>💳 Pagar</button>
                    </td>
                  </tr>
                );
              })}
              {!cargando && familiasFiltradas.length === 0 && resumen?.familias?.length > 0 && (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                  Sin resultados para "{busqueda}"
                </td></tr>
              )}
              {!cargando && !resumen?.familias?.length && (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                  Sin familias — el backend sincronizará desde rutas_activas automáticamente
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL EDITAR FAMILIA ── */}
      {modalEditarFamilia && (
        <div style={sOverlay}>
          <div style={sModal}>
            <h3 style={{ marginBottom: 16 }}>✏️ Editar jefe de hogar</h3>
            <label style={sLabel}>Nombre *</label>
            <input
              placeholder="Nombre completo"
              value={formFamilia.nombre}
              onChange={e => setFormFamilia(f => ({...f, nombre: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 10 }}
            />
            <label style={sLabel}>Camión *</label>
            <select
              value={formFamilia.camion}
              onChange={e => setFormFamilia(f => ({...f, camion: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 10 }}
            >
              {["A1","A2","A3","A4","A5","M1","M2","M3"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label style={sLabel}>Litros asignados *</label>
            <input
              type="number"
              placeholder="Ej: 2100"
              value={formFamilia.litros}
              onChange={e => setFormFamilia(f => ({...f, litros: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 4 }}
            />
            {formFamilia.litros && !isNaN(formFamilia.litros) && (
              <div style={{ fontSize: 12, color: "#0369a1", marginBottom: 10 }}>
                = {Math.floor(parseInt(formFamilia.litros) / 700)} persona{Math.floor(parseInt(formFamilia.litros) / 700) !== 1 ? "s" : ""}
                {parseInt(formFamilia.litros) % 700 > 0 ? ` + ${parseInt(formFamilia.litros) % 700}L extra` : ""}
              </div>
            )}
            <label style={sLabel}>Teléfono</label>
            <input
              placeholder="Ej: 912345678"
              value={formFamilia.telefono}
              onChange={e => setFormFamilia(f => ({...f, telefono: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={guardarFamilia} style={{ ...sBtn("#0f4c81","#fff"), flex: 1, padding: "10px 0" }}>
                💾 Guardar cambios
              </button>
              <button onClick={() => setModalEditarFamilia(false)} style={{ ...sBtn("#f1f5f9","#374151"), flex: 1, padding: "10px 0" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PAGO ── */}
      {modalPago && (
        <div style={sOverlay}>
          <div style={sModal}>
            <h3 style={{ marginBottom: 4 }}>💳 Registrar pago</h3>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
              {modalPago.nombre} — {MESES[mes]} {anio}<br/>
              <strong>Deuda: ${modalPago.deuda?.toLocaleString()}</strong>
            </p>
            <label style={sLabel}>Monto *</label>
            <input
              type="number"
              placeholder={`Sugerido: $${modalPago.deuda?.toLocaleString()}`}
              value={formPago.monto}
              onChange={e => setFormPago(f => ({...f, monto: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 10 }}
            />
            <label style={sLabel}>Forma de pago</label>
            <select value={formPago.forma_pago}
              onChange={e => setFormPago(f => ({...f, forma_pago: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 10 }}>
              {FORMAS_PAGO.map(fp => <option key={fp} value={fp} style={{ textTransform: "capitalize" }}>{fp}</option>)}
            </select>
            <label style={sLabel}>Observación (opcional)</label>
            <input
              placeholder="Ej: Pago parcial, resto quincena..."
              value={formPago.observacion}
              onChange={e => setFormPago(f => ({...f, observacion: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={registrarPago} style={{ ...sBtn("#16a34a","#fff"), flex: 1, padding: "10px 0" }}>✅ Confirmar pago</button>
              <button onClick={() => setModalPago(null)} style={{ ...sBtn("#f1f5f9","#374151"), flex: 1, padding: "10px 0" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RESIDENTE ── */}
      {modalResidente && (
        <div style={sOverlay}>
          <div style={sModal}>
            <h3 style={{ marginBottom: 16 }}>{editResidente ? "✏️ Editar residente" : "➕ Agregar residente"}</h3>
            <label style={sLabel}>Nombre *</label>
            <input
              placeholder="Nombre completo"
              value={formResidente.nombre}
              onChange={e => setFormResidente(f => ({...f, nombre: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 10 }}
            />
            <label style={sLabel}>RUT (opcional)</label>
            <input
              placeholder="Ej: 12.345.678-9"
              value={formResidente.rut}
              onChange={e => setFormResidente(f => ({...f, rut: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 10 }}
            />
            <label style={sLabel}>Observación (opcional)</label>
            <input
              placeholder="Ej: Adulto mayor, discapacidad..."
              value={formResidente.observacion}
              onChange={e => setFormResidente(f => ({...f, observacion: e.target.value}))}
              style={{ ...sInput, width: "100%", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={guardarResidente} style={{ ...sBtn("#0f4c81","#fff"), flex: 1, padding: "10px 0" }}>💾 Guardar</button>
              <button onClick={() => { setModalResidente(null); setEditResidente(null); }} style={{ ...sBtn("#f1f5f9","#374151"), flex: 1, padding: "10px 0" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Estilos ──
const sKpi = {
  background: "#fff", borderRadius: 12, padding: "12px 16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
};
const sBadge = {
  display: "inline-block", padding: "3px 10px", borderRadius: 20,
  fontSize: 12, fontWeight: 600
};
const sInput = {
  padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8,
  fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0f172a"
};
const sLabel = { fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 };
const sOverlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
};
const sModal = {
  background: "#fff", borderRadius: 16, padding: 28,
  width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.15)"
};
function sBtn(bg, color) {
  return {
    padding: "8px 16px", borderRadius: 8, border: "none",
    background: bg, color, fontWeight: 600, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit"
  };
}
