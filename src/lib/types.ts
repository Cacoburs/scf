export type Role = "banco" | "pagador" | "proveedor";

export interface User {
  id: string;
  email: string;
  password: string; // demo only — texto plano, NO usar así en producción
  role: Role;
  nombre: string;
  cargo: string;
  empresaId: string;
}

export interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  tipo: "banco" | "pagador" | "proveedor";
  sector?: string;
  logoIniciales: string;
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
}
