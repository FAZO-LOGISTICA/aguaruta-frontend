// src/CierreMes.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import API_URL from "./config";

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const hoy = new Date();
const AÑO_HOY = hoy.getFullYear();
const MES_HOY = hoy.getMonth() + 1;

function fmtMoney(n) { return `$${Number(n || 0).toLocaleString("es-CL")}`; }
function fmtFecha(str) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("es-CL", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default function CierreMes() {
  const [anio, setAnio]         = useState(AÑO_HOY);
  const [mes, setMes]           = useState(MES_HOY);
  const [informe, setInforme]   = useState(null);
  const [cierres, setCierres]   = useState([]);
  const [cargando, setCargando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError]       = useState("");
  const [confirmCierre, setConfirmCierre] = useState(false);
  const [confirmReabrir, setConfirmReabrir] = useState(false);

  useEffect(() => { cargarCierres(); }, []);
  useEffect(() => { cargarInforme(); }, [anio, mes]);

  const cargarCierres = async () => {
    try {
      const res = await axios.get(`${API_URL}/cierres-mes`);
      setCierres(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const cargarInforme = async () => {
    try {
      setCargando(true); setError("");
      const res = await axios.get(`${API_URL}/cierres-mes/informe`, { params: { anio, mes } });
      setInforme(res.data);
    } catch (e) {
      setError("No se pudo cargar el informe.");
    } finally {
      setCargando(false);
    }
  };

  const cerrarMes = async () => {
    try {
      await axios.post(`${API_URL}/cierres-mes`, null, { params: { anio, mes } });
      setConfirmCierre(false);
      cargarInforme();
      cargarCierres();
    } catch (e) {
      alert(e.response?.data?.detail || "Error al cerrar el mes");
    }
  };

  const reabrirMes = async () => {
    try {
      await axios.post(`${API_URL}/cierres-mes/reabrir`, null, { params: { anio, mes } });
      setConfirmReabrir(false);
      cargarInforme();
      cargarCierres();
    } catch (e) {
      alert(e.response?.data?.detail || "Error al reabrir el mes");
    }
  };

  // ── GENERAR PDF ──
  const generarPDF = () => {
    if (!informe) return;
    setGenerando(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const nombreMes = `${MESES[mes]} ${anio}`;
      const r = informe.resumen;
      const morosos = informe.morosos || [];
      const pagados = informe.pagados || [];

      // ── Encabezado ──
      doc.setFillColor(15, 76, 129);
      doc.rect(0, 0, 210, 36, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20); doc.setFont("helvetica","bold");
      doc.text("AguaRuta — Informe de Cierre Mensual", 14, 14);
      doc.setFontSize(13); doc.setFont("helvetica","normal");
      doc.text(`Período: ${nombreMes}`, 14, 22);
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleDateString("es-CL", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })}`, 14, 29);
      if (informe.cerrado) {
        doc.setFillColor(220, 252, 231);
        doc.setTextColor(22, 101, 52);
        doc.roundedRect(148, 8, 52, 12, 3, 3, "F");
        doc.setFontSize(9); doc.setFont("helvetica","bold");
        doc.text("✓ MES CERRADO", 150, 16);
      }

      // ── Resumen ejecutivo ──
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13); doc.setFont("helvetica","bold");
      doc.text("1. Resumen Ejecutivo", 14, 46);
      doc.setDrawColor(200,200,200); doc.line(14, 48, 196, 48);

      const kpis = [
        ["Total familias",    String(r.total_familias)],
        ["Familias pagadas",  String(r.total_pagados)],
        ["Familias morosas",  String(r.total_morosos)],
        ["Precio unitario",   fmtMoney(informe.precio_unitario)],
        ["Total cobrado",     fmtMoney(r.total_cobrado)],
        ["Total pagado",      fmtMoney(r.total_pagado)],
        ["Total deuda",       fmtMoney(r.total_deuda)],
      ];

      doc.autoTable({
        startY: 51,
        head: [["Indicador","Valor"]],
        body: kpis,
        styles: { fontSize: 11 },
        headStyles: { fillColor: [15, 76, 129] },
        columnStyles: { 1: { fontStyle: "bold", halign: "right" } },
        margin: { left: 14, right: 14 },
      });

      // ── Morosos ──
      let y = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(13); doc.setFont("helvetica","bold");
      doc.setTextColor(153, 27, 27);
      doc.text(`2. Listado Morosos (${morosos.length}) — Para Uso Jurídico`, 14, y);
      doc.setDrawColor(220, 38, 38); doc.line(14, y + 2, 196, y + 2);
      doc.setTextColor(0,0,0);

      if (morosos.length === 0) {
        doc.setFont("helvetica","normal"); doc.setFontSize(11);
        doc.text("✅ Sin morosos en este período.", 14, y + 10);
        y += 16;
      } else {
        const bodyMorosos = morosos.map(f => {
          const residentes = f.residentes?.map(r => r.nombre + (r.rut ? ` (${r.rut})` : "")).join(", ") || "—";
          const coords = f.latitud && f.longitud
            ? `${Number(f.latitud).toFixed(6)}, ${Number(f.longitud).toFixed(6)}`
            : "Sin coordenadas";
          return [
            f.nombre,
            f.camion,
            residentes,
            fmtMoney(f.deuda_mes),
            fmtMoney(f.deuda_acumulada || 0),
            fmtMoney(f.deuda_total),
            coords,
          ];
        });

        doc.autoTable({
          startY: y + 5,
          head: [["Jefe de Hogar","Camión","Residentes (RUT)","Deuda Mes","Deuda Acum.","Deuda Total","Georref."]],
          body: bodyMorosos,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [153, 27, 27], fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 35 },
            2: { cellWidth: 45 },
            6: { cellWidth: 32, fontSize: 7 },
          },
          margin: { left: 14, right: 14 },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 5) {
              data.cell.styles.textColor = [153, 27, 27];
              data.cell.styles.fontStyle = "bold";
            }
          }
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── Pagados ──
      // Nueva página si no hay espacio
      if (y > 240) { doc.addPage(); y = 14; }
      doc.setFontSize(13); doc.setFont("helvetica","bold");
      doc.setTextColor(22, 101, 52);
      doc.text(`3. Familias al Día (${pagados.length})`, 14, y);
      doc.setDrawColor(22, 163, 74); doc.line(14, y + 2, 196, y + 2);
      doc.setTextColor(0,0,0);

      const bodyPagados = pagados.map(f => [
        f.nombre, f.camion, String(f.personas), String(f.entregas_mes),
        fmtMoney(f.cobro_calculado), fmtMoney(f.pagado)
      ]);

      doc.autoTable({
        startY: y + 5,
        head: [["Jefe de Hogar","Camión","Personas","Entregas","Cobro","Pagado"]],
        body: bodyPagados,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [22, 101, 52] },
        margin: { left: 14, right: 14 },
      });

      // ── Pie de página ──
      const totalPags = doc.getNumberOfPages();
      for (let i = 1; i <= totalPags; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150,150,150);
        doc.text(`AguaRuta — Informe ${nombreMes} — Página ${i} de ${totalPags}`, 14, 290);
        doc.text("Documento generado automáticamente por el sistema AguaRuta", 105, 290, { align: "center" });
      }

      doc.save(`informe_cierre_${anio}_${String(mes).padStart(2,"0")}.pdf`);
    } finally {
      setGenerando(false);
    }
  };

  // ── GENERAR EXCEL ──
  const generarExcel = () => {
    if (!informe) return;
    const wb = XLSX.utils.book_new();
    const nombreMes = `${MESES[mes]}_${anio}`;
    const r = informe.resumen;

    // Hoja 1 — Resumen
    const resumenData = [
      ["AguaRuta — Informe de Cierre", `${MESES[mes]} ${anio}`],
      [],
      ["Indicador", "Valor"],
      ["Total familias", r.total_familias],
      ["Familias pagadas", r.total_pagados],
      ["Familias morosas", r.total_morosos],
      ["Precio unitario", informe.precio_unitario],
      ["Total cobrado", r.total_cobrado],
      ["Total pagado", r.total_pagado],
      ["Total deuda", r.total_deuda],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), "Resumen");

    // Hoja 2 — Morosos (para jurídica)
    const morososData = [
      ["LISTADO DE MOROSOS — USO JURÍDICO", `Período: ${MESES[mes]} ${anio}`],
      [],
      ["Jefe de Hogar","Camión","N° Personas","Residentes","RUTs","Deuda Mes","Deuda Acumulada","Deuda Total","Latitud","Longitud","Teléfono"],
      ...(informe.morosos || []).map(f => [
        f.nombre, f.camion, f.personas,
        f.residentes?.map(r => r.nombre).join(", ") || "—",
        f.residentes?.map(r => r.rut || "sin RUT").join(", ") || "—",
        f.deuda_mes, f.deuda_acumulada || 0, f.deuda_total,
        f.latitud || "", f.longitud || "", f.telefono || ""
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(morososData), "Morosos_Juridica");

    // Hoja 3 — Pagados
    const pagadosData = [
      ["FAMILIAS AL DÍA", `Período: ${MESES[mes]} ${anio}`],
      [],
      ["Jefe de Hogar","Camión","Personas","Entregas","Cobro Calculado","Pagado"],
      ...(informe.pagados || []).map(f => [
        f.nombre, f.camion, f.personas, f.entregas_mes,
        f.cobro_calculado, f.pagado
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pagadosData), "Pagados");

    // Hoja 4 — Detalle completo
    const detalleData = [
      ["Jefe de Hogar","Camión","Litros","Personas","Entregas","Cobro","Pagado","Deuda","Estado","Latitud","Longitud"],
      ...(informe.familias || []).map(f => [
        f.nombre, f.camion, f.litros, f.personas, f.entregas_mes,
        f.cobro_calculado, f.pagado, f.deuda_mes, f.estado,
        f.latitud || "", f.longitud || ""
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalleData), "Detalle_Completo");

    XLSX.writeFile(wb, `informe_cierre_${anio}_${String(mes).padStart(2,"0")}.xlsx`);
  };

  const esCerrado = informe?.cerrado;
  const r = informe?.resumen;

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">📅 Cierre de Mes</h2>

      {/* Selector mes/año */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <label style={sLabel}>Mes</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} style={sInput}>
            {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={sLabel}>Año</label>
          <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))}
            style={{ ...sInput, width: 90 }} />
        </div>
        <button onClick={cargarInforme} disabled={cargando} style={sBtn("#1d4ed8","#fff")}>
          {cargando ? "..." : "🔄 Actualizar"}
        </button>

        {/* Estado del mes */}
        {informe && (
          <div style={{
            padding: "8px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: esCerrado ? "#dcfce7" : "#fef9c3",
            color: esCerrado ? "#166534" : "#854d0e"
          }}>
            {esCerrado ? `✅ Mes cerrado — ${fmtFecha(informe.cerrado_en)}` : "🟡 Mes abierto"}
          </div>
        )}
      </div>

      {error && <div style={{ color: "#dc2626", marginBottom: 12 }}>{error}</div>}

      {informe && r && (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Total familias",  val: r.total_familias,                              color: "#0f172a" },
              { label: "✅ Pagadas",      val: r.total_pagados,                               color: "#16a34a" },
              { label: "🔴 Morosas",      val: r.total_morosos,                               color: "#dc2626" },
              { label: "Precio unit.",    val: fmtMoney(informe.precio_unitario),             color: "#0f4c81" },
              { label: "Total cobrado",   val: fmtMoney(r.total_cobrado),                     color: "#0f4c81" },
              { label: "Total pagado",    val: fmtMoney(r.total_pagado),                      color: "#16a34a" },
              { label: "Total deuda",     val: fmtMoney(r.total_deuda),                       color: "#dc2626" },
            ].map((k,i) => (
              <div key={i} style={sKpi}>
                <div style={{ fontSize: 10, color: "#64748b" }}>{k.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Botones acción */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <button onClick={generarPDF} disabled={generando} style={sBtn("#dc2626","#fff")}>
              📄 Descargar PDF
            </button>
            <button onClick={generarExcel} style={sBtn("#16a34a","#fff")}>
              📊 Descargar Excel
            </button>
            {!esCerrado ? (
              <button onClick={() => setConfirmCierre(true)} style={sBtn("#0f4c81","#fff")}>
                🔒 Cerrar mes
              </button>
            ) : (
              <button onClick={() => setConfirmReabrir(true)} style={sBtn("#f59e0b","#fff")}>
                🔓 Reabrir mes
              </button>
            )}
          </div>

          {/* Tabla morosos */}
          <div style={sCard}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#dc2626", marginBottom: 14 }}>
              🔴 Morosos ({informe.morosos?.length || 0}) — Informe Jurídico
            </div>
            {(informe.morosos?.length || 0) === 0 ? (
              <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
                ✅ Sin morosos en este período
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={sTabla}>
                  <thead>
                    <tr style={{ background: "#fef2f2" }}>
                      {["Jefe de Hogar","Camión","Residentes (RUT)","Entregas","Deuda Mes","Deuda Acum.","Deuda Total","Georref."].map(h => (
                        <th key={h} style={sTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {informe.morosos.map((f,i) => (
                      <tr key={f.id} style={{ background: i % 2 === 0 ? "#fff" : "#fff7f7", borderTop: "1px solid #fee2e2" }}>
                        <td style={sTd}><strong>{f.nombre}</strong></td>
                        <td style={sTd}>{f.camion}</td>
                        <td style={{ ...sTd, fontSize: 11 }}>
                          {f.residentes?.length > 0
                            ? f.residentes.map(r => (
                                <div key={r.nombre}>{r.nombre}{r.rut ? <span style={{ color: "#64748b" }}> ({r.rut})</span> : ""}</div>
                              ))
                            : <span style={{ color: "#94a3b8" }}>Sin residentes</span>
                          }
                        </td>
                        <td style={sTd}>{f.entregas_mes}</td>
                        <td style={{ ...sTd, color: "#dc2626", fontWeight: 600 }}>{fmtMoney(f.deuda_mes)}</td>
                        <td style={{ ...sTd, color: "#b45309", fontWeight: 600 }}>{fmtMoney(f.deuda_acumulada || 0)}</td>
                        <td style={{ ...sTd, color: "#991b1b", fontWeight: 700, fontSize: 14 }}>{fmtMoney(f.deuda_total)}</td>
                        <td style={{ ...sTd, fontSize: 11 }}>
                          {f.latitud && f.longitud
                            ? <a href={`https://maps.google.com/?q=${f.latitud},${f.longitud}`} target="_blank" rel="noreferrer">📍 Ver mapa</a>
                            : "—"
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabla pagados */}
          <div style={{ ...sCard, marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#16a34a", marginBottom: 14 }}>
              ✅ Familias al Día ({informe.pagados?.length || 0})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={sTabla}>
                <thead>
                  <tr style={{ background: "#f0fdf4" }}>
                    {["Jefe de Hogar","Camión","Personas","Entregas","Cobro","Pagado"].map(h => (
                      <th key={h} style={sTh}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(informe.pagados || []).map((f,i) => (
                    <tr key={f.id} style={{ background: i % 2 === 0 ? "#fff" : "#f7fff9", borderTop: "1px solid #dcfce7" }}>
                      <td style={sTd}><strong>{f.nombre}</strong></td>
                      <td style={sTd}>{f.camion}</td>
                      <td style={sTd}>{f.personas}</td>
                      <td style={sTd}>{f.entregas_mes}</td>
                      <td style={sTd}>{fmtMoney(f.cobro_calculado)}</td>
                      <td style={{ ...sTd, color: "#16a34a", fontWeight: 700 }}>{fmtMoney(f.pagado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Historial cierres */}
      {cierres.length > 0 && (
        <div style={{ ...sCard, marginTop: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>📋 Historial de Cierres</div>
          <table style={sTabla}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Período","Estado","Cerrado","Familias","Pagados","Morosos","Total Cobrado","Total Deuda"].map(h => (
                  <th key={h} style={sTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cierres.map(c => (
                <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => { setMes(c.mes); setAnio(c.anio); }}>
                  <td style={{ ...sTd, fontWeight: 600 }}>{MESES[c.mes]} {c.anio}</td>
                  <td style={sTd}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: c.estado === "cerrado" ? "#dcfce7" : "#fef9c3",
                      color: c.estado === "cerrado" ? "#166534" : "#854d0e"
                    }}>
                      {c.estado === "cerrado" ? "🔒 Cerrado" : "🟡 Abierto"}
                    </span>
                  </td>
                  <td style={{ ...sTd, fontSize: 11 }}>{fmtFecha(c.cerrado_en)}</td>
                  <td style={sTd}>{c.total_familias}</td>
                  <td style={{ ...sTd, color: "#16a34a", fontWeight: 600 }}>{c.total_pagados}</td>
                  <td style={{ ...sTd, color: "#dc2626", fontWeight: 600 }}>{c.total_morosos}</td>
                  <td style={sTd}>{fmtMoney(c.total_cobrado)}</td>
                  <td style={{ ...sTd, color: "#dc2626", fontWeight: 700 }}>{fmtMoney(c.total_deuda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal confirmar cierre */}
      {confirmCierre && (
        <div style={sOverlay}>
          <div style={sModal}>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>🔒</div>
            <h3 style={{ textAlign: "center", marginBottom: 8 }}>Cerrar {MESES[mes]} {anio}</h3>
            <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
              Se guardará un snapshot del estado financiero.<br/>
              Podrás reabrir si hay algún error.<br/>
              <strong>¿Confirmas el cierre?</strong>
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={cerrarMes} style={{ ...sBtn("#0f4c81","#fff"), flex: 1, padding: "12px 0" }}>
                🔒 Sí, cerrar mes
              </button>
              <button onClick={() => setConfirmCierre(false)} style={{ ...sBtn("#f1f5f9","#374151"), flex: 1, padding: "12px 0" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar reabrir */}
      {confirmReabrir && (
        <div style={sOverlay}>
          <div style={sModal}>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>🔓</div>
            <h3 style={{ textAlign: "center", marginBottom: 8 }}>Reabrir {MESES[mes]} {anio}</h3>
            <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
              El mes volverá a estado abierto para correcciones.<br/>
              <strong>¿Confirmas reabrir?</strong>
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={reabrirMes} style={{ ...sBtn("#f59e0b","#fff"), flex: 1, padding: "12px 0" }}>
                🔓 Sí, reabrir
              </button>
              <button onClick={() => setConfirmReabrir(false)} style={{ ...sBtn("#f1f5f9","#374151"), flex: 1, padding: "12px 0" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Estilos ──
const sKpi = {
  background: "#fff", borderRadius: 10, padding: "10px 14px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
};
const sCard = {
  background: "#fff", borderRadius: 14, padding: 20,
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
};
const sTabla = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const sTh = { padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 12 };
const sTd = { padding: "10px 12px" };
const sInput = {
  padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8,
  fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0f172a"
};
const sLabel = { fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 };
const sOverlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
};
const sModal = {
  background: "#fff", borderRadius: 16, padding: 28,
  width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.15)"
};
function sBtn(bg, color) {
  return {
    padding: "8px 16px", borderRadius: 8, border: "none",
    background: bg, color, fontWeight: 600, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit"
  };
}
