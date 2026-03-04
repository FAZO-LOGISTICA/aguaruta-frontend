// src/RegistrarEntrega.js
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_URL from "./config";
import {
  FaTruck, FaUser, FaTint, FaCalendarAlt, FaCamera,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
  FaRoad, FaFilter, FaUpload, FaTimes
} from "react-icons/fa";

// ─── ESTADOS OFICIALES ─────────────────────────────────────────
const ESTADOS = [
  { valor: 1, label: "Entregado", color: "from-emerald-500 to-green-600", textColor: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300", Icon: FaCheckCircle, requiereFoto: false },
  { valor: 2, label: "No entregado — Sin moradores", color: "from-amber-400 to-orange-500", textColor: "text-amber-700", bg: "bg-amber-50 border-amber-300", Icon: FaExclamationTriangle, requiereFoto: true },
  { valor: 3, label: "No entregado — Dirección no existe", color: "from-slate-400 to-gray-500", textColor: "text-slate-700", bg: "bg-slate-50 border-slate-300", Icon: FaTimesCircle, requiereFoto: false },
  { valor: 4, label: "No entregado — Camino inhabitable", color: "from-red-500 to-rose-600", textColor: "text-red-700", bg: "bg-red-50 border-red-300", Icon: FaRoad, requiereFoto: true },
];

const CAMIONES = ["A1", "A2", "A3", "A4", "A5", "M1", "M2", "M3"];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ─── UTILIDADES ─────────────────────────────────────────────────
const normalizar = (s) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────
export default function RegistrarEntrega() {
  const [puntos, setPuntos] = useState([]);
  const [cargandoPuntos, setCargandoPuntos] = useState(true);

  // Filtros de búsqueda
  const [filtroCamion, setFiltroCamion] = useState("");
  const [filtroDia, setFiltroDia] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");

  // Formulario
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);
  const [litros, setLitros] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [estadoSeleccionado, setEstadoSeleccionado] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);

  // UI
  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState(1); // 1=filtrar/seleccionar, 2=detalles, 3=éxito
  const fileRef = useRef();

  // ── Cargar rutas activas ──────────────────────────────────────
  useEffect(() => {
    axios.get(`${API_URL}/rutas-activas`)
      .then(res => setPuntos(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMensaje({ tipo: "error", texto: "No se pudieron cargar los beneficiarios." }))
      .finally(() => setCargandoPuntos(false));
  }, []);

  // ── Puntos filtrados ──────────────────────────────────────────
  const puntosFiltrados = puntos.filter(p => {
    const okCamion = !filtroCamion || normalizar(p.camion).includes(normalizar(filtroCamion));
    const okDia = !filtroDia || normalizar(p.dia).includes(normalizar(filtroDia));
    const okNombre = !filtroNombre || normalizar(p.nombre).includes(normalizar(filtroNombre));
    return okCamion && okDia && okNombre;
  });

  // ── Seleccionar beneficiario ──────────────────────────────────
  const seleccionarPunto = (p) => {
    setPuntoSeleccionado(p);
    setLitros(String(p.litros ?? ""));
    setEstadoSeleccionado(null);
    setMotivo("");
    setFoto(null);
    setFotoPreview(null);
    setMensaje({ tipo: "", texto: "" });
    setPaso(2);
  };

  // ── Manejo de foto ────────────────────────────────────────────
  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const quitarFoto = () => {
    setFoto(null);
    setFotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Enviar registro ───────────────────────────────────────────
  const registrar = async () => {
    setMensaje({ tipo: "", texto: "" });

    if (!puntoSeleccionado) return;
    if (!estadoSeleccionado) { setMensaje({ tipo: "warn", texto: "Selecciona el estado de la entrega." }); return; }
    if (estadoSeleccionado.valor === 1 && (!litros || Number(litros) <= 0)) {
      setMensaje({ tipo: "warn", texto: "Ingresa los litros entregados." }); return;
    }
    if (estadoSeleccionado.requiereFoto && !foto) {
      setMensaje({ tipo: "warn", texto: `Este estado requiere foto como respaldo.` }); return;
    }
    if (puntoSeleccionado.latitud == null || puntoSeleccionado.longitud == null) {
      setMensaje({ tipo: "warn", texto: "Este beneficiario no tiene coordenadas. Edítalo en Rutas Activas." }); return;
    }

    try {
      setCargando(true);

      const formData = new FormData();
      formData.append("nombre", puntoSeleccionado.nombre);
      formData.append("camion", puntoSeleccionado.camion);
      formData.append("litros", estadoSeleccionado.valor === 1 ? Number(litros) : 0);
      formData.append("estado", estadoSeleccionado.valor);
      formData.append("fecha", fecha);
      formData.append("latitud", puntoSeleccionado.latitud);
      formData.append("longitud", puntoSeleccionado.longitud);
      if (motivo) formData.append("motivo", motivo);
      if (foto) formData.append("foto", foto);

      await axios.post(`${API_URL}/registrar-entregas`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setPaso(3);
    } catch (err) {
      const det = err?.response?.data?.detail || err?.response?.data?.error || err.message || "Error al registrar.";
      setMensaje({ tipo: "error", texto: det });
    } finally {
      setCargando(false);
    }
  };

  // ── Reset para nueva entrega ──────────────────────────────────
  const nuevaEntrega = () => {
    setPuntoSeleccionado(null);
    setEstadoSeleccionado(null);
    setLitros("");
    setMotivo("");
    setFoto(null);
    setFotoPreview(null);
    setMensaje({ tipo: "", texto: "" });
    setPaso(1);
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-6 py-3 mb-4">
            <FaTruck className="text-cyan-400 text-xl" />
            <span className="text-white font-bold text-lg tracking-wide">AguaRuta</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Registrar Entrega</h1>
          <p className="text-blue-300 text-sm">Registra el resultado de cada visita en terreno</p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { n: 1, label: "Seleccionar" },
            { n: 2, label: "Registrar" },
            { n: 3, label: "Listo" }
          ].map(({ n, label }, i) => (
            <React.Fragment key={n}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                paso === n ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30" :
                paso > n ? "bg-emerald-500/80 text-white" : "bg-white/10 text-white/40"
              }`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white/20 text-xs">{n}</span>
                {label}
              </div>
              {i < 2 && <div className={`h-px w-8 ${paso > n ? "bg-emerald-400" : "bg-white/20"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* ══════════ PASO 1: Seleccionar beneficiario ══════════ */}
        {paso === 1 && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-white font-bold text-xl mb-5 flex items-center gap-2">
              <FaFilter className="text-cyan-400" /> Filtrar beneficiarios
            </h2>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-blue-300 text-xs font-semibold mb-1 block">Camión</label>
                <select
                  value={filtroCamion}
                  onChange={e => setFiltroCamion(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Todos</option>
                  {CAMIONES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-blue-300 text-xs font-semibold mb-1 block">Día</label>
                <select
                  value={filtroDia}
                  onChange={e => setFiltroDia(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">Todos</option>
                  {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-blue-300 text-xs font-semibold mb-1 block">Buscar nombre</label>
                <input
                  type="text"
                  value={filtroNombre}
                  onChange={e => setFiltroNombre(e.target.value)}
                  placeholder="Ej: Rosa..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Lista de beneficiarios */}
            {cargandoPuntos ? (
              <div className="text-center py-12 text-blue-300">Cargando beneficiarios...</div>
            ) : puntosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-white/40">Sin resultados con esos filtros</div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-2xl border border-white/10 divide-y divide-white/10">
                {puntosFiltrados.map((p, i) => (
                  <button
                    key={p.id ?? i}
                    onClick={() => seleccionarPunto(p)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/10 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <FaUser className="text-blue-300 text-sm" />
                      </div>
                      <div>
                        <div className="text-white font-semibold group-hover:text-cyan-300 transition-colors">{p.nombre || "—"}</div>
                        <div className="text-blue-400 text-xs flex gap-3 mt-0.5">
                          {p.dia && <span>📅 {p.dia}</span>}
                          {p.telefono && <span>📞 {p.telefono}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.litros && (
                        <span className="flex items-center gap-1 text-cyan-400 text-sm font-bold">
                          <FaTint className="text-xs" />{p.litros}L
                        </span>
                      )}
                      <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full">
                        {p.camion || "—"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 text-blue-400 text-xs text-right">
              {puntosFiltrados.length} beneficiario{puntosFiltrados.length !== 1 ? "s" : ""}
              {(filtroCamion || filtroDia || filtroNombre) ? " (filtrado)" : " en total"}
            </div>
          </div>
        )}

        {/* ══════════ PASO 2: Detalles del registro ══════════ */}
        {paso === 2 && puntoSeleccionado && (
          <div className="space-y-5">

            {/* Card beneficiario seleccionado */}
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <FaUser className="text-blue-300" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{puntoSeleccionado.nombre}</div>
                  <div className="text-blue-300 text-sm flex gap-3">
                    <span>🚛 {puntoSeleccionado.camion}</span>
                    {puntoSeleccionado.dia && <span>📅 {puntoSeleccionado.dia}</span>}
                    {puntoSeleccionado.telefono && <span>📞 {puntoSeleccionado.telefono}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={nuevaEntrega}
                className="text-white/40 hover:text-white transition-colors text-sm underline"
              >
                Cambiar
              </button>
            </div>

            {/* Fecha */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5">
              <label className="text-blue-300 text-xs font-semibold mb-2 flex items-center gap-2">
                <FaCalendarAlt /> Fecha de la entrega
              </label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400 text-lg"
              />
            </div>

            {/* Estado */}
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5">
              <label className="text-blue-300 text-xs font-semibold mb-3 block">¿Resultado de la visita?</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ESTADOS.map(est => {
                  const Ico = est.Icon;
                  const activo = estadoSeleccionado?.valor === est.valor;
                  return (
                    <button
                      key={est.valor}
                      onClick={() => setEstadoSeleccionado(est)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        activo
                          ? `bg-gradient-to-r ${est.color} border-transparent text-white shadow-lg scale-[1.02]`
                          : "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                      }`}
                    >
                      <Ico className={`text-xl ${activo ? "text-white" : "text-white/40"}`} />
                      <div>
                        <div className="font-semibold text-sm">{est.label}</div>
                        {est.requiereFoto && (
                          <div className={`text-xs mt-0.5 ${activo ? "text-white/80" : "text-white/30"}`}>
                            Requiere foto
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Litros (solo si estado 1) */}
            {estadoSeleccionado?.valor === 1 && (
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5">
                <label className="text-blue-300 text-xs font-semibold mb-2 flex items-center gap-2">
                  <FaTint /> Litros entregados
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={litros}
                  onChange={e => setLitros(e.target.value)}
                  placeholder={puntoSeleccionado.litros ? `Asignados: ${puntoSeleccionado.litros}L` : "Ej: 200"}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-2xl font-bold placeholder-white/20 focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {/* Motivo (estados 2, 3, 4) */}
            {estadoSeleccionado && estadoSeleccionado.valor !== 1 && (
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5">
                <label className="text-blue-300 text-xs font-semibold mb-2 block">Observaciones (opcional)</label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                  placeholder="Ej: Nadie abrió la puerta, portón cerrado..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>
            )}

            {/* Foto */}
            {estadoSeleccionado && (
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-5">
                <label className="text-blue-300 text-xs font-semibold mb-3 flex items-center gap-2">
                  <FaCamera />
                  Foto{estadoSeleccionado.requiereFoto ? " (obligatoria para este estado)" : " (opcional)"}
                </label>

                {fotoPreview ? (
                  <div className="relative inline-block">
                    <img src={fotoPreview} alt="Preview" className="w-full max-w-xs rounded-xl border border-white/20" />
                    <button
                      onClick={quitarFoto}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg hover:bg-red-600"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-3 border-2 border-dashed border-white/30 rounded-xl px-6 py-5 text-white/60 hover:text-white hover:border-white/60 transition-all w-full md:w-auto"
                  >
                    <FaUpload className="text-xl" />
                    <span>Subir foto desde cámara o galería</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFoto}
                  className="hidden"
                />
              </div>
            )}

            {/* Mensaje */}
            {mensaje.texto && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                mensaje.tipo === "error" ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                mensaje.tipo === "warn" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}>
                {mensaje.texto}
              </div>
            )}

            {/* Botón registrar */}
            <button
              onClick={registrar}
              disabled={cargando || !estadoSeleccionado}
              className={`w-full py-4 rounded-2xl font-black text-lg tracking-wide transition-all shadow-xl ${
                cargando || !estadoSeleccionado
                  ? "bg-white/10 text-white/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {cargando ? "Registrando..." : "Confirmar Registro"}
            </button>
          </div>
        )}

        {/* ══════════ PASO 3: Éxito ══════════ */}
        {paso === 3 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 border-2 border-emerald-400/50">
              <FaCheckCircle className="text-5xl text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-3">¡Registrado!</h2>
            <p className="text-blue-300 mb-2 text-lg font-semibold">{puntoSeleccionado?.nombre}</p>
            <p className="text-white/50 text-sm mb-10">
              {estadoSeleccionado?.label} · {fecha}
              {estadoSeleccionado?.valor === 1 && litros ? ` · ${litros}L` : ""}
            </p>
            <button
              onClick={nuevaEntrega}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold px-10 py-4 rounded-2xl text-lg shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              Registrar otra entrega
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
