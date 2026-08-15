import type { Empresa, Factura, User } from "./types.js";

// ---------------------------------------------------------------------------
// Datos mock para la demo. En producción esto vive en una base de datos real
// y las facturas se originan por integración con ARCA / ERP del pagador.
// ---------------------------------------------------------------------------

export const empresas: Empresa[] = [
  {
    id: "banco-piano",
    nombre: "Fondos S.A.",
    cuit: "30-50001199-3",
    tipo: "banco",
    logoIniciales: "FS",
  },

  // --- Pagadores ancla ---
  {
    id: "pagador-agroexport",
    nombre: "YPF S.A.",
    cuit: "30-52345671-8",
    tipo: "pagador",
    sector: "Energía",
    logoIniciales: "YP",
    lifecyclePagador: "activo",
    ejecutivo: "Sofía Larrea",
    limiteExposicion: 80_000_000,
  },
  {
    id: "pagador-bragado",
    nombre: "Central Bragado Energía S.A.",
    cuit: "30-68912345-0",
    tipo: "pagador",
    sector: "Energía",
    logoIniciales: "CB",
    lifecyclePagador: "activo",
    ejecutivo: "Martín Prieto",
    limiteExposicion: 25_000_000,
  },
  {
    id: "pagador-valemin",
    nombre: "Vale Minería Argentina S.A.",
    cuit: "30-71987654-3",
    tipo: "pagador",
    sector: "Minería",
    logoIniciales: "VM",
    lifecyclePagador: "onboarding",
    ejecutivo: "Sofía Larrea",
    limiteExposicion: 15_000_000,
  },
  {
    id: "pagador-ternium",
    nombre: "Ternium Siderurgia S.A.",
    cuit: "30-69123456-7",
    tipo: "pagador",
    sector: "Industria pesada",
    logoIniciales: "TS",
    lifecyclePagador: "pausado",
    ejecutivo: "Diego Ferrari",
    limiteExposicion: 30_000_000,
    watchlist: true,
  },

  // --- Proveedores cedentes ---
  {
    id: "proveedor-metalurgica",
    nombre: "Errázuriz S.A.",
    cuit: "30-70987654-1",
    tipo: "proveedor",
    sector: "Autopartes e insumos industriales",
    logoIniciales: "EZ",
    lifecycleProveedor: "activo",
    kyb: "L2",
  },
  {
    id: "proveedor-litoral",
    nombre: "Transportes del Litoral S.A.",
    cuit: "30-70456789-5",
    tipo: "proveedor",
    sector: "Logística",
    logoIniciales: "TL",
    lifecycleProveedor: "activo",
    kyb: "L2",
  },
  {
    id: "proveedor-agropampeanos",
    nombre: "Insumos Agro Pampeanos SRL",
    cuit: "30-71345678-9",
    tipo: "proveedor",
    sector: "Insumos agropecuarios",
    logoIniciales: "IA",
    lifecycleProveedor: "activo",
    kyb: "L3",
  },
  {
    id: "proveedor-servitech",
    nombre: "ServiTech Industrial S.A.",
    cuit: "30-71765432-6",
    tipo: "proveedor",
    sector: "Servicios industriales",
    logoIniciales: "ST",
    lifecycleProveedor: "kyb_pendiente",
    kyb: "L1",
    pagadoresIds: ["pagador-ternium"],
    alertas: ["KYB nivel 1 — falta validar beneficiarios finales"],
  },
  {
    id: "proveedor-repuestossur",
    nombre: "Repuestos del Sur S.A.",
    cuit: "30-70234567-8",
    tipo: "proveedor",
    sector: "Autopartes e insumos industriales",
    logoIniciales: "RS",
    lifecycleProveedor: "dormant",
    kyb: "L2",
    pagadoresIds: ["pagador-agroexport"],
    alertas: ["Sin actividad hace 45+ días"],
  },
  {
    id: "proveedor-construcciones-australes",
    nombre: "Construcciones Australes SRL",
    cuit: "30-71654321-0",
    tipo: "proveedor",
    sector: "Construcción",
    logoIniciales: "CA",
    lifecycleProveedor: "bloqueado",
    kyb: "L2",
    bloqueadoAntifraude: true,
    alertas: ["Bloqueado por anti-fraude — factura con inconsistencias documentales"],
  },
];

