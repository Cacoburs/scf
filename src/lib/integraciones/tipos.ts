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
