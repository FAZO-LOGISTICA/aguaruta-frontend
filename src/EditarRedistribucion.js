// src/EditarRedistribucion.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './App.css';

function EditarRedistribucion() {
  const [puntos, setPuntos] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editData, setEditData] = useState({});
  const [camionFiltro, setCamionFiltro] = useState('');
  const [diaFiltro, setDiaFiltro] = useState('');

  useEffect(() => {
    axios.get('/data/RutasMapaFinal_con_telefono.json')
      .then(res => setPuntos(res.data))
      .catch(err => console.error('Error cargando datos:', err));
  }, []);

  const handleEdit = (index) => {
    setEditIndex(index);
    setEditData(puntosFiltrados[index]);
  };

  const handleSave = () => {
    const confirmar = window.confirm('¿Deseas guardar los cambios permanentemente?');
    if (!confirmar) return;

    const nuevosPuntos = [...puntos];
    const originalIndex = puntos.findIndex(p => p.nombre === editData.nombre && p.latitud === editData.latitud);
    nuevosPuntos[originalIndex] = editData;
    setPuntos(nuevosPuntos);
    setEditIndex(null);

    // Guardar en el backend (simulación con fetch POST a archivo json en public)
    fetch('/guardar-redistribucion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevosPuntos)
    }).catch(err => console.error('Error al guardar redistribución:', err));
  };

  const handleChange = (e, campo) => {
    setEditData({ ...editData, [campo]: e.target.value });
  };

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(puntos);
    XLSX.utils.book_append_sheet(wb, ws, 'Redistribucion');
    XLSX.writeFile(wb, 'Redistribucion.xlsx');
  };

  const camiones = [...new Set(puntos.map(p => p.camion))];
  const dias = [...new Set(puntos.map(p => p.dia_asignado))];

  const puntosFiltrados = puntos.filter(p => {
    return (!camionFiltro || p.camion === camionFiltro) && (!diaFiltro || p.dia_asignado === diaFiltro);
  });

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ textAlign: 'center' }}>Editar Nueva Redistribución</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select value={camionFiltro} onChange={e => setCamionFiltro(e.target.value)}>
          <option value=''>Todos los camiones</option>
          {camiones.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}>
          <option value=''>Todos los días</option>
          {dias.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={exportarExcel}>Exportar a Excel</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #ccc', fontSize: '14px' }}>
          <thead style={{ backgroundColor: '#f2f2f2' }}>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Nombre</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Teléfono</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Litros</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Camión</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Día</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Latitud</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Longitud</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {puntosFiltrados.map((p, index) => (
              <tr key={index}>
                <td style={{ border: '1px solid #ccc', padding: '6px' }}>{editIndex === index ? <input value={editData.nombre} onChange={e => handleChange(e, 'nombre')} /> : p.nombre}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }}>{editIndex === index ? <input value={editData.telefono} onChange={e => handleChange(e, 'telefono')} /> : p.telefono}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }}>{editIndex === index ? <input value={editData.litros} onChange={e => handleChange(e, 'litros')} /> : p.litros}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }}>{editIndex === index ? <input value={editData.camion} onChange={e => handleChange(e, 'camion')} /> : p.camion}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }}>{editIndex === index ? <input value={editData.dia_asignado} onChange={e => handleChange(e, 'dia_asignado')} /> : p.dia_asignado}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }}>{editIndex === index ? <input value={editData.latitud} onChange={e => handleChange(e, 'latitud')} /> : p.latitud}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }}>{editIndex === index ? <input value={editData.longitud} onChange={e => handleChange(e, 'longitud')} /> : p.longitud}</td>
                <td style={{ border: '1px solid #ccc', padding: '6px' }}>
                  {editIndex === index ? (
                    <>
                      <button onClick={handleSave}>Guardar</button>
                      <button onClick={() => setEditIndex(null)}>Cancelar</button>
                    </>
                  ) : (
                    <button onClick={() => handleEdit(index)}>Editar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EditarRedistribucion;