export const users: User[] = [
  {
    id: "u-banco-1",
    email: "mesa@fondossa.com.ar",
    password: "demo1234",
    role: "banco",
    nombre: "Lucía Fernández",
    cargo: "Mesa de Fondeo — Fondos S.A.",
    empresaId: "banco-piano",
  },
  {
    id: "u-pagador-1",
    email: "finanzas@ypf.com.ar",
    password: "demo1234",
    role: "pagador",
    nombre: "Martín Suárez",
    cargo: "Gerente de Finanzas",
    empresaId: "pagador-agroexport",
  },
  {
    id: "u-proveedor-1",
    email: "pagos@errazuriz.com.ar",
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
  factura({
    id: "fac-0007",
    numero: "FC-Y-00019921",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-litoral",
    montoBruto: 22_000_000,
    fechaEmision: "2026-07-16",
    fechaVencimiento: "2026-08-25",
    estado: "financiada",
    scoreRiesgo: 89,
    tasaAnual: 45.9,
    diasDescuento: 40,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0008",
    numero: "FC-Y-00019855",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-litoral",
    montoBruto: 14_500_000,
    fechaEmision: "2026-06-15",
    fechaVencimiento: "2026-07-15",
    estado: "cobrada",
    scoreRiesgo: 90,
    tasaAnual: 45.5,
    diasDescuento: 30,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0009",
    numero: "FC-Y-00019978",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-repuestossur",
    montoBruto: 9_800_000,
    fechaEmision: "2026-08-06",
    fechaVencimiento: "2026-09-10",
    estado: "elegible",
    scoreRiesgo: 82,
    tasaAnual: 47.0,
    diasDescuento: 35,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0010",
    numero: "FC-B-00003341",
    pagadorId: "pagador-bragado",
    proveedorId: "proveedor-litoral",
    montoBruto: 17_300_000,
    fechaEmision: "2026-07-18",
    fechaVencimiento: "2026-09-01",
    estado: "financiada",
    scoreRiesgo: 87,
    tasaAnual: 46.8,
    diasDescuento: 45,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0011",
    numero: "FC-B-00003367",
    pagadorId: "pagador-bragado",
    proveedorId: "proveedor-construcciones-australes",
    montoBruto: 6_200_000,
    fechaEmision: "2026-07-29",
    fechaVencimiento: "2026-08-18",
    estado: "pendiente_validacion",
    scoreRiesgo: 65,
    tasaAnual: 49.5,
    diasDescuento: 20,
    moneda: "ARS",
    bloqueadaAntifraude: true,
  }),
  factura({
    id: "fac-0012",
    numero: "FC-V-00000512",
    pagadorId: "pagador-valemin",
    proveedorId: "proveedor-agropampeanos",
    montoBruto: 11_000_000,
    fechaEmision: "2026-08-03",
    fechaVencimiento: "2026-08-28",
    estado: "validada",
    scoreRiesgo: 75,
    tasaAnual: 48.2,
    diasDescuento: 25,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0013",
    numero: "FC-A-00041911",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-agropampeanos",
    montoBruto: 8_600_000,
    fechaEmision: "2026-08-11",
    fechaVencimiento: "2026-09-12",
    estado: "elegible",
    scoreRiesgo: 86,
    tasaAnual: 46.3,
    diasDescuento: 32,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0014",
    numero: "FC-A-00041830",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-agropampeanos",
    montoBruto: 4_300_000,
    fechaEmision: "2026-07-25",
    fechaVencimiento: "2026-08-22",
    estado: "financiada",
    scoreRiesgo: 88,
    tasaAnual: 46.3,
    diasDescuento: 28,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0015",
    numero: "FC-T-00000198",
    pagadorId: "pagador-ternium",
    proveedorId: "proveedor-servitech",
    montoBruto: 3_100_000,
    fechaEmision: "2026-08-01",
    fechaVencimiento: "2026-08-19",
    estado: "pendiente_validacion",
    scoreRiesgo: 58,
    tasaAnual: 51.0,
    diasDescuento: 18,
    moneda: "ARS",
    revisionManualL2: true,
  }),
  factura({
    id: "fac-0016",
    numero: "FC-Y-00020044",
    pagadorId: "pagador-agroexport",
    proveedorId: "proveedor-litoral",
    montoBruto: 26_400_000,
    fechaEmision: "2026-08-09",
    fechaVencimiento: "2026-09-20",
    estado: "pendiente_fondeo",
    scoreRiesgo: 92,
    tasaAnual: 45.2,
    diasDescuento: 42,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0017",
    numero: "FC-B-00003298",
    pagadorId: "pagador-bragado",
    proveedorId: "proveedor-litoral",
    montoBruto: 9_900_000,
    fechaEmision: "2026-06-19",
    fechaVencimiento: "2026-07-22",
    estado: "cobrada",
    scoreRiesgo: 91,
    tasaAnual: 46.0,
    diasDescuento: 33,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0018",
    numero: "FC-V-00000544",
    pagadorId: "pagador-valemin",
    proveedorId: "proveedor-agropampeanos",
    montoBruto: 8_500_000,
    fechaEmision: "2026-07-22",
    fechaVencimiento: "2026-08-26",
    estado: "financiada",
    scoreRiesgo: 78,
    tasaAnual: 47.5,
    diasDescuento: 26,
    moneda: "ARS",
  }),
  factura({
    id: "fac-0019",
    numero: "FC-T-00000175",
    pagadorId: "pagador-ternium",
    proveedorId: "proveedor-servitech",
    montoBruto: 4_700_000,
    fechaEmision: "2026-06-25",
    fechaVencimiento: "2026-07-18",
    estado: "cobrada",
    scoreRiesgo: 74,
    tasaAnual: 49.0,
    diasDescuento: 22,
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

export function toggleRevisionManualL2(id: string) {
  const f = facturas.find((x) => x.id === id);
  if (f) f.revisionManualL2 = !f.revisionManualL2;
  return f;
}

export function toggleBloqueadaAntifraude(id: string) {
  const f = facturas.find((x) => x.id === id);
  if (f) f.bloqueadaAntifraude = !f.bloqueadaAntifraude;
  return f;
}

// ---------------------------------------------------------------------------
// Pagadores ancla (CRM del Fondo)
// ---------------------------------------------------------------------------

export function pagadores(): Empresa[] {
  return empresas.filter((e) => e.tipo === "pagador");
}

export function proveedores(): Empresa[] {
  return empresas.filter((e) => e.tipo === "proveedor");
}

export function proveedoresDePagador(pagadorId: string): Empresa[] {
  const ids = new Set(facturas.filter((f) => f.pagadorId === pagadorId).map((f) => f.proveedorId));
  return proveedores().filter((p) => ids.has(p.id));
}

export function pagadoresDeProveedor(proveedorId: string): Empresa[] {
  const ids = new Set(facturas.filter((f) => f.proveedorId === proveedorId).map((f) => f.pagadorId));
  const proveedor = empresas.find((e) => e.id === proveedorId);
  for (const id of proveedor?.pagadoresIds ?? []) ids.add(id);
  return pagadores().filter((p) => ids.has(p.id));
}

// Cartera "vigente" = capital que el Fondo todavía tiene en la calle
// (ya desembolsado, a la espera del cobro del deudor cedido).
export function facturasEnCarteraVigente(): Factura[] {
  return facturas.filter((f) => f.estado === "financiada");
}

export function exposicionPorPagador(pagadorId: string): number {
  return facturasEnCarteraVigente()
    .filter((f) => f.pagadorId === pagadorId)
    .reduce((acc, f) => acc + f.montoNeto, 0);
}

export function scorePromedioPagador(pagadorId: string): number {
  const propias = facturasPorPagador(pagadorId);
  if (propias.length === 0) return 0;
  return Math.round(propias.reduce((acc, f) => acc + f.scoreRiesgo, 0) / propias.length);
}

export function dsoPagador(pagadorId: string): number {
  const propias = facturasPorPagador(pagadorId);
  if (propias.length === 0) return 0;
  return Math.round(propias.reduce((acc, f) => acc + f.diasDescuento, 0) / propias.length);
}

export function volumenFinanciadoPagador(pagadorId: string): number {
  return facturas
    .filter((f) => f.pagadorId === pagadorId && ["financiada", "cobrada"].includes(f.estado))
    .reduce((acc, f) => acc + f.montoBruto, 0);
}

export function ampliarLimitePagador(id: string, factor: number) {
  const e = empresas.find((x) => x.id === id);
  if (e && e.limiteExposicion) e.limiteExposicion = Math.round(e.limiteExposicion * factor);
  return e;
}

export function toggleWatchlistPagador(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) e.watchlist = !e.watchlist;
  return e;
}

export function toggleBloqueoCesionesPagador(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) e.bloqueadoCesiones = !e.bloqueadoCesiones;
  return e;
}

export function reasignarEjecutivoPagador(id: string, ejecutivo: string) {
  const e = empresas.find((x) => x.id === id);
  if (e && ejecutivo.trim()) e.ejecutivo = ejecutivo.trim();
  return e;
}

export function suspenderPagador(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) e.lifecyclePagador = e.lifecyclePagador === "suspendido" ? "activo" : "suspendido";
  return e;
}

export function aprobarPagadorPendiente(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e && e.lifecyclePagador === "pendiente_4ojos") e.lifecyclePagador = "activo";
  return e;
}

