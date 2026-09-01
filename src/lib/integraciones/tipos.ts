// Forma común de respuesta para cualquier integración externa (real o
// simulada). `simulado: true` es la señal de que todavía no hay un proveedor
// real conectado — cuando se conecte uno de verdad, esa implementación
// debería devolver `simulado: false`.
export interface ResultadoIntegracion<T = void> {
  ok: boolean;
  simulado: boolean;
  mensaje: string;
  datos?: T;
}

// Generador determinístico (misma semilla -> misma secuencia) para que los
// datos simulados de estas integraciones sean estables entre una búsqueda y
// la siguiente, en vez de random puro — se siente menos "de mentira".
export function pseudoAleatorio(semilla: string): () => number {
  let a = 0;
  for (const c of semilla) a = (a * 31 + c.charCodeAt(0)) | 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
