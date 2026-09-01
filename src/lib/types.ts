export type Role = "banco" | "pagador" | "proveedor";

export interface User {
  id: string;
  email: string;
  role: Role;
  nombre: string;
  cargo: string;
  empresaId: string;
}

export type LifecyclePagador = "activo" | "onboarding" | "pendiente_4ojos" | "pausado" | "suspendido";
export type LifecycleProveedor = "activo" | "invitado" | "kyb_pendiente" | "dormant" | "bloqueado";
export type NivelKYB = "L1" | "L2" | "L3";

export interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  tipo: "banco" | "pagador" | "proveedor";
  sector?: string;
  logoIniciales: string;

  // --- Campos vistos desde el CRM del Fondo, solo aplican a tipo "pagador" ---
  lifecyclePagador?: LifecyclePagador;
  ejecutivo?: string;
  limiteExposicion?: number;
  tasaBase?: number; // TNA % que fija el Fondo como política de precio para este pagador
  watchlist?: boolean;
  bloqueadoCesiones?: boolean;

  // --- Campos vistos desde el CRM del Fondo, solo aplican a tipo "proveedor" ---
  lifecycleProveedor?: LifecycleProveedor;
  kyb?: NivelKYB;
  alertas?: string[];
  bloqueadoAntifraude?: boolean;
  pagadoresIds?: string[]; // relación explícita, usada cuando aún no hay facturas
}

export type EstadoFactura =
  | "pendiente_validacion"
  | "validada"
  | "elegible"
  | "pendiente_fondeo"
  | "financiada"
  | "cobrada"
  | "rechazada";

export interface Factura {
  id: string;
  numero: string;
  pagadorId: string; // empresa ancla que emite/aprueba la factura
  proveedorId: string; // empresa que la descuenta
  montoBruto: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: EstadoFactura;
  scoreRiesgo: number; // 0-100
  tasaAnual: number; // TNA %
  diasDescuento: number;
  montoNeto: number;
  moneda: "ARS" | "USD";
  fechaFinanciacion?: string; // fecha en la que el Fondo aprobó el fondeo (se descontó la factura)

  // --- Excepciones vistas desde el explorador maestro del Fondo ---
  revisionManualL2?: boolean;
  bloqueadaAntifraude?: boolean;
}

// Notificaciones in-app — sin proveedor de email/SMS conectado todavía (ver
// docs/INTEGRACIONES.md), esto es lo único que hoy avisa a alguien que pasó
// algo sin que tenga que estar mirando la pantalla en ese momento exacto.
export type TipoNotificacion = "conformidad" | "solicitud" | "acreditacion";

export interface Notificacion {
  id: string;
  role: Role; // a qué portal le pertenece
  facturaId: string;
  tipo: TipoNotificacion;
  mensaje: string;
  creadoEn: string;
  visto: boolean;
}
