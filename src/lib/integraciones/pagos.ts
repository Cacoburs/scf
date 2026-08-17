import type { Factura } from "../types.js";
import type { ResultadoIntegracion } from "./tipos.js";

// ---------------------------------------------------------------------------
// Enchufe: Banco / PSP — es quien efectivamente mueve la plata (el desembolso
// a la cuenta del proveedor cuando el Fondo aprueba un fondeo).
//
// Qué hace falta para conectar uno real:
//   - Un banco o PSP (ej. un banco con API de transferencias, o un PSP tipo
//     Prisma/dLocal) que exponga transferencias a CBU/CVU.
//   - Credenciales de API (client id/secret) de sandbox y de producción.
//   - Definir la cuenta origen desde la que Fondos S.A. fondea.
//   - Definir cómo se concilian los pagos (webhook de confirmación, polling,
//     archivo de conciliación) — hoy no hay nada de esto.
// ---------------------------------------------------------------------------

export interface PagosProvider {
  desembolsar(factura: Factura): Promise<ResultadoIntegracion<{ referencia: string }>>;
}

export class PagosProviderSimulado implements PagosProvider {
  async desembolsar(factura: Factura): Promise<ResultadoIntegracion<{ referencia: string }>> {
    // Comportamiento actual de la demo: el desembolso "sale" al instante y
    // siempre exitoso. Una integración real acá dependería de una API externa
    // (con latencia real, y la posibilidad de que el banco lo rechace).
    return {
      ok: true,
      simulado: true,
      mensaje: `Desembolso simulado de ${factura.numero} — sin integración bancaria real conectada todavía.`,
      datos: { referencia: `SIM-${factura.id}-${Date.now()}` },
    };
  }
}

export const pagosProvider: PagosProvider = new PagosProviderSimulado();
