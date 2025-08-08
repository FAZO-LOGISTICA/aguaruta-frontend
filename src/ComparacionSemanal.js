import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import API_URL from '../config'; // ✅ Ruta corregida
import './App.css';

const DIAS_ORDEN = ["LUNES","MARTES","MIERCOLES","MIÉRCOLES","JUEVES","VIERNES","SABADO","SÁBADO","DOMINGO"];
const normalizarDia = (d) => String(d || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const ComparacionSemanal = () => {
  const [datos, setDatos] = useState([]);
  const [camion, setCamion] = useState('Todos');

  const rol = localStorage.getItem("rol");

  useEffect(() => {
    axios.get(`${API_URL}/rutas-activas`)
      .then(res => setDatos(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error('Error al cargar datos:', err));
  }, []);

  const datosFiltrados = useMemo(() => {
    if (camion === 'Todos') return datos;
    return datos.filter(r => r.camion === camion);
  }, [datos, camion]);

  const resumen = useMemo(() => {
    const acc = {};
    for (const r of datosFiltrados) {
      const dnorm = normalizarDia(r.dia);
      const diaKey = DIAS_ORDEN.includes(dnorm) ? dnorm : (dnorm || "SIN_DIA");
      if (!acc[diaKey]) acc[diaKey] = { dia: diaKey, total_entregas: 0, total_litros: 0 };
      acc[diaKey].total_entregas += 1;
      acc[diaKey].total_litros += Number(r.litros || 0);
    }
    const orden = Object.values(acc).sort((a, b) => {
      const ia = DIAS_ORDEN.indexOf(a.dia);
      const ib = DIAS_ORDEN.indexOf(b.dia);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return orden.map(x => ({
      ...x,
      dia: x.dia.replace("MIERCOLES", "MIÉRCOLES").replace("SABADO","SÁBADO")
    }));
  }, [datosFiltrados]);

  const camiones = useMemo(() => {
    return [...new Set(datos.map(d => d.camion).filter(Boolean))].sort();
  }, [datos]);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(resumen);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparacion_Semanal');
    XLSX.writeFile(wb, 'comparacion_semanal.xlsx');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text('Comparación por Día (Litros Entregados)', 14, 15);
    const tabla = resumen.map(r => [r.dia, r.total_entregas, r.total_litros]);
    doc.autoTable({
      head: [['Día', 'Total Entregas', 'Total Litros']],
      body: tabla,
      startY: 20
    });
    doc.save('comparacion_semanal.pdf');
  };

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Comparación por Día</h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <select value={camion} onChange={(e) => setCamion(e.target.value)}>
          <option value="Todos">Todos los camiones</option>
          {camiones.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {rol !== "invitado" && (
          <div className="botones-exportar">
            <button onClick={exportarExcel}>Exportar Excel</button>
            <button onClick={exportarPDF}>Exportar PDF</button>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={resumen} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dia" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total_litros" fill="#2563eb" name="Litros Entregados" />
        </BarChart>
      </ResponsiveContainer>

      <table className="tabla" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Día</th>
            <th>Total Entregas</th>
            <th>Total Litros</th>
          </tr>
        </thead>
        <tbody>
          {resumen.map((r) => (
            <tr key={r.dia}>
              <td>{r.dia}</td>
              <td>{r.total_entregas}</td>
              <td>{r.total_litros}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparacionSemanal;
