const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export const apiMethods = {
  // Obtener rutas activas
  getRutasActivas: async () => {
    const res = await fetch(`${BASE_URL}/rutas-activas`);
    if (!res.ok) throw new Error("Error al obtener rutas activas");
    return res.json();
  },

  // Registrar entrega desde la app móvil
  registrarEntrega: async (data) => {
    const res = await fetch(`${BASE_URL}/entregas-app`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Error al registrar entrega");
    return res.json();
  },

  // Listar camiones
  getCamiones: async () => {
    const res = await fetch(`${BASE_URL}/camiones`);
    if (!res.ok) throw new Error("Error al obtener camiones");
    return res.json();
  },
};
