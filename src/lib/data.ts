import crypto from "node:crypto";
import { db, ensureSeeded } from "./db.js";
import { verifyPassword } from "./crypto.js";
import type { Empresa, Factura, Notificacion, Role, TipoNotificacion, User } from "./types.js";

// ---------------------------------------------------------------------------
// Esta capa habla con SQLite (ver ./db.ts). Los arrays de abajo se cargan una
// vez al arrancar el servidor y se mantienen en memoria para que el resto del
// código (filtros, agregaciones) siga siendo simple — pero cada función que
// modifica algo también lo escribe en la base, así que sobrevive a un reinicio.
// ---------------------------------------------------------------------------

ensureSeeded();

function toBool(n: unknown): boolean {
  return n === 1 || n === true;
}

function rowToEmpresa(row: any): Empresa {
  return {
    id: row.id,
    nombre: row.nombre,
    cuit: row.cuit,
    tipo: row.tipo,
    sector: row.sector ?? undefined,
    logoIniciales: row.logoIniciales,
    lifecyclePagador: row.lifecyclePagador ?? undefined,
    ejecutivo: row.ejecutivo ?? undefined,
    limiteExposicion: row.limiteExposicion ?? undefined,
    tasaBase: row.tasaBase ?? undefined,
    watchlist: row.watchlist != null ? toBool(row.watchlist) : undefined,
    bloqueadoCesiones: row.bloqueadoCesiones != null ? toBool(row.bloqueadoCesiones) : undefined,
    lifecycleProveedor: row.lifecycleProveedor ?? undefined,
    kyb: row.kyb ?? undefined,
    alertas: row.alertas ? JSON.parse(row.alertas) : undefined,
    bloqueadoAntifraude: row.bloqueadoAntifraude != null ? toBool(row.bloqueadoAntifraude) : undefined,
    pagadoresIds: row.pagadoresIds ? JSON.parse(row.pagadoresIds) : undefined,
  };
}

function rowToFactura(row: any): Factura {
  return {
    id: row.id,
    numero: row.numero,
    pagadorId: row.pagadorId,
    proveedorId: row.proveedorId,
    montoBruto: row.montoBruto,
    fechaEmision: row.fechaEmision,
    fechaVencimiento: row.fechaVencimiento,
    estado: row.estado,
    scoreRiesgo: row.scoreRiesgo,
    tasaAnual: row.tasaAnual,
    diasDescuento: row.diasDescuento,
    montoNeto: row.montoNeto,
    moneda: row.moneda,
    fechaFinanciacion: row.fechaFinanciacion ?? undefined,
    revisionManualL2: row.revisionManualL2 != null ? toBool(row.revisionManualL2) : undefined,
    bloqueadaAntifraude: row.bloqueadaAntifraude != null ? toBool(row.bloqueadaAntifraude) : undefined,
  };
}

function rowToUser(row: any): User {
  return { id: row.id, email: row.email, role: row.role, nombre: row.nombre, cargo: row.cargo, empresaId: row.empresaId };
}

function rowToNotificacion(row: any): Notificacion {
  return {
    id: row.id,
    role: row.role,
    facturaId: row.facturaId,
    tipo: row.tipo,
    mensaje: row.mensaje,
    creadoEn: row.creadoEn,
    visto: toBool(row.visto),
  };
}

