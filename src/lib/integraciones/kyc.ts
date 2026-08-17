import type { NivelKYB } from "../types.js";
import type { ResultadoIntegracion } from "./tipos.js";

// ---------------------------------------------------------------------------
// Enchufe: Verificación de identidad (KYC) y de empresa (KYB) — beneficiarios
// finales, PEP, listas de sanciones.
//
// Qué hace falta para conectar uno real:
//   - Elegir un proveedor (Sumsub, Veriff, Onfido, o uno local argentino).
//   - Contrato comercial + API key de ese proveedor.
//   - Definir qué corresponde a cada nivel interno (L1/L2/L3): qué
//     documentación y qué chequeos exige cada uno.
// ---------------------------------------------------------------------------

export interface KycProvider {
  solicitarVerificacion(
    empresaId: string,
    nivelObjetivo: NivelKYB
  ): Promise<ResultadoIntegracion<{ nivelOtorgado: NivelKYB }>>;
}

export class KycProviderSimulado implements KycProvider {
  async solicitarVerificacion(
    empresaId: string,
    nivelObjetivo: NivelKYB
  ): Promise<ResultadoIntegracion<{ nivelOtorgado: NivelKYB }>> {
    return {
      ok: true,
      simulado: true,
      mensaje: `Verificación simulada — se otorgó nivel ${nivelObjetivo} sin pasar por un proveedor de KYC real.`,
      datos: { nivelOtorgado: nivelObjetivo },
    };
  }
}

export const kycProvider: KycProvider = new KycProviderSimulado();
