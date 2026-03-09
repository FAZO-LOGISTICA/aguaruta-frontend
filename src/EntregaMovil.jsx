import { useState, useEffect, useRef } from "react";

const API_URL = "https://aguaruta-backend.onrender.com";

const ESTADOS = [
  { id: 1, label: "Entregado", emoji: "✅", color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  { id: 2, label: "No hay moradores", emoji: "🚪", color: "#d97706", bg: "#fef3c7", border: "#fcd34d", foto: true },
  { id: 3, label: "Dirección no existe", emoji: "❌", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", foto: false },
  { id: 4, label: "Camino malo", emoji: "🚧", color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd", foto: true },
];

const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"];
const HOY = DIAS[new Date().getDay() - 1] || "LUNES";

export default function EntregaMovil() {
  const [step, setStep] = useState("buscar"); // buscar | form | success
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(null);
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [observaciones, setObservaciones] = useState("");
  const [gps, setGps] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [entregasHoy, setEntregasHoy] = useState([]);
  const [tab, setTab] = useState("registro"); // registro | historial
  const [diaFiltro, setDiaFiltro] = useState(HOY);
  const [camionFiltro, setCamionFiltro] = useState("");
  const [rutas, setRutas] = useState([]);
  const fileRef = useRef();

  // Cargar rutas
  useEffect(() => {
    fetch(`${API_URL}/rutas-activas`)
      .then(r => r.json())
      .then(data => setRutas(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // GPS al montar
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // Buscar cliente
  useEffect(() => {
    if (busqueda.length < 2) { setResultados([]); return; }
    const q = busqueda.toLowerCase();
    const filtrados = rutas.filter(r =>
      (r.nombre || "").toLowerCase().includes(q) &&
      (!diaFiltro || (r.dia || "").toUpperCase() === diaFiltro) &&
      (!camionFiltro || (r.camion || "").toUpperCase() === camionFiltro.toUpperCase())
    ).slice(0, 8);
    setResultados(filtrados);
  }, [busqueda, rutas, diaFiltro, camionFiltro]);

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusqueda(cliente.nombre);
    setResultados([]);
    setStep("form");
    setEstadoSeleccionado(null);
    setFoto(null);
    setFotoPreview(null);
    setObservaciones("");
  };

  const handleFoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFoto(f);
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const registrar = async () => {
    if (!clienteSeleccionado || !estadoSeleccionado) return;
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("nombre", clienteSeleccionado.nombre);
      formData.append("camion", clienteSeleccionado.camion);
      formData.append("litros", estadoSeleccionado.id === 1 ? (clienteSeleccionado.litros || 0) : 0);
      formData.append("estado", estadoSeleccionado.id);
      formData.append("fecha", new Date().toISOString().split("T")[0]);
      if (observaciones) formData.append("motivo", observaciones);
      if (gps) {
        formData.append("latitud", gps.lat);
        formData.append("longitud", gps.lng);
      }
      if (foto) formData.append("foto", foto);

      const res = await fetch(`${API_URL}/registrar-entregas`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setEntregasHoy(prev => [{
          ...data.entrega,
          nombre: clienteSeleccionado.nombre,
          camion: clienteSeleccionado.camion,
          estado_label: estadoSeleccionado.label,
          estado_emoji: estadoSeleccionado.emoji,
          estado_color: estadoSeleccionado.color,
          hora: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
        }, ...prev]);
        setStep("success");
      }
    } catch (e) {
      alert("Error al registrar. Verifica tu conexión.");
    } finally {
      setEnviando(false);
    }
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
          <div style={s.gpsTag}>
            {gps ? "📍 GPS activo" : "📍 Sin GPS"}
          </div>
        </div>

        {/* Tabs */}
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
        {/* ===== TAB REGISTRO ===== */}
        {tab === "registro" && (
          <>
            {/* Filtros */}
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

            {/* STEP: BUSCAR */}
            {step !== "success" && (
              <div style={s.card}>
                <div style={s.cardTitle}>🔍 Buscar cliente</div>
                <input
                  style={s.input}
                  placeholder="Nombre del cliente..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); if (step === "form") setStep("buscar"); }}
                  autoComplete="off"
                />
                {resultados.length > 0 && (
                  <div style={s.dropdown}>
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
              </div>
            )}

            {/* STEP: FORM */}
            {step === "form" && clienteSeleccionado && (
              <>
                {/* Info cliente */}
                <div style={s.clienteCard}>
                  <div style={s.clienteNombre}>{clienteSeleccionado.nombre}</div>
                  <div style={s.clienteMeta}>
                    <span>🚚 Camión {clienteSeleccionado.camion}</span>
                    <span>📅 {clienteSeleccionado.dia}</span>
                    <span>💧 {(clienteSeleccionado.litros || 0).toLocaleString()} L</span>
                    {clienteSeleccionado.telefono && <span>📞 {clienteSeleccionado.telefono}</span>}
                  </div>
                  {clienteSeleccionado.latitud && clienteSeleccionado.latitud !== 0 && (
                    <a
                      href={`https://www.google.com/maps?q=${clienteSeleccionado.latitud},${clienteSeleccionado.longitud}`}
                      target="_blank" rel="noreferrer"
                      style={s.mapaBtn}
                    >
                      📍 Ver en mapa
                    </a>
                  )}
                </div>

                {/* Estado */}
                <div style={s.card}>
                  <div style={s.cardTitle}>📌 Estado de entrega</div>
                  <div style={s.estadoGrid}>
                    {ESTADOS.map(est => (
                      <button
                        key={est.id}
                        style={{
                          ...s.estadoBtn,
                          background: estadoSeleccionado?.id === est.id ? est.bg : "#f9fafb",
                          border: `2px solid ${estadoSeleccionado?.id === est.id ? est.border : "#e5e7eb"}`,
                          color: estadoSeleccionado?.id === est.id ? est.color : "#374151",
                        }}
                        onClick={() => setEstadoSeleccionado(est)}
                      >
                        <span style={s.estadoEmoji}>{est.emoji}</span>
                        <span style={s.estadoLabel}>{est.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Foto */}
                {estadoSeleccionado && (estadoSeleccionado.foto || estadoSeleccionado.id === 1) && (
                  <div style={s.card}>
                    <div style={s.cardTitle}>
                      📷 Foto de evidencia {estadoSeleccionado.foto ? "(recomendada)" : "(opcional)"}
                    </div>
                    <input type="file" accept="image/*" capture="environment" ref={fileRef} style={{display:"none"}} onChange={handleFoto} />
                    {!fotoPreview ? (
                      <button style={s.fotoBtn} onClick={() => fileRef.current.click()}>
                        📸 Tomar foto
                      </button>
                    ) : (
                      <div style={s.fotoPreviewWrap}>
                        <img src={fotoPreview} alt="preview" style={s.fotoPreview} />
                        <button style={s.fotoCambiar} onClick={() => fileRef.current.click()}>🔄 Cambiar</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Observaciones */}
                <div style={s.card}>
                  <div style={s.cardTitle}>📝 Observaciones (opcional)</div>
                  <textarea
                    style={s.textarea}
                    placeholder="Notas adicionales..."
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Botón registrar */}
                <button
                  style={{
                    ...s.registrarBtn,
                    opacity: (!estadoSeleccionado || enviando) ? 0.5 : 1,
                    cursor: (!estadoSeleccionado || enviando) ? "not-allowed" : "pointer",
                  }}
                  disabled={!estadoSeleccionado || enviando}
                  onClick={registrar}
                >
                  {enviando ? "⏳ Registrando..." : "✅ Registrar entrega"}
                </button>
              </>
            )}

            {/* STEP: SUCCESS */}
            {step === "success" && (
              <div style={s.successCard}>
                <div style={s.successIcon}>🎉</div>
                <div style={s.successTitle}>¡Entrega registrada!</div>
                <div style={s.successSub}>{clienteSeleccionado?.nombre}</div>
                <div style={s.successEstado}>
                  {estadoSeleccionado?.emoji} {estadoSeleccionado?.label}
                </div>
                <button style={s.nuevaBtn} onClick={() => {
                  setStep("buscar");
                  setBusqueda("");
                  setClienteSeleccionado(null);
                  setEstadoSeleccionado(null);
                  setFoto(null);
                  setFotoPreview(null);
                  setObservaciones("");
                }}>
                  + Nueva entrega
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== TAB HISTORIAL ===== */}
        {tab === "historial" && (
          <div>
            {entregasHoy.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>📦</div>
                <div style={s.emptyText}>Sin entregas registradas hoy</div>
              </div>
            ) : (
              entregasHoy.map((e, i) => (
                <div key={i} style={s.histItem}>
                  <div style={s.histHeader}>
                    <span style={{...s.histEstado, color: e.estado_color}}>{e.estado_emoji} {e.estado_label}</span>
                    <span style={s.histHora}>{e.hora}</span>
                  </div>
                  <div style={s.histNombre}>{e.nombre}</div>
                  <div style={s.histMeta}>
                    🚚 {e.camion} · 💧 {(e.litros || 0).toLocaleString()} L
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
  app: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: "#f0f4ff",
    minHeight: "100vh",
    maxWidth: 480,
    margin: "0 auto",
  },
  header: {
    background: "linear-gradient(135deg, #0f4c81 0%, #1e6fa5 100%)",
    color: "#fff",
    paddingBottom: 0,
    boxShadow: "0 4px 20px rgba(15,76,129,0.3)",
  },
  headerInner: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px 12px",
  },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { fontSize: 28 },
  logoTitle: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px" },
  logoSub: { fontSize: 11, opacity: 0.75, marginTop: -2 },
  gpsTag: { fontSize: 11, background: "rgba(255,255,255,0.18)", padding: "4px 10px", borderRadius: 20 },
  tabs: { display: "flex", borderTop: "1px solid rgba(255,255,255,0.15)" },
  tab: {
    flex: 1, padding: "12px 0", border: "none", background: "transparent",
    color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600, cursor: "pointer",
    borderBottom: "3px solid transparent", transition: "all 0.2s",
  },
  tabActive: { color: "#fff", borderBottom: "3px solid #7dd3fc" },
  body: { padding: "16px 16px 80px" },
  filtros: { display: "flex", gap: 8, marginBottom: 12 },
  select: {
    flex: 1, padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10,
    fontSize: 13, background: "#fff", color: "#1e293b", outline: "none", fontFamily: "inherit",
  },
  card: {
    background: "#fff", borderRadius: 14, padding: "16px", marginBottom: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" },
  input: {
    width: "100%", padding: "12px 14px", border: "1.5px solid #e2e8f0",
    borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", color: "#0f172a",
  },
  dropdown: {
    marginTop: 8, border: "1.5px solid #e2e8f0", borderRadius: 10,
    overflow: "hidden", background: "#fff",
  },
  dropItem: {
    width: "100%", padding: "12px 14px", border: "none", borderBottom: "1px solid #f1f5f9",
    background: "#fff", textAlign: "left", cursor: "pointer", display: "block",
  },
  dropName: { fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 5 },
  dropMeta: { display: "flex", flexWrap: "wrap", gap: 4 },
  badge: {
    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
  },
  clienteCard: {
    background: "linear-gradient(135deg, #0f4c81, #1e6fa5)",
    color: "#fff", borderRadius: 14, padding: 16, marginBottom: 12,
    boxShadow: "0 4px 16px rgba(15,76,129,0.25)",
  },
  clienteNombre: { fontSize: 17, fontWeight: 700, marginBottom: 8 },
  clienteMeta: { display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, opacity: 0.85, marginBottom: 8 },
  mapaBtn: {
    display: "inline-block", marginTop: 4, padding: "6px 14px",
    background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: 8,
    fontSize: 12, fontWeight: 600, textDecoration: "none",
  },
  estadoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  estadoBtn: {
    padding: "14px 8px", borderRadius: 12, border: "2px solid",
    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    transition: "all 0.15s", fontFamily: "inherit",
  },
  estadoEmoji: { fontSize: 24 },
  estadoLabel: { fontSize: 11, fontWeight: 600, textAlign: "center", lineHeight: 1.2 },
  fotoBtn: {
    width: "100%", padding: "14px", border: "2px dashed #cbd5e1", borderRadius: 10,
    background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit",
  },
  fotoPreviewWrap: { position: "relative" },
  fotoPreview: { width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover" },
  fotoCambiar: {
    position: "absolute", bottom: 8, right: 8, padding: "6px 12px",
    background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 8,
    fontSize: 12, cursor: "pointer",
  },
  textarea: {
    width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10,
    fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box",
    fontFamily: "inherit", color: "#0f172a",
  },
  registrarBtn: {
    width: "100%", padding: "16px", background: "linear-gradient(135deg, #16a34a, #15803d)",
    color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(22,163,74,0.35)",
  },
  successCard: {
    background: "#fff", borderRadius: 16, padding: "40px 24px",
    textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  successIcon: { fontSize: 56, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  successSub: { fontSize: 15, color: "#64748b", marginBottom: 10 },
  successEstado: { fontSize: 16, fontWeight: 600, color: "#16a34a", marginBottom: 24 },
  nuevaBtn: {
    padding: "14px 32px", background: "#0f4c81", color: "#fff",
    border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit",
  },
  emptyState: { textAlign: "center", padding: "60px 0" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#94a3b8", fontSize: 15 },
  histItem: {
    background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  histHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  histEstado: { fontSize: 13, fontWeight: 700 },
  histHora: { fontSize: 12, color: "#94a3b8" },
  histNombre: { fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 4 },
  histMeta: { fontSize: 12, color: "#64748b" },
};