let pagadorSeq = 1;

export function crearPagador(opts: {
  nombre: string;
  cuit: string;
  sector: string;
  ejecutivo: string;
  limiteExposicion: number;
  proponerA4Ojos: boolean;
}): Empresa {
  const id = `pagador-nuevo-${pagadorSeq++}`;
  const empresa: Empresa = {
    id,
    nombre: opts.nombre,
    cuit: opts.cuit,
    tipo: "pagador",
    sector: opts.sector,
    logoIniciales: opts.nombre
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    lifecyclePagador: opts.proponerA4Ojos ? "pendiente_4ojos" : "onboarding",
    ejecutivo: opts.ejecutivo,
    limiteExposicion: opts.limiteExposicion,
  };
  empresas.push(empresa);
  return empresa;
}

// ---------------------------------------------------------------------------
// Proveedores cedentes (CRM del Fondo)
// ---------------------------------------------------------------------------

export function volumenDescontadoProveedor(proveedorId: string): number {
  return facturas
    .filter((f) => f.proveedorId === proveedorId && ["financiada", "cobrada"].includes(f.estado))
    .reduce((acc, f) => acc + f.montoBruto, 0);
}

export function subirKYBProveedor(id: string) {
  const orden: Array<Empresa["kyb"]> = ["L1", "L2", "L3"];
  const e = empresas.find((x) => x.id === id);
  if (e) {
    const idx = orden.indexOf(e.kyb ?? "L1");
    e.kyb = orden[Math.min(idx + 1, orden.length - 1)];
  }
  return e;
}

