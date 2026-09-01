import { pseudoAleatorio, type ResultadoIntegracion } from "./tipos.js";

// ---------------------------------------------------------------------------
// Enchufe: Facturación electrónica contra ARCA (ex AFIP) — validar una
// factura puntual, y buscar los comprobantes que un CUIT emitió (para
// importarlos directo a "Cargar factura" en vez de tipearlos a mano).
//
// Qué hace falta para conectar uno real:
//   - Acceso a los servicios web de ARCA (facturación electrónica / WSFE, o
//     el servicio de "Comprobantes en línea" para la consulta de recibidos).
//   - Certificado y clave fiscal del pagador (CUIT propio) para autenticar
//     contra ARCA — esto lo tramita el pagador, no es algo que se resuelva
//     solo con código.
//   - Definir qué se valida exactamente: CAE vigente, CUIT emisor/receptor,
//     coincidencia de monto, etc.
// ---------------------------------------------------------------------------

export interface ComprobanteArca {
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string;
  montoBruto: number;
  cae: string;
}

export interface FacturacionElectronicaProvider {
  validarFactura(numero: string, cuitEmisor: string): Promise<ResultadoIntegracion<{ caeVigente: boolean }>>;
  buscarComprobantesRecibidos(cuitEmisor: string): Promise<ResultadoIntegracion<{ comprobantes: ComprobanteArca[] }>>;
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

  async buscarComprobantesRecibidos(cuitEmisor: string): Promise<ResultadoIntegracion<{ comprobantes: ComprobanteArca[] }>> {
    const cuitLimpio = cuitEmisor.replace(/\D/g, "");
    if (cuitLimpio.length !== 11) {
      return { ok: false, simulado: true, mensaje: "El CUIT tiene que tener 11 dígitos (con o sin guiones)." };
    }

    // Misma "búsqueda" siempre trae los mismos comprobantes para un CUIT
    // dado — no es azar puro, es una demo estable.
    const rand = pseudoAleatorio(cuitLimpio);
    const cantidad = 2 + Math.floor(rand() * 5);
    const comprobantes: ComprobanteArca[] = [];
    for (let i = 0; i < cantidad; i++) {
      const emision = new Date();
      emision.setDate(emision.getDate() - Math.floor(rand() * 90));
      const vencimiento = new Date(emision);
      vencimiento.setDate(vencimiento.getDate() + 30 + Math.floor(rand() * 60));
      const puntoVenta = String(1 + Math.floor(rand() * 20)).padStart(5, "0");
      const numeroComp = String(10_000_000 + Math.floor(rand() * 89_999_999)).slice(0, 8);
      comprobantes.push({
        numero: `FC-${cuitLimpio.slice(3, 6)}-${puntoVenta}${numeroComp}`,
        fechaEmision: emision.toISOString().slice(0, 10),
        fechaVencimiento: vencimiento.toISOString().slice(0, 10),
        montoBruto: Math.round((300_000 + rand() * 12_000_000) / 1000) * 1000,
        cae: String(Math.floor(10_000_000_000_000 + rand() * 89_999_999_999_999)).slice(0, 14),
      });
    }
    comprobantes.sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));

    return {
      ok: true,
      simulado: true,
      mensaje: `${comprobantes.length} comprobante(s) simulados encontrados para CUIT ${cuitEmisor} — sin conexión real a ARCA todavía.`,
      datos: { comprobantes },
    };
  }
}

export const facturacionElectronicaProvider: FacturacionElectronicaProvider =
  new FacturacionElectronicaProviderSimulado();