function initialsOf(nombre: string): string {
  return nombre
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function loadMeta(key: string): string | null {
  const row = db.prepare("SELECT value FROM app_meta WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

function saveMeta(key: string, value: string) {
  db.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export const empresas: Empresa[] = (db.prepare("SELECT * FROM empresas").all() as any[]).map(rowToEmpresa);
export const users: User[] = (db.prepare("SELECT * FROM users").all() as any[]).map(rowToUser);
export const facturas: Factura[] = (db.prepare("SELECT * FROM facturas").all() as any[]).map(rowToFactura);

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function verifyCredentials(email: string, password: string, role: Role): User | null {
  const row = db.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email) as any;
  if (!row) return null;
  if (row.role !== role) return null;
  if (!verifyPassword(password, row.passwordHash, row.passwordSalt)) return null;
  return rowToUser(row);
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

function diasEntreFechas(desde: string, hasta: string): number {
  const a = new Date(`${desde}T00:00:00`);
  const b = new Date(`${hasta}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function calcularMontoNeto(montoBruto: number, tasaAnual: number, dias: number): number {
  const costo = montoBruto * (tasaAnual / 100) * (dias / 365);
  return Math.round(montoBruto - costo);
}

// No hay motor de pricing real todavía (CFG-02/CFG-03 del backlog) — como
// aproximación razonable, una factura nueva toma la tasa y el score
// promedio que ya tiene ese pagador en su propio historial. Si el pagador
// todavía no tiene ninguna factura cargada, usa un default neutro.
const TASA_DEFAULT = 46.5;
const SCORE_DEFAULT = 72;

function tasaSugeridaPagador(pagadorId: string): number {
  const empresa = getEmpresa(pagadorId);
  if (empresa?.tasaBase != null) return empresa.tasaBase;
  const propias = facturasPorPagador(pagadorId);
  if (propias.length === 0) return TASA_DEFAULT;
  return Math.round((propias.reduce((acc, f) => acc + f.tasaAnual, 0) / propias.length) * 10) / 10;
}

function scoreSugeridoPagador(pagadorId: string): number {
  const promedio = scorePromedioPagador(pagadorId);
  return promedio > 0 ? promedio : SCORE_DEFAULT;
}

export function crearFactura(opts: {
  numero: string;
  pagadorId: string;
  proveedorId: string;
  montoBruto: number;
  fechaEmision: string;
  fechaVencimiento: string;
}): Factura {
  const diasDescuento = Math.max(1, diasEntreFechas(opts.fechaEmision, opts.fechaVencimiento));
  const tasaAnual = tasaSugeridaPagador(opts.pagadorId);
  const scoreRiesgo = scoreSugeridoPagador(opts.pagadorId);
  const montoNeto = calcularMontoNeto(opts.montoBruto, tasaAnual, diasDescuento);
  const f: Factura = {
    id: `fac-${crypto.randomUUID()}`,
    numero: opts.numero,
    pagadorId: opts.pagadorId,
    proveedorId: opts.proveedorId,
    montoBruto: opts.montoBruto,
    fechaEmision: opts.fechaEmision,
    fechaVencimiento: opts.fechaVencimiento,
    estado: "pendiente_validacion",
    scoreRiesgo,
    tasaAnual,
    diasDescuento,
    montoNeto,
    moneda: "ARS",
  };
  facturas.push(f);
  db.prepare(`
    INSERT INTO facturas (id, numero, pagadorId, proveedorId, montoBruto, fechaEmision, fechaVencimiento,
      estado, scoreRiesgo, tasaAnual, diasDescuento, montoNeto, moneda, revisionManualL2, bloqueadaAntifraude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ARS', 0, 0)
  `).run(f.id, f.numero, f.pagadorId, f.proveedorId, f.montoBruto, f.fechaEmision, f.fechaVencimiento, f.estado, f.scoreRiesgo, f.tasaAnual, f.diasDescuento, f.montoNeto);
  return f;
}

export function existeNumeroFacturaParaPagador(pagadorId: string, numero: string): boolean {
  return facturas.some((f) => f.pagadorId === pagadorId && f.numero.trim().toLowerCase() === numero.trim().toLowerCase());
}

export function actualizarEstadoFactura(id: string, estado: Factura["estado"]) {
  const f = facturas.find((x) => x.id === id);
  if (f) {
    f.estado = estado;
    if (estado === "financiada" && !f.fechaFinanciacion) {
      f.fechaFinanciacion = new Date().toISOString().slice(0, 10);
    }
    db.prepare("UPDATE facturas SET estado = ?, fechaFinanciacion = ? WHERE id = ?").run(estado, f.fechaFinanciacion ?? null, id);
  }
  return f;
}

export function toggleRevisionManualL2(id: string) {
  const f = facturas.find((x) => x.id === id);
  if (f) {
    f.revisionManualL2 = !f.revisionManualL2;
    db.prepare("UPDATE facturas SET revisionManualL2 = ? WHERE id = ?").run(f.revisionManualL2 ? 1 : 0, id);
  }
  return f;
}

export function toggleBloqueadaAntifraude(id: string) {
  const f = facturas.find((x) => x.id === id);
  if (f) {
    f.bloqueadaAntifraude = !f.bloqueadaAntifraude;
    db.prepare("UPDATE facturas SET bloqueadaAntifraude = ? WHERE id = ?").run(f.bloqueadaAntifraude ? 1 : 0, id);
  }
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
  if (e && e.limiteExposicion) {
    e.limiteExposicion = Math.round(e.limiteExposicion * factor);
    db.prepare("UPDATE empresas SET limiteExposicion = ? WHERE id = ?").run(e.limiteExposicion, id);
  }
  return e;
}

// Límites y política (OPS-?? — mesa de fondeo define el límite de exposición
// y la tasa base por pagador, en vez de que quede implícita en el histórico).
export function establecerLimiteExposicion(id: string, limite: number) {
  const e = empresas.find((x) => x.id === id);
  if (e && Number.isFinite(limite) && limite >= 0) {
    e.limiteExposicion = Math.round(limite);
    db.prepare("UPDATE empresas SET limiteExposicion = ? WHERE id = ?").run(e.limiteExposicion, id);
  }
  return e;
}

export function establecerTasaBasePagador(id: string, tasaBase: number) {
  const e = empresas.find((x) => x.id === id);
  if (e && Number.isFinite(tasaBase) && tasaBase > 0) {
    e.tasaBase = Math.round(tasaBase * 10) / 10;
    db.prepare("UPDATE empresas SET tasaBase = ? WHERE id = ?").run(e.tasaBase, id);
  }
  return e;
}

export function toggleWatchlistPagador(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) {
    e.watchlist = !e.watchlist;
    db.prepare("UPDATE empresas SET watchlist = ? WHERE id = ?").run(e.watchlist ? 1 : 0, id);
  }
  return e;
}

export function toggleBloqueoCesionesPagador(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) {
    e.bloqueadoCesiones = !e.bloqueadoCesiones;
    db.prepare("UPDATE empresas SET bloqueadoCesiones = ? WHERE id = ?").run(e.bloqueadoCesiones ? 1 : 0, id);
  }
  return e;
}

export function reasignarEjecutivoPagador(id: string, ejecutivo: string) {
  const e = empresas.find((x) => x.id === id);
  if (e && ejecutivo.trim()) {
    e.ejecutivo = ejecutivo.trim();
    db.prepare("UPDATE empresas SET ejecutivo = ? WHERE id = ?").run(e.ejecutivo, id);
  }
  return e;
}

export function suspenderPagador(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) {
    e.lifecyclePagador = e.lifecyclePagador === "suspendido" ? "activo" : "suspendido";
    db.prepare("UPDATE empresas SET lifecyclePagador = ? WHERE id = ?").run(e.lifecyclePagador, id);
  }
  return e;
}

export function aprobarPagadorPendiente(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e && e.lifecyclePagador === "pendiente_4ojos") {
    e.lifecyclePagador = "activo";
    db.prepare("UPDATE empresas SET lifecyclePagador = ? WHERE id = ?").run(e.lifecyclePagador, id);
  }
  return e;
}

export function crearPagador(opts: {
  nombre: string;
  cuit: string;
  sector: string;
  ejecutivo: string;
  limiteExposicion: number;
  proponerA4Ojos: boolean;
}): Empresa {
  const id = `pagador-${crypto.randomUUID()}`;
  const empresa: Empresa = {
    id,
    nombre: opts.nombre,
    cuit: opts.cuit,
    tipo: "pagador",
    sector: opts.sector,
    logoIniciales: initialsOf(opts.nombre),
    lifecyclePagador: opts.proponerA4Ojos ? "pendiente_4ojos" : "onboarding",
    ejecutivo: opts.ejecutivo,
    limiteExposicion: opts.limiteExposicion,
  };
  empresas.push(empresa);
  db.prepare(`
    INSERT INTO empresas (id, nombre, cuit, tipo, sector, logoIniciales, lifecyclePagador, ejecutivo,
      limiteExposicion, watchlist, bloqueadoCesiones, lifecycleProveedor, kyb, alertas, bloqueadoAntifraude, pagadoresIds)
    VALUES (?, ?, ?, 'pagador', ?, ?, ?, ?, ?, 0, 0, NULL, NULL, NULL, 0, NULL)
  `).run(id, empresa.nombre, empresa.cuit, empresa.sector ?? null, empresa.logoIniciales, empresa.lifecyclePagador ?? null, empresa.ejecutivo ?? null, empresa.limiteExposicion ?? null);
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
    db.prepare("UPDATE empresas SET kyb = ? WHERE id = ?").run(e.kyb ?? null, id);
  }
  return e;
}

export function toggleDormantProveedor(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) {
    e.lifecycleProveedor = e.lifecycleProveedor === "dormant" ? "activo" : "dormant";
    db.prepare("UPDATE empresas SET lifecycleProveedor = ? WHERE id = ?").run(e.lifecycleProveedor ?? null, id);
  }
  return e;
}

export function toggleBloqueoAntifraudeProveedor(id: string) {
  const e = empresas.find((x) => x.id === id);
  if (e) {
    e.bloqueadoAntifraude = !e.bloqueadoAntifraude;
    e.lifecycleProveedor = e.bloqueadoAntifraude ? "bloqueado" : "activo";
    db.prepare("UPDATE empresas SET bloqueadoAntifraude = ?, lifecycleProveedor = ? WHERE id = ?")
      .run(e.bloqueadoAntifraude ? 1 : 0, e.lifecycleProveedor, id);
  }
  return e;
}

export function invitarProveedor(opts: { nombre: string; cuit: string; sector: string; pagadorId: string }): Empresa {
  const id = `proveedor-${crypto.randomUUID()}`;
  const empresa: Empresa = {
    id,
    nombre: opts.nombre,
    cuit: opts.cuit,
    tipo: "proveedor",
    sector: opts.sector,
    logoIniciales: initialsOf(opts.nombre),
    lifecycleProveedor: "invitado",
    kyb: "L1",
    pagadoresIds: [opts.pagadorId],
  };
  empresas.push(empresa);
  db.prepare(`
    INSERT INTO empresas (id, nombre, cuit, tipo, sector, logoIniciales, lifecyclePagador, ejecutivo,
      limiteExposicion, watchlist, bloqueadoCesiones, lifecycleProveedor, kyb, alertas, bloqueadoAntifraude, pagadoresIds)
    VALUES (?, ?, ?, 'proveedor', ?, ?, NULL, NULL, NULL, 0, 0, ?, ?, NULL, 0, ?)
  `).run(id, empresa.nombre, empresa.cuit, empresa.sector ?? null, empresa.logoIniciales, empresa.lifecycleProveedor ?? null, empresa.kyb ?? null, JSON.stringify(empresa.pagadoresIds));
  return empresa;
}

// ---------------------------------------------------------------------------
// Scoring — vista global (recálculo simulado)
// ---------------------------------------------------------------------------

export let ultimoRecalculoScoring: string | null = loadMeta("ultimoRecalculoScoring");

export function recalcularScoring() {
  const updateStmt = db.prepare("UPDATE facturas SET scoreRiesgo = ? WHERE id = ?");
  for (const f of facturas) {
    const delta = Math.round((Math.random() - 0.5) * 6); // jitter ±3
    f.scoreRiesgo = Math.max(1, Math.min(99, f.scoreRiesgo + delta));
    updateStmt.run(f.scoreRiesgo, f.id);
  }
  ultimoRecalculoScoring = new Date().toISOString();
  saveMeta("ultimoRecalculoScoring", ultimoRecalculoScoring);
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

// ---------------------------------------------------------------------------
// Notificaciones in-app. A diferencia de empresas/facturas/users, esto NO se
// carga a un array en memoria al arrancar — se consulta directo a SQLite en
// cada llamada. Son pocas lecturas (una o dos por request, solo en las
// páginas "home" de banco y proveedor) y así no hay que mantener un array
// más sincronizado; para algo tan chico, la lectura directa es más simple.
// ---------------------------------------------------------------------------

export function crearNotificacion(opts: { role: Role; facturaId: string; tipo: TipoNotificacion; mensaje: string }) {
  db.prepare(`
    INSERT INTO notificaciones (id, role, facturaId, tipo, mensaje, creadoEn, visto)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(`notif-${crypto.randomUUID()}`, opts.role, opts.facturaId, opts.tipo, opts.mensaje, new Date().toISOString());
}

export function notificacionesPendientes(role: Role, tipo?: TipoNotificacion): Notificacion[] {
  const rows = tipo
    ? db.prepare("SELECT * FROM notificaciones WHERE role = ? AND tipo = ? AND visto = 0 ORDER BY creadoEn ASC").all(role, tipo)
    : db.prepare("SELECT * FROM notificaciones WHERE role = ? AND visto = 0 ORDER BY creadoEn ASC").all(role);
  return (rows as any[]).map(rowToNotificacion);
}

export function marcarNotificacionesVistas(role: Role) {
  db.prepare("UPDATE notificaciones SET visto = 1 WHERE role = ? AND visto = 0").run(role);
}