export function toggleDormantProveedor(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) e.lifecycleProveedor = e.lifecycleProveedor === "dormant" ? "activo" : "dormant";
  return e;
}

export function toggleBloqueoAntifraudeProveedor(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) {
    e.bloqueadoAntifraude = !e.bloqueadoAntifraude;
    e.lifecycleProveedor = e.bloqueadoAntifraude ? "bloqueado" : "activo";
  }
  return e;
}

let proveedorSeq = 1;

export function invitarProveedor(opts: { nombre: string; cuit: string; sector: string; pagadorId: string }): Empresa {
  const id = `proveedor-nuevo-${proveedorSeq++}`;
  const empresa: Empresa = {
    id,
    nombre: opts.nombre,
    cuit: opts.cuit,
    tipo: "proveedor",
    sector: opts.sector,
    logoIniciales: opts.nombre
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    lifecycleProveedor: "invitado",
    kyb: "L1",
    pagadoresIds: [opts.pagadorId],
  };
  empresas.push(empresa);
  return empresa;
}

// ---------------------------------------------------------------------------
// Scoring — vista global (recálculo simulado)
// ---------------------------------------------------------------------------

export let ultimoRecalculoScoring: string | null = null;

export function recalcularScoring() {
  for (const f of facturas) {
    const delta = Math.round((Math.random() - 0.5) * 6); // jitter ±3
    f.scoreRiesgo = Math.max(1, Math.min(99, f.scoreRiesgo + delta));
  }
  ultimoRecalculoScoring = new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Monitoreo de fondeo — desembolsos históricos (financiada + cobrada)
// ---------------------------------------------------------------------------

export function facturasDesembolsadas(): Factura[] {
  return facturas.filter((f) => ["financiada", "cobrada"].includes(f.estado));
}

export interface DesembolsoPorGrupo {
  clave: string;
  monto: number;
  operaciones: number;
}

export function desembolsoPorIndustria(): DesembolsoPorGrupo[] {
  const grupos = new Map<string, DesembolsoPorGrupo>();
  for (const f of facturasDesembolsadas()) {
    const sector = getEmpresa(f.pagadorId)?.sector ?? "Sin sector";
    const g = grupos.get(sector) ?? { clave: sector, monto: 0, operaciones: 0 };
    g.monto += f.montoNeto;
    g.operaciones += 1;
    grupos.set(sector, g);
  }
  return [...grupos.values()].sort((a, b) => b.monto - a.monto);
}

export function desembolsoPorProveedor(): DesembolsoPorGrupo[] {
  const grupos = new Map<string, DesembolsoPorGrupo>();
  for (const f of facturasDesembolsadas()) {
    const nombre = getEmpresa(f.proveedorId)?.nombre ?? "—";
    const g = grupos.get(nombre) ?? { clave: nombre, monto: 0, operaciones: 0 };
    g.monto += f.montoNeto;
    g.operaciones += 1;
    grupos.set(nombre, g);
  }
  return [...grupos.values()].sort((a, b) => b.monto - a.monto);
}

export function desembolsoPorPagador(): DesembolsoPorGrupo[] {
  const grupos = new Map<string, DesembolsoPorGrupo>();
  for (const f of facturasDesembolsadas()) {
    const nombre = getEmpresa(f.pagadorId)?.nombre ?? "—";
    const g = grupos.get(nombre) ?? { clave: nombre, monto: 0, operaciones: 0 };
    g.monto += f.montoNeto;
    g.operaciones += 1;
    grupos.set(nombre, g);
  }
  return [...grupos.values()].sort((a, b) => b.monto - a.monto);
}

const TRAMOS_MONTO: [string, number, number][] = [
  ["< 5M", 0, 5_000_000],
  ["5M – 10M", 5_000_000, 10_000_000],
  ["10M – 20M", 10_000_000, 20_000_000],
  ["≥ 20M", 20_000_000, Infinity],
];

export function desembolsoPorTramoMonto(): DesembolsoPorGrupo[] {
  return TRAMOS_MONTO.map(([clave, lo, hi]) => {
    const enTramo = facturasDesembolsadas().filter((f) => f.montoBruto >= lo && f.montoBruto < hi);
    return {
      clave,
      monto: enTramo.reduce((acc, f) => acc + f.montoNeto, 0),
      operaciones: enTramo.length,
    };
  });
}

export function desembolsoPorMes(): DesembolsoPorGrupo[] {
  const grupos = new Map<string, DesembolsoPorGrupo>();
  for (const f of facturasDesembolsadas()) {
    const mes = f.fechaEmision.slice(0, 7); // YYYY-MM
    const g = grupos.get(mes) ?? { clave: mes, monto: 0, operaciones: 0 };
    g.monto += f.montoNeto;
    g.operaciones += 1;
    grupos.set(mes, g);
  }
  return [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}
