import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const RegistrarEntrega = () => {
  const [baseUrl, setBaseUrl] = useState('');
  const [puntos, setPuntos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [litros, setLitros] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [camion, setCamion] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const init = async () => {
      let url = process.env.REACT_APP_API_URL;
      if (!url) {
        try {
          const res = await fetch('/url.txt', { cache: 'no-store' });
          if (res.ok) url = (await res.text()).trim();
        } catch {
          setMensaje('❌ No se pudo obtener la URL del backend.');
          return;
        }
      }

      setBaseUrl(url);

      try {
        const r = await axios.get(`${url}/rutas-activas`);
        setPuntos(r.data || []);
      } catch (err) {
        console.error('Error al cargar puntos:', err);
        setMensaje('❌ No se pudo cargar la lista de puntos.');
      }
    };

    init();
  }, []);

  const registrarEntrega = async () => {
    if (!nombre || !litros || !camion || !fecha) {
      setMensaje('⚠️ Todos los campos son obligatorios.');
      return;
    }

    const punto = puntos.find(p => p["nombre_(jefe_de_hogar)"] === nombre);
    if (!punto) {
      setMensaje('❌ Nombre no encontrado en la base de datos.');
      return;
    }

    const nuevaEntrega = {
      id: punto.id,
      nombre,
      litros: parseInt(litros),
      fecha,
      camion,
      estado_entrega: 1,
    };

    try {
      await axios.post(`${baseUrl}/registrar-entrega`, nuevaEntrega);
      setMensaje('✅ Entrega registrada correctamente.');
      setLitros('');
    } catch (err) {
      console.error('Error al registrar entrega:', err);
      setMensaje('❌ Error al registrar entrega.');
    }
  };

  const camiones = ['A1', 'A2', 'A3', 'A4', 'A5', 'M1', 'M2'];
  const nombres = [...new Set(puntos.map(p => p["nombre_(jefe_de_hogar)"]).filter(Boolean))];

  return (
    <div className="main-container fade-in">
      <h2 className="titulo">Registrar Entrega Manual</h2>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 400, margin: '0 auto' }}>
        <label>Nombre del jefe de hogar:</label>
        <select value={nombre} onChange={(e) => setNombre(e.target.value)}>
          <option value="">Seleccionar</option>
          {nombres.map((n, i) => (
            <option key={i} value={n}>{n}</option>
          ))}
        </select>
        <label>Litros entregados:</label>
        <input type="number" value={litros} onChange={(e) => setLitros(e.target.value)} />
        <label>Fecha:</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <label>Camión:</label>
        <select value={camion} onChange={(e) => setCamion(e.target.value)}>
          <option value="">Seleccionar</option>
          {camiones.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={registrarEntrega} style={{ marginTop: '1rem' }}>Registrar Entrega</button>
        {mensaje && <p style={{ marginTop: '1rem' }}>{mensaje}</p>}
      </div>
    </div>
  );
};

export default RegistrarEntrega;
