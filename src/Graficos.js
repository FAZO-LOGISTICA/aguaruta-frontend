// src/pages/Graficos.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import API_URL from '../config'; // ✅ Usamos la URL centralizada
import './App.css';

const COLORS = ['#2563eb', '#f87171', '#facc15', '#6b7280'];

const Graficos = () => {
  const [datos, setDatos] = useState([]);
  const [camion, setCamion] = useState('Todos');
  const [dia, setDia] = useState('Todos');

  // 🔹 Cargar datos desde Render usando la URL centralizada
  useEffect(() => {
    axios.get(`${API_URL}/rutas-activas`)
      .then(res => {
        setDatos(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => console.error('Error al cargar datos:', err));
  }, []);

  const datosFiltrados = Array.isArray(datos)
    ? datos.filter(d =>
        (camion === 'Todos' || d.id_camión === camion) &&
        (dia === 'Todos' || d.dia === dia)
      )
    : [];

  const resumen = [
    { tipo: 'Entregada (1)', total: datosFiltrados.filter(d => d.estado_entrega === 1).length },
    { tipo: 'No entregada con foto (0)', total: datosFiltrados.filter(d => d.estado_entrega === 0).length },
    { tipo: 'No se ubicó (2)', total: datosFiltrados.filter(d => d.estado_entrega === 2).length },
    { tipo: 'No cumple protocolo (3)', total: datosFiltrados.filter(d => d.estado_entrega === 3).length },
  ];

  const camiones = Array.isArray(datos)
    ? [...new Set(datos.map(d => d.id_camión).filter(c => c && c !== 0))]
    : [];

  const dias = Array.isArray(datos)
    ? [...new Set(datos.map(d => d.dia).filter(d => d))]
    : [];

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Gráficos Generales de Entregas</h2>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <select value={camion} onChange={(e) => setCamion(e.target.value)}>
          <option value="Todos">Todos los camiones</option>
          {camiones.map((c, i) => <option key={i} value={c}>{c}</option>)}
        </select>
        <select value={dia} onChange={(e) => setDia(e.target.value)}>
          <option value="Todos">Todos los días</option>
          {dias.map((d, i) => <option key={i} value={d}>{d}</option>)}
        </select>
      </div>

      <h3 className="subtitulo">Distribución por tipo de entrega</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={resumen}>
          <XAxis dataKey="tipo" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>

      <h3 className="subtitulo">Proporción por tipo de entrega</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={resumen}
            dataKey="total"
            nameKey="tipo"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {resumen.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Graficos;
