import type { ResultadoIntegracion } from "./tipos.js";

// ---------------------------------------------------------------------------
// Enchufe: Firma digital de la cesión de factura — típicamente vía token
// AFIP / e-token corporativo del proveedor, o un servicio de firma
// electrónica externo (DocuSign, Yousign, etc.).
//
// Qué hace falta para conectar uno real:
//   - Decidir el camino: certificado AFIP de cada proveedor (más "oficial"
//     para Argentina) vs. un proveedor de firma electrónica de terceros
//     (más simple de integrar, pero sin el mismo valor probatorio).
//   - Si es AFIP: acceso a los servicios web de AFIP y que cada proveedor
//     tenga su clave fiscal habilitada.
//   - Si es un proveedor externo: cuenta + API key de ese proveedor.
// ---------------------------------------------------------------------------

export interface FirmaDigitalProvider {
  firmarCesion(operacionId: string, firmante: string): Promise<ResultadoIntegracion<{ hashFirma: string }>>;
}

export class FirmaDigitalProviderSimulado implements FirmaDigitalProvider {
  async firmarCesion(operacionId: string, firmante: string): Promise<ResultadoIntegracion<{ hashFirma: string }>> {
    return {
      ok: true,
      simulado: true,
      mensaje: `Firma simulada de "${firmante}" sobre la operación ${operacionId} — sin proveedor de firma real conectado todavía.`,
      datos: { hashFirma: `SIM-FIRMA-${operacionId}` },
    };
  }
}

export const firmaDigitalProvider: FirmaDigitalProvider = new FirmaDigitalProviderSimulado();
