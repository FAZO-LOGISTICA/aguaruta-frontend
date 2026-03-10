import { useState, useEffect, useRef } from "react";

const API_URL = "https://aguaruta-backend.onrender.com";
const DB_NAME = "aguaruta_offline";
const DB_VERSION = 1;
const STORE_NAME = "cola_entregas";

// ============ ESTADOS REALES ============
const ESTADOS = [
  { id: 1, label: "Entrega",                    emoji: "✅", color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  { id: 0, label: "No entrega",                 emoji: "🚫", color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  { id: 2, label: "No encontrado",              emoji: "🚪", color: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  { id: 3, label: "Camino malo",                emoji: "🚧", color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd", foto: true },
  { id: 4, label: "Falta al protocolo",         emoji: "⚠️", color: "#b45309", bg: "#fef9c3", border: "#fde047", foto: true },
  { id: 5, label: "Menor cantidad entregada",   emoji: "📉", color: "#0369a1", bg: "#e0f2fe", border: "#7dd3fc", cantidad: true },
  { id: 6, label: "Mayor cantidad entregada",   emoji: "📈", color: "#0f766e", bg: "#ccfbf1", border: "#5eead4", cantidad: true },
  { id: 7, label: "Apoyo municipal",            emoji: "🏛️", color: "#4f46e5", bg: "#eef2ff", border: "#a5b4fc" },
  { id: 8, label: "No quiere recibir x motivo", emoji: "🙅", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", motivo: true },
];

const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"];
const HOY = DIAS[new Date().getDay() - 1] || "LUNES";

// ============ INDEXEDDB HELPERS ============
function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function guardarEnCola(entrega) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ ...entrega, _ts: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function obtenerCola() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function eliminarDeCola(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// ============ COMPONENTE PRINCIPAL ============
export default function EntregaMovil() {
  const [step, setStep] = useState("buscar");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(null);
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [observaciones, setObservaciones] = useState("");
  const [cantidadReal, setCantidadReal] = useState("");
  const [motivoNoRecibe, setMotivoNoRecibe] = useState("");
  const [gps, setGps] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [entregasHoy, setEntregasHoy] = useState([]);
  const [tab, setTab] = useState("registro");
  const [diaFiltro, setDiaFiltro] = useState(HOY);
  const [camionFiltro, setCamionFiltro] = useState("");
  const [rutas, setRutas] = useState([]);
  const [colaOffline, setColaOffline] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const fileRef = useRef();
  useEffect(() => {
    let intentos = 0;
    const cargar = () => {
      fetch(`${API_URL}/rutas-activas`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setRutas(data);
            setCargandoRutas(false);
          } else if (intentos < 4) {
            intentos++;
            setTimeout(cargar, 3000);
          } else {
            setCargandoRutas(false);
          }
        })
        .catch(() => {
          if (intentos < 4) { intentos++; setTimeout(cargar, 3000); }
          else setCargandoRutas(false);
        });
    };
    cargar();
  }, []);

  // GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // Cargar cola offline al montar
  useEffect(() => {
    obtenerCola().then(setColaOffline).catch(() => {});
  }, []);

  // Sincronizar cola cuando vuelve conexión
  useEffect(() => {
    const sincronizar = async () => {
      const cola = await obtenerCola();
      if (cola.length === 0) return;
      setSincronizando(true);
      for (const item of cola) {
        try {
          const formData = new FormData();
          Object.entries(item).forEach(([k, v]) => {
            if (k !== "id" && k !== "_ts" && v !== null && v !== undefined) {
              formData.append(k, v);
            }
          });
          const res = await fetch(`${API_URL}/registrar-entregas`, { method: "POST", body: formData });
          if (res.ok) await eliminarDeCola(item.id);
        } catch {}
      }
      const colaActualizada = await obtenerCola();
      setColaOffline(colaActualizada);
      setSincronizando(false);
    };
    window.addEventListener("online", sincronizar);
    sincronizar();
    return () => window.removeEventListener("online", sincronizar);
  }, []);

  // Mostrar lista completa al seleccionar día; buscador y camión filtran dentro
  useEffect(() => {
    if (step === "form") return;
    // Sin día seleccionado → lista vacía con mensaje
    if (!diaFiltro) { setResultados([]); return; }
    let base = rutas.filter(r => (r.dia || "").toUpperCase() === diaFiltro);
    if (camionFiltro) {
      base = base.filter(r => (r.camion || "").toUpperCase() === camionFiltro.toUpperCase());
    }
    if (busqueda.length >= 2) {
      const q = busqueda.toLowerCase();
      base = base.filter(r => (r.nombre || "").toLowerCase().includes(q));
    }
    setResultados(base);
  }, [busqueda, rutas, diaFiltro, camionFiltro, step]);

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusqueda(cliente.nombre);
    setResultados([]);
    setStep("form");
    setEstadoSeleccionado(null);
    setFoto(null);
    setFotoPreview(null);
    setObservaciones("");
    setCantidadReal("");
    setMotivoNoRecibe("");
  };

  const handleFoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFoto(f);
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const calcularLitros = () => {
    if (!estadoSeleccionado || !clienteSeleccionado) return 0;
    if (estadoSeleccionado.id === 1) return clienteSeleccionado.litros || 0;
    if (estadoSeleccionado.cantidad && cantidadReal) return parseFloat(cantidadReal) || 0;
    return 0;
  };

  const calcularMotivo = () => {
    if (estadoSeleccionado?.motivo && motivoNoRecibe) return motivoNoRecibe;
    if (observaciones) return observaciones;
    return "";
  };

  const formularioValido = () => {
    if (!estadoSeleccionado) return false;
    if (estadoSeleccionado.foto && !foto) return false;
    if (estadoSeleccionado.cantidad && !cantidadReal) return false;
    if (estadoSeleccionado.motivo && !motivoNoRecibe.trim()) return false;
    return true;
  };

  const registrar = async () => {
    if (!clienteSeleccionado || !formularioValido()) return;
    setEnviando(true);

    const payload = {
      nombre: clienteSeleccionado.nombre,
      camion: clienteSeleccionado.camion,
      litros: calcularLitros(),
      estado: estadoSeleccionado.id,
      fecha: new Date().toISOString().split("T")[0],
      motivo: calcularMotivo(),
      latitud: gps?.lat || null,
      longitud: gps?.lng || null,
    };

    const entregaLocal = {
      ...payload,
      estado_label: estadoSeleccionado.label,
      estado_emoji: estadoSeleccionado.emoji,
      estado_color: estadoSeleccionado.color,
      hora: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    };

    try {
      const formData = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") formData.append(k, v);
      });
      if (foto) formData.append("foto", foto);

      const res = await fetch(`${API_URL}/registrar-entregas`, { method: "POST", body: formData });
      if (res.ok) {
        setEntregasHoy(prev => [entregaLocal, ...prev]);
        setStep("success");
      } else {
        throw new Error("Error servidor");
      }
    } catch {
      // Sin conexión → cola offline
      await guardarEnCola(payload);
      const colaActualizada = await obtenerCola();
      setColaOffline(colaActualizada);
      setEntregasHoy(prev => [{ ...entregaLocal, offline: true }, ...prev]);
      setStep("success");
    } finally {
      setEnviando(false);
    }
  };

  const resetForm = () => {
    setStep("buscar");
    setBusqueda("");
    setClienteSeleccionado(null);
    setEstadoSeleccionado(null);
    setFoto(null);
    setFotoPreview(null);
    setObservaciones("");
    setCantidadReal("");
    setMotivoNoRecibe("");
  };

  const camionesDisponibles = [...new Set(rutas.map(r => r.camion).filter(Boolean))].sort();

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <span style={s.logoIcon}>💧</span>
            <div>
              <div style={s.logoTitle}>AguaRuta</div>
              <div style={s.logoSub}>App Repartidor</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={s.gpsTag}>{gps ? "📍 GPS activo" : "📍 Sin GPS"}</div>
            {colaOffline.length > 0 && (
              <div style={s.offlineTag}>
                {sincronizando ? "⏳ Sincronizando..." : `📤 ${colaOffline.length} pendiente${colaOffline.length > 1 ? "s" : ""}`}
              </div>
            )}
          </div>
        </div>
        <div style={s.tabs}>
          <button style={{...s.tab, ...(tab === "registro" ? s.tabActive : {})}} onClick={() => setTab("registro")}>
            📦 Registrar
          </button>
          <button style={{...s.tab, ...(tab === "historial" ? s.tabActive : {})}} onClick={() => setTab("historial")}>
            📋 Hoy ({entregasHoy.length})
          </button>
        </div>
      </div>

      <div style={s.body}>
        {tab === "registro" && (
          <>
            <div style={s.filtros}>
              <select style={s.select} value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}>
                <option value="">Todos los días</option>
                {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select style={s.select} value={camionFiltro} onChange={e => setCamionFiltro(e.target.value)}>
                <option value="">Todos los camiones</option>
                {camionesDisponibles.map(c => <option key={c} value={c}>Camión {c}</option>)}
              </select>
            </div>

            {step !== "success" && (
              <div style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={s.cardTitle}>🔍 Clientes del día</div>
                  {resultados.length > 0 && (
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                      {resultados.length} cliente{resultados.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <input
                  style={s.input}
                  placeholder="Filtrar por nombre..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); if (step === "form") setStep("buscar"); }}
                  autoComplete="off"
                />
                {resultados.length > 0 && (
                  <div style={{ ...s.dropdown, maxHeight: 340, overflowY: "auto", marginTop: 8 }}>
                    {resultados.map((r, i) => (
                      <button key={i} style={s.dropItem} onClick={() => seleccionarCliente(r)}>
                        <div style={s.dropName}>{r.nombre}</div>
                        <div style={s.dropMeta}>
                          <span style={{...s.badge, background: "#dbeafe", color: "#1d4ed8"}}>🚚 {r.camion}</span>
                          <span style={{...s.badge, background: "#f3f4f6", color: "#374151"}}>📅 {r.dia}</span>
                          <span style={{...s.badge, background: "#d1fae5", color: "#065f46"}}>💧 {(r.litros || 0).toLocaleString()} L</span>
                          {r.telefono && <span style={{...s.badge, background: "#fce7f3", color: "#9d174d"}}>📞 {r.telefono}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {cargandoRutas && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#64748b", fontSize: 13 }}>
                    ⏳ Cargando clientes...
                  </div>
                )}
                {!cargandoRutas && resultados.length === 0 && diaFiltro && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 13 }}>
                    Sin clientes para los filtros seleccionados
                  </div>
                )}
                {!cargandoRutas && !diaFiltro && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 13 }}>
                    Selecciona un día para ver la lista
                  </div>
                )}
              </div>
            )}

            {step === "form" && clienteSeleccionado && (
              <>
                <div style={s.clienteCard}>
                  <div style={s.clienteNombre}>{clienteSeleccionado.nombre}</div>
                  <div style={s.clienteMeta}>
                    <span>🚚 Camión {clienteSeleccionado.camion}</span>
                    <span>📅 {clienteSeleccionado.dia}</span>
                    <span>💧 {(clienteSeleccionado.litros || 0).toLocaleString()} L asignados</span>
                    {clienteSeleccionado.telefono && <span>📞 {clienteSeleccionado.telefono}</span>}
                  </div>
                  {clienteSeleccionado.latitud && clienteSeleccionado.latitud !== 0 && (
                    <a href={`https://www.google.com/maps?q=${clienteSeleccionado.latitud},${clienteSeleccionado.longitud}`}
                      target="_blank" rel="noreferrer" style={s.mapaBtn}>📍 Ver en mapa</a>
                  )}
                </div>

                <div style={s.card}>
                  <div style={s.cardTitle}>📌 Estado de entrega</div>
                  <div style={s.estadoGrid}>
                    {ESTADOS.map(est => (
                      <button key={est.id}
                        style={{
                          ...s.estadoBtn,
                          background: estadoSeleccionado?.id === est.id ? est.bg : "#f9fafb",
                          border: `2px solid ${estadoSeleccionado?.id === est.id ? est.border : "#e5e7eb"}`,
                          color: estadoSeleccionado?.id === est.id ? est.color : "#374151",
                        }}
                        onClick={() => { setEstadoSeleccionado(est); setCantidadReal(""); setMotivoNoRecibe(""); }}
                      >
                        <span style={s.estadoEmoji}>{est.emoji}</span>
                        <span style={s.estadoLabel}>{est.label}</span>
                        {est.foto && <span style={s.estadoReq}>📷 foto requerida</span>}
                        {est.cantidad && <span style={s.estadoReq}>🔢 cantidad requerida</span>}
                        {est.motivo && <span style={s.estadoReq}>✏️ motivo requerido</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Foto obligatoria (estados 3 y 4) */}
                {estadoSeleccionado?.foto && (
                  <div style={{...s.card, border: "2px solid #fbbf24"}}>
                    <div style={s.cardTitle}>📷 Foto de evidencia <span style={{color:"#dc2626"}}>(obligatoria)</span></div>
                    <input type="file" accept="image/*" capture="environment" ref={fileRef} style={{display:"none"}} onChange={handleFoto} />
                    {!fotoPreview ? (
                      <button style={s.fotoBtn} onClick={() => fileRef.current.click()}>📸 Tomar foto</button>
                    ) : (
                      <div style={s.fotoPreviewWrap}>
                        <img src={fotoPreview} alt="preview" style={s.fotoPreview} />
                        <button style={s.fotoCambiar} onClick={() => fileRef.current.click()}>🔄 Cambiar</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Cantidad real (estados 5 y 6) */}
                {estadoSeleccionado?.cantidad && (
                  <div style={{...s.card, border: "2px solid #7dd3fc"}}>
                    <div style={s.cardTitle}>🔢 Litros reales entregados <span style={{color:"#dc2626"}}>(obligatorio)</span></div>
                    <div style={s.cantidadWrap}>
                      <div style={s.cantidadRef}>Asignados: {(clienteSeleccionado.litros || 0).toLocaleString()} L</div>
                      <input
                        style={s.inputNumero}
                        type="number"
                        placeholder="Ej: 800"
                        value={cantidadReal}
                        onChange={e => setCantidadReal(e.target.value)}
                        min="0"
                      />
                      <div style={s.cantidadUnidad}>litros</div>
                    </div>
                    {cantidadReal && (
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: parseFloat(cantidadReal) < (clienteSeleccionado.litros || 0) ? "#dc2626" : "#16a34a" }}>
                        {parseFloat(cantidadReal) < (clienteSeleccionado.litros || 0)
                          ? `⬇️ ${((clienteSeleccionado.litros || 0) - parseFloat(cantidadReal)).toLocaleString()} L menos de lo asignado`
                          : `⬆️ ${(parseFloat(cantidadReal) - (clienteSeleccionado.litros || 0)).toLocaleString()} L más de lo asignado`}
                      </div>
                    )}
                  </div>
                )}

                {/* Motivo rechazo (estado 8) */}
                {estadoSeleccionado?.motivo && (
                  <div style={{...s.card, border: "2px solid #fca5a5"}}>
                    <div style={s.cardTitle}>✏️ Motivo de rechazo <span style={{color:"#dc2626"}}>(obligatorio)</span></div>
                    <textarea
                      style={s.textarea}
                      placeholder="Ej: El vecino indica que ya tiene agua suficiente..."
                      value={motivoNoRecibe}
                      onChange={e => setMotivoNoRecibe(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                <div style={s.card}>
                  <div style={s.cardTitle}>📝 Observaciones (opcional)</div>
                  <textarea style={s.textarea} placeholder="Notas adicionales..." value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} />
                </div>

                <button
                  style={{ ...s.registrarBtn, opacity: (!formularioValido() || enviando) ? 0.5 : 1, cursor: (!formularioValido() || enviando) ? "not-allowed" : "pointer" }}
                  disabled={!formularioValido() || enviando}
                  onClick={registrar}
                >
                  {enviando ? "⏳ Registrando..." : "✅ Registrar entrega"}
                </button>

                {estadoSeleccionado && !formularioValido() && (
                  <div style={s.hintFaltante}>
                    {estadoSeleccionado.foto && !foto && "📷 Falta la foto de evidencia  "}
                    {estadoSeleccionado.cantidad && !cantidadReal && "🔢 Falta la cantidad real  "}
                    {estadoSeleccionado.motivo && !motivoNoRecibe.trim() && "✏️ Falta el motivo de rechazo"}
                  </div>
                )}
              </>
            )}

            {step === "success" && (
              <div style={s.successCard}>
                <div style={s.successIcon}>🎉</div>
                <div style={s.successTitle}>¡Entrega registrada!</div>
                <div style={s.successSub}>{clienteSeleccionado?.nombre}</div>
                <div style={s.successEstado}>{estadoSeleccionado?.emoji} {estadoSeleccionado?.label}</div>
                {entregasHoy[0]?.offline && (
                  <div style={s.offlineBadge}>📤 Guardado sin conexión — se enviará automáticamente</div>
                )}
                <button style={s.nuevaBtn} onClick={resetForm}>+ Nueva entrega</button>
              </div>
            )}
          </>
        )}

        {tab === "historial" && (
          <div>
            {entregasHoy.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>📦</div>
                <div style={s.emptyText}>Sin entregas registradas hoy</div>
              </div>
            ) : (
              entregasHoy.map((e, i) => (
                <div key={i} style={{...s.histItem, opacity: e.offline ? 0.7 : 1}}>
                  <div style={s.histHeader}>
                    <span style={{...s.histEstado, color: e.estado_color}}>{e.estado_emoji} {e.estado_label}</span>
                    <span style={s.histHora}>{e.hora} {e.offline ? "📤" : ""}</span>
                  </div>
                  <div style={s.histNombre}>{e.nombre}</div>
                  <div style={s.histMeta}>
                    🚚 {e.camion} · 💧 {(e.litros || 0).toLocaleString()} L
                    {e.motivo ? ` · 📝 ${e.motivo.slice(0, 30)}${e.motivo.length > 30 ? "..." : ""}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ ESTILOS ============
const s = {
  app: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f0f4ff", minHeight: "100vh", maxWidth: 480, margin: "0 auto" },
  header: { background: "linear-gradient(135deg, #0f4c81 0%, #1e6fa5 100%)", color: "#fff", paddingBottom: 0, boxShadow: "0 4px 20px rgba(15,76,129,0.3)" },
  headerInner: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 12px" },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { fontSize: 28 },
  logoTitle: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" },
  logoSub: { fontSize: 11, opacity: 0.75, marginTop: -2 },
  gpsTag: { fontSize: 11, background: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 20 },
  offlineTag: { fontSize: 11, background: "#f59e0b", color: "#fff", padding: "4px 10px", borderRadius: 20, fontWeight: 700 },
  tabs: { display: "flex", borderTop: "1px solid rgba(255,255,255,0.15)" },
  tab: { flex: 1, padding: "12px 0", border: "none", background: "transparent", color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600, cursor: "pointer", borderBottom: "3px solid transparent", transition: "all 0.2s" },
  tabActive: { color: "#fff", borderBottom: "3px solid #7dd3fc" },
  body: { padding: "16px 16px 80px" },
  filtros: { display: "flex", gap: 8, marginBottom: 12 },
  select: { flex: 1, padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, background: "#fff", color: "#1e293b", outline: "none", fontFamily: "inherit" },
  card: { background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { width: "100%", padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a" },
  dropdown: { marginTop: 8, border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff" },
  dropItem: { width: "100%", padding: "12px 14px", border: "none", borderBottom: "1px solid #f1f5f9", background: "#fff", textAlign: "left", cursor: "pointer", display: "block" },
  dropName: { fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 5 },
  dropMeta: { display: "flex", flexWrap: "wrap", gap: 4 },
  badge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6 },
  clienteCard: { background: "linear-gradient(135deg, #0f4c81, #1e6fa5)", color: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 4px 16px rgba(15,76,129,0.25)" },
  clienteNombre: { fontSize: 17, fontWeight: 700, marginBottom: 8 },
  clienteMeta: { display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, opacity: 0.85, marginBottom: 8 },
  mapaBtn: { display: "inline-block", marginTop: 4, padding: "6px 14px", background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none" },
  estadoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  estadoBtn: { padding: "12px 8px", borderRadius: 12, border: "2px solid", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.15s", fontFamily: "inherit" },
  estadoEmoji: { fontSize: 22 },
  estadoLabel: { fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.2 },
  estadoReq: { fontSize: 9, opacity: 0.7, textAlign: "center" },
  fotoBtn: { width: "100%", padding: "14px", border: "2px dashed #cbd5e1", borderRadius: 10, background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  fotoPreviewWrap: { position: "relative" },
  fotoPreview: { width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover" },
  fotoCambiar: { position: "absolute", bottom: 8, right: 8, padding: "6px 12px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer" },
  cantidadWrap: { display: "flex", alignItems: "center", gap: 8 },
  cantidadRef: { fontSize: 12, color: "#64748b", whiteSpace: "nowrap" },
  inputNumero: { flex: 1, padding: "12px 14px", border: "1.5px solid #7dd3fc", borderRadius: 10, fontSize: 18, fontWeight: 700, outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a", textAlign: "center" },
  cantidadUnidad: { fontSize: 13, color: "#64748b", fontWeight: 600 },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a" },
  registrarBtn: { width: "100%", padding: "16px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(22,163,74,0.35)", marginBottom: 8 },
  hintFaltante: { textAlign: "center", fontSize: 12, color: "#dc2626", padding: "8px", background: "#fee2e2", borderRadius: 8, marginBottom: 12 },
  successCard: { background: "#fff", borderRadius: 16, padding: "40px 24px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  successIcon: { fontSize: 56, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  successSub: { fontSize: 15, color: "#64748b", marginBottom: 10 },
  successEstado: { fontSize: 16, fontWeight: 600, color: "#16a34a", marginBottom: 16 },
  offlineBadge: { fontSize: 12, color: "#92400e", background: "#fef3c7", padding: "8px 16px", borderRadius: 8, marginBottom: 16 },
  nuevaBtn: { padding: "14px 32px", background: "#0f4c81", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  emptyState: { textAlign: "center", padding: "60px 0" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#94a3b8", fontSize: 15 },
  histItem: { background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  histHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  histEstado: { fontSize: 13, fontWeight: 700 },
  histHora: { fontSize: 12, color: "#94a3b8" },
  histNombre: { fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 4 },
  histMeta: { fontSize: 12, color: "#64748b" },
};
