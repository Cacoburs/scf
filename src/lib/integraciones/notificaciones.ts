import type { ResultadoIntegracion } from "./tipos.js";

// ---------------------------------------------------------------------------
// Enchufe: Notificar a los usuarios por fuera de la plataforma (email, SMS,
// push) cuando pasa algo relevante. Hoy la única "notificación" es el
// mensaje en pantalla (toast), que solo ve quien está logueado en ese
// momento — si nadie está mirando la pantalla, no se enteró nadie.
//
// Qué hace falta para conectar uno real:
//   - Un proveedor de envío de emails (Resend, SendGrid, Amazon SES) y/o de
//     SMS (Twilio) — cuenta + API key de cada uno.
//   - Un dominio de envío verificado (para no caer en spam).
// ---------------------------------------------------------------------------

export interface NotificacionesProvider {
  enviar(destinatarioEmail: string, asunto: string, mensaje: string): Promise<ResultadoIntegracion>;
}

export class NotificacionesProviderSimulado implements NotificacionesProvider {
  async enviar(destinatarioEmail: string, asunto: string, mensaje: string): Promise<ResultadoIntegracion> {
    console.log(`[notificación simulada] Para: ${destinatarioEmail} · Asunto: ${asunto} · ${mensaje}`);
    return {
      ok: true,
      simulado: true,
      mensaje: `Notificación simulada a ${destinatarioEmail} — no se envió ningún email real.`,
    };
  }
}

export const notificacionesProvider: NotificacionesProvider = new NotificacionesProviderSimulado();
