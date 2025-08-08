import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './App.css';
import API_URL from './config';

function EditarRedistribucion() {
  const [puntos, setPuntos] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editData, setEditData] = useState({});
  const [camionFiltro, setCamionFiltro] = useState('');
  const [diaFiltro, setDiaFiltro] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/redistribucion`)
      .then(res => setPuntos(res.data))
      .catch(err => console.error('Error cargando redistribución:', err));
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

    axios.put(`${API_URL}/redistribucion`, nuevosPuntos)
      .then(() => alert('✅ Cambios guardados correctamente'))
      .catch(err => console.error('Error al guardar redistribución:', err));
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
    <div className="main-container fade-in">
      <h2 className="titulo">Editar Nueva Redistribución</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <select value={camionFiltro} onChange={e => setCamionFiltro(e.target.value)}>
          <option value=''>Todos los camiones</option>
          {camiones.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}>
          <option value=''>Todos los días</option>
          {dias.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={exportarExcel}>📊 Exportar Excel</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Litros</th>
              <th>Camión</th>
              <th>Día</th>
              <th>Latitud</th>
              <th>Longitud</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {puntosFiltrados.map((p, index) => (
              <tr key={index}>
                <td>{editIndex === index ? <input value={editData.nombre} onChange={e => handleChange(e, 'nombre')} /> : p.nombre}</td>
                <td>{editIndex === index ? <input value={editData.telefono} onChange={e => handleChange(e, 'telefono')} /> : p.telefono}</td>
                <td>{editIndex === index ? <input value={editData.litros} onChange={e => handleChange(e, 'litros')} /> : p.litros}</td>
                <td>{editIndex === index ? <input value={editData.camion} onChange={e => handleChange(e, 'camion')} /> : p.camion}</td>
                <td>{editIndex === index ? <input value={editData.dia_asignado} onChange={e => handleChange(e, 'dia_asignado')} /> : p.dia_asignado}</td>
                <td>{editIndex === index ? <input value={editData.latitud} onChange={e => handleChange(e, 'latitud')} /> : p.latitud}</td>
                <td>{editIndex === index ? <input value={editData.longitud} onChange={e => handleChange(e, 'longitud')} /> : p.longitud}</td>
                <td>
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
