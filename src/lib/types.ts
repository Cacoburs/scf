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

  // --- Excepciones vistas desde el explorador maestro del Fondo ---
  revisionManualL2?: boolean;
  bloqueadaAntifraude?: boolean;
}
