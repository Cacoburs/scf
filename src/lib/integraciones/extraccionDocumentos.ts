import crypto from "node:crypto";
import { pseudoAleatorio, type ResultadoIntegracion } from "./tipos.js";

// ---------------------------------------------------------------------------
// Enchufe: Extracción de datos de un archivo de factura (PDF o foto) que el
// pagador sube a mano — para no tener que tipear número, fechas, monto y CAE.
//
// Qué hace falta para conectar uno real:
//   - Un servicio de OCR / document AI (ej. un modelo con visión, o un
//     proveedor especializado en comprobantes argentinos).
//   - Contrato/API key de ese proveedor.
//   - Definir qué pasa si la extracción falla o viene incompleta — hoy la
//     demo siempre "encuentra" los 5 campos, un extractor real no siempre va
//     a poder.
// ---------------------------------------------------------------------------

export interface DatosExtraidosFactura {
  numero: string;
  fechaEmision: string;
  fechaVencimiento: string;
  montoBruto: number;
  cae: string;
}

export interface ExtraccionDocumentosProvider {
  extraerDeArchivo(nombreArchivo: string, contenido: Buffer): Promise<ResultadoIntegracion<DatosExtraidosFactura>>;
}

export class ExtraccionDocumentosProviderSimulado implements ExtraccionDocumentosProvider {
  async extraerDeArchivo(nombreArchivo: string, contenido: Buffer): Promise<ResultadoIntegracion<DatosExtraidosFactura>> {
    if (contenido.length === 0) {
      return { ok: false, simulado: true, mensaje: "El archivo llegó vacío — no se pudo extraer nada." };
    }

    // Semilla en el contenido del archivo: el mismo archivo siempre "extrae"
    // los mismos datos, en vez de tirar valores distintos cada vez.
    const hash = crypto.createHash("sha256").update(contenido).digest("hex");
    const rand = pseudoAleatorio(hash);

    const emision = new Date();
    emision.setDate(emision.getDate() - Math.floor(rand() * 20));
    const vencimiento = new Date(emision);
    vencimiento.setDate(vencimiento.getDate() + 30 + Math.floor(rand() * 60));
    const montoBruto = Math.round((500_000 + rand() * 15_000_000) / 1000) * 1000;
    const cae = String(Math.floor(10_000_000_000_000 + rand() * 89_999_999_999_999)).slice(0, 14);
    const numeroEnNombre = nombreArchivo.match(/(\d{4,5}-?\d{6,8})/)?.[1];
    const numero = numeroEnNombre ?? `FC-${hash.slice(0, 1).toUpperCase()}-${hash.slice(1, 9)}`;

    return {
      ok: true,
      simulado: true,
      mensaje: `Datos extraídos de "${nombreArchivo}" — simulado, sin OCR real conectado todavía. Revisá los valores antes de confirmar.`,
      datos: {
        numero,
        fechaEmision: emision.toISOString().slice(0, 10),
        fechaVencimiento: vencimiento.toISOString().slice(0, 10),
        montoBruto,
        cae,
      },
    };
  }
}

export const extraccionDocumentosProvider: ExtraccionDocumentosProvider = new ExtraccionDocumentosProviderSimulado();
