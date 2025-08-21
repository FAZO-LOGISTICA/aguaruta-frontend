// Paleta única para todos los mapas
export const CAMION_COLORS = {
  A1: '#1E90FF', // azul
  A2: '#F1C40F', // amarillo
  A3: '#2ECC71', // verde
  A4: '#8E44AD', // morado
  A5: '#E74C3C', // rojo
  M1: '#795548', // café
  M2: '#E91E63', // magenta
  M3: '#000000', // NEGRO
};

export const CAMION_ORDER = ['A1','A2','A3','A4','A5','M1','M2','M3'];

export function getCamionColor(camion) {
  return CAMION_COLORS[(camion || '').toUpperCase()] || '#808080';
}
