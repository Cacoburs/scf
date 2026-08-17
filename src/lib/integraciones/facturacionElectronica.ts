import type { ResultadoIntegracion } from "./tipos.js";

// ---------------------------------------------------------------------------
// Enchufe: Validación de factura electrónica contra ARCA (ex AFIP) antes de
// aceptarla al circuito de descuento.
//
// Qué hace falta para conectar uno real:
//   - Acceso a los servicios web de ARCA (facturación electrónica / WSFE).
//   - Certificado y clave fiscal de cada pagador que emite facturas.
//   - Definir qué se valida exactamente: CAE vigente, CUIT emisor/receptor,
//     coincidencia de monto, etc.
//
// Nota: todavía no está conectado a ninguna pantalla porque la carga de
// facturas propia (importación por CSV o integración ERP — la historia
// PAG-06 del backlog) tampoco está construida. Este enchufe queda listo para
// cuando se construya esa pantalla.
// ---------------------------------------------------------------------------

export interface FacturacionElectronicaProvider {
  validarFactura(numero: string, cuitEmisor: string): Promise<ResultadoIntegracion<{ caeVigente: boolean }>>;
}

export class FacturacionElectronicaProviderSimulado implements FacturacionElectronicaProvider {
  async validarFactura(numero: string, cuitEmisor: string): Promise<ResultadoIntegracion<{ caeVigente: boolean }>> {
    return {
      ok: true,
      simulado: true,
      mensaje: `Validación simulada de ${numero} — sin conexión real a ARCA todavía.`,
      datos: { caeVigente: true },
    };
  }
}

export const facturacionElectronicaProvider: FacturacionElectronicaProvider =
  new FacturacionElectronicaProviderSimulado();
