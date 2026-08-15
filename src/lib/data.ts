import type { Empresa, Factura, User } from "./types.js";

// ---------------------------------------------------------------------------
// Datos mock para la demo. En producción esto vive en una base de datos real
// y las facturas se originan por integración con ARCA / ERP del pagador.
// ---------------------------------------------------------------------------

export const empresas: Empresa[] = [
  {
    id: "banco-piano",
    nombre: "Banco Piano",
    cuit: "30-50001199-3",
    tipo: "banco",
    logoIniciales: "BP",
  },
  {
    id: "pagador-agroexport",
    nombre: "AgroExport Pampa S.A.",
    cuit: "30-71234567-2",
    tipo: "pagador",
    sector: "Agroindustria exportadora",
    logoIniciales: "AP",
  },
  {
    id: "proveedor-metalurgica",
    nombre: "Metalúrgica Sur SRL",
    cuit: "30-70987654-1",
    tipo: "proveedor",
    sector: "Autopartes e insumos industriales",
    logoIniciales: "MS",
  },
];

export const users: User[] = [
  {
    id: "u-banco-1",
    email: "mesa@bancopiano.com.ar",
    password: "demo1234",
    role: "banco",
    nombre: "Lucía Fernández",
    cargo: "Mesa de Fondeo — Banco Piano",
    empresaId: "banco-piano",
  },
  {
    id: "u-pagador-1",
    email: "finanzas@agroexportpampa.com.ar",
    password: "demo1234",
    role: "pagador",
    nombre: "Martín Suárez",
    cargo: "Gerente de Finanzas",
    empresaId: "pagador-agroexport",
  },
  {
    id: "u-proveedor-1",
    email: "pagos@metalurgicasur.com.ar",
    password: "demo1234",
    role: "proveedor",
    nombre: "Carla Gómez",
    cargo: "Administración y Cobranzas",
    empresaId: "proveedor-metalurgica",
  },
];

function factura(f: Omit<Factura, "montoNeto">): Factura {
  const dias = f.diasDescuento;
  const costo = f.montoBruto * (f.tasaAnual / 100) * (dias / 365);
  return { ...f, montoNeto: Math.round(f.montoBruto - costo) };
}

export const facturas: Factura[] = [
  factura({
    id: "fac-0001",
    numero: "FC-A-00041892",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-metalurgica",
    montoBruto: 18_500_000,
    fechaEmision: "2026-07-20",
    fechaVencimiento: "2026-09-18",
    estado: "pendiente_fondeo",
    scoreRiesgo: 91,
    tasaAnual: 46.3,
    diasDescuento: 58,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0002",
    numero: "FC-A-00041893",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-metalurgica",
    montoBruto: 7_200_000,
    fechaEmision: "2026-07-28",
    fechaVencimiento: "2026-09-05",
    estado: "elegible",
    scoreRiesgo: 88,
    tasaAnual: 46.3,
    diasDescuento: 39,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0003",
    numero: "FC-A-00041899",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-metalurgica",
    montoBruto: 3_950_000,
    fechaEmision: "2026-08-01",
    fechaVencimiento: "2026-08-30",
    estado: "validada",
    scoreRiesgo: 84,
    tasaAnual: 47.1,
    diasDescuento: 29,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0004",
    numero: "FC-A-00041904",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-metalurgica",
    montoBruto: 12_000_000,
    fechaEmision: "2026-08-05",
    fechaVencimiento: "2026-08-20",
    estado: "pendiente_validacion",
    scoreRiesgo: 79,
    tasaAnual: 48.0,
    diasDescuento: 15,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0005",
    numero: "FC-A-00041790",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-metalurgica",
    montoBruto: 9_400_000,
    fechaEmision: "2026-06-30",
    fechaVencimiento: "2026-08-01",
    estado: "financiada",
    scoreRiesgo: 90,
    tasaAnual: 46.3,
    diasDescuento: 32,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0006",
    numero: "FC-A-00041650",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-metalurgica",
    montoBruto: 5_100_000,
    fechaEmision: "2026-06-01",
    fechaVencimiento: "2026-07-10",
    estado: "cobrada",
    scoreRiesgo: 93,
    tasaAnual: 45.8,
    diasDescuento: 39,
    moneda: "ARS",
  }),
];

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getEmpresa(id: string): Empresa | undefined {
  return empresas.find((e) => e.id === id);
}

export function facturasPorPagador(pagadorId: string): Factura[] {
  return facturas.filter((f) => f.pagadorId === pagadorId);
}

export function facturasPorProveedor(proveedorId: string): Factura[] {
  return facturas.filter((f) => f.proveedorId === proveedorId);
}

// El banco/fondo ve todo lo que ya pasó el filtro de riesgo de la plataforma
// (elegible en adelante), que es lo que tiene sentido fondear.
export function facturasParaBanco(): Factura[] {
  return facturas.filter((f) =>
    ["elegible", "pendiente_fondeo", "financiada", "cobrada"].includes(f.estado)
  );
}

export function actualizarEstadoFactura(id: string, estado: Factura["estado"]) {
  const f = facturas.find((x) => x.id === id);
  if (f) f.estado = estado;
  return f;
}
