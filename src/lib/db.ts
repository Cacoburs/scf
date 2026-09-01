import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "./crypto.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const DB_PATH = path.join(DATA_DIR, "mills.sqlite");

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS empresas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    cuit TEXT NOT NULL,
    tipo TEXT NOT NULL,
    sector TEXT,
    logoIniciales TEXT NOT NULL,
    lifecyclePagador TEXT,
    ejecutivo TEXT,
    limiteExposicion REAL,
    tasaBase REAL,
    watchlist INTEGER,
    bloqueadoCesiones INTEGER,
    lifecycleProveedor TEXT,
    kyb TEXT,
    alertas TEXT,
    bloqueadoAntifraude INTEGER,
    pagadoresIds TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    passwordSalt TEXT NOT NULL,
    role TEXT NOT NULL,
    nombre TEXT NOT NULL,
    cargo TEXT NOT NULL,
    empresaId TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS facturas (
    id TEXT PRIMARY KEY,
    numero TEXT NOT NULL,
    pagadorId TEXT NOT NULL,
    proveedorId TEXT NOT NULL,
    montoBruto REAL NOT NULL,
    fechaEmision TEXT NOT NULL,
    fechaVencimiento TEXT NOT NULL,
    estado TEXT NOT NULL,
    scoreRiesgo INTEGER NOT NULL,
    tasaAnual REAL NOT NULL,
    diasDescuento INTEGER NOT NULL,
    montoNeto REAL NOT NULL,
    moneda TEXT NOT NULL,
    revisionManualL2 INTEGER,
    bloqueadaAntifraude INTEGER,
    fechaFinanciacion TEXT,
    cae TEXT
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS notificaciones (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    facturaId TEXT NOT NULL,
    tipo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    creadoEn TEXT NOT NULL,
    visto INTEGER NOT NULL DEFAULT 0
  );
`);

// Migración: bases creadas antes de que existiera "fechaFinanciacion" no tienen
// la columna todavía. La agregamos y le damos un valor razonable a lo que ya
// estaba financiado o cobrado, para no perder la fecha de descuento de datos reales.
const columnasFacturas = db.prepare("PRAGMA table_info(facturas)").all() as { name: string }[];
if (!columnasFacturas.some((c) => c.name === "fechaFinanciacion")) {
  db.exec("ALTER TABLE facturas ADD COLUMN fechaFinanciacion TEXT");
  db.prepare(`
    UPDATE facturas SET fechaFinanciacion = date(fechaEmision, '+2 days')
    WHERE estado IN ('financiada', 'cobrada') AND fechaFinanciacion IS NULL
  `).run();
}

// Migración: política de tasa base por pagador (Límites y política, "Fondos S.A.").
const columnasEmpresas = db.prepare("PRAGMA table_info(empresas)").all() as { name: string }[];
if (!columnasEmpresas.some((c) => c.name === "tasaBase")) {
  db.exec("ALTER TABLE empresas ADD COLUMN tasaBase REAL");
}

// Migración: CAE (carga por archivo / import ARCA en "Cargar factura").
if (!columnasFacturas.some((c) => c.name === "cae")) {
  db.exec("ALTER TABLE facturas ADD COLUMN cae TEXT");
}

// ---------------------------------------------------------------------------
// Siembra inicial — solo corre la primera vez que se crea el archivo de base
// de datos. Después de eso, todo lo que ve la demo es lo que quedó guardado
// realmente (crear/editar/borrar sobrevive a un reinicio del servidor).
// ---------------------------------------------------------------------------

function costo(montoBruto: number, tasaAnual: number, dias: number): number {
  return Math.round(montoBruto - montoBruto * (tasaAnual / 100) * (dias / 365));
}

// La demo asume que el fondeo se aprueba a los pocos días de emitida la factura
// (tiempo de conformidad + validación), no el mismo día.
function addDias(fechaIso: string, dias: number): string {
  const d = new Date(`${fechaIso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function ensureSeeded() {
  const row = db.prepare("SELECT COUNT(*) as n FROM empresas").get() as { n: number };
  if (row.n > 0) return;

  const insertEmpresa = db.prepare(`
    INSERT INTO empresas (id, nombre, cuit, tipo, sector, logoIniciales, lifecyclePagador, ejecutivo,
      limiteExposicion, watchlist, bloqueadoCesiones, lifecycleProveedor, kyb, alertas, bloqueadoAntifraude, pagadoresIds)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const empresasSeed = [
    { id: "banco-piano", nombre: "Fondos S.A.", cuit: "30-50001199-3", tipo: "banco", logoIniciales: "FS" },
    {
      id: "pagador-agroexport", nombre: "YPF S.A.", cuit: "30-52345671-8", tipo: "pagador",
      sector: "Energía", logoIniciales: "YP", lifecyclePagador: "activo", ejecutivo: "Sofía Larrea", limiteExposicion: 80_000_000,
    },
    {
      id: "pagador-bragado", nombre: "Central Bragado Energía S.A.", cuit: "30-68912345-0", tipo: "pagador",
      sector: "Energía", logoIniciales: "CB", lifecyclePagador: "activo", ejecutivo: "Martín Prieto", limiteExposicion: 25_000_000,
    },
    {
      id: "pagador-valemin", nombre: "Vale Minería Argentina S.A.", cuit: "30-71987654-3", tipo: "pagador",
      sector: "Minería", logoIniciales: "VM", lifecyclePagador: "onboarding", ejecutivo: "Sofía Larrea", limiteExposicion: 15_000_000,
    },
    {
      id: "pagador-ternium", nombre: "Ternium Siderurgia S.A.", cuit: "30-69123456-7", tipo: "pagador",
      sector: "Industria pesada", logoIniciales: "TS", lifecyclePagador: "pausado", ejecutivo: "Diego Ferrari",
      limiteExposicion: 30_000_000, watchlist: true,
    },
    {
      id: "proveedor-metalurgica", nombre: "Errázuriz S.A.", cuit: "30-70987654-1", tipo: "proveedor",
      sector: "Autopartes e insumos industriales", logoIniciales: "EZ", lifecycleProveedor: "activo", kyb: "L2",
    },
    {
      id: "proveedor-litoral", nombre: "Transportes del Litoral S.A.", cuit: "30-70456789-5", tipo: "proveedor",
      sector: "Logística", logoIniciales: "TL", lifecycleProveedor: "activo", kyb: "L2",
    },
    {
      id: "proveedor-agropampeanos", nombre: "Insumos Agro Pampeanos SRL", cuit: "30-71345678-9", tipo: "proveedor",
      sector: "Insumos agropecuarios", logoIniciales: "IA", lifecycleProveedor: "activo", kyb: "L3",
    },
    {
      id: "proveedor-servitech", nombre: "ServiTech Industrial S.A.", cuit: "30-71765432-6", tipo: "proveedor",
      sector: "Servicios industriales", logoIniciales: "ST", lifecycleProveedor: "kyb_pendiente", kyb: "L1",
      pagadoresIds: ["pagador-ternium"], alertas: ["KYB nivel 1 — falta validar beneficiarios finales"],
    },
    {
      id: "proveedor-repuestossur", nombre: "Repuestos del Sur S.A.", cuit: "30-70234567-8", tipo: "proveedor",
      sector: "Autopartes e insumos industriales", logoIniciales: "RS", lifecycleProveedor: "dormant", kyb: "L2",
      pagadoresIds: ["pagador-agroexport"], alertas: ["Sin actividad hace 45+ días"],
    },
    {
      id: "proveedor-construcciones-australes", nombre: "Construcciones Australes SRL", cuit: "30-71654321-0", tipo: "proveedor",
      sector: "Construcción", logoIniciales: "CA", lifecycleProveedor: "bloqueado", kyb: "L2",
      bloqueadoAntifraude: true, alertas: ["Bloqueado por anti-fraude — factura con inconsistencias documentales"],
    },
  ];

  for (const e of empresasSeed) {
    insertEmpresa.run(
      e.id, e.nombre, e.cuit, e.tipo, e.sector ?? null, e.logoIniciales,
      e.lifecyclePagador ?? null, e.ejecutivo ?? null, e.limiteExposicion ?? null,
      e.watchlist ? 1 : 0, 0,
      e.lifecycleProveedor ?? null, e.kyb ?? null,
      e.alertas ? JSON.stringify(e.alertas) : null,
      e.bloqueadoAntifraude ? 1 : 0,
      e.pagadoresIds ? JSON.stringify(e.pagadoresIds) : null
    );
  }

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, passwordHash, passwordSalt, role, nombre, cargo, empresaId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const usersSeed = [
    { id: "u-banco-1", email: "mesa@fondossa.com.ar", role: "banco", nombre: "Lucía Fernández", cargo: "Mesa de Fondeo — Fondos S.A.", empresaId: "banco-piano" },
    { id: "u-pagador-1", email: "finanzas@ypf.com.ar", role: "pagador", nombre: "Martín Suárez", cargo: "Gerente de Finanzas", empresaId: "pagador-agroexport" },
    { id: "u-proveedor-1", email: "pagos@errazuriz.com.ar", role: "proveedor", nombre: "Carla Gómez", cargo: "Administración y Cobranzas", empresaId: "proveedor-metalurgica" },
  ];
  for (const u of usersSeed) {
    const { hash, salt } = hashPassword("demo1234");
    insertUser.run(u.id, u.email, hash, salt, u.role, u.nombre, u.cargo, u.empresaId);
  }

  const insertFactura = db.prepare(`
    INSERT INTO facturas (id, numero, pagadorId, proveedorId, montoBruto, fechaEmision, fechaVencimiento,
      estado, scoreRiesgo, tasaAnual, diasDescuento, montoNeto, moneda, revisionManualL2, bloqueadaAntifraude, fechaFinanciacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const facturasSeed: [string, string, string, string, number, string, string, string, number, number, number, string, boolean?, boolean?][] = [
    ["fac-0001", "FC-A-00041892", "pagador-agroexport", "proveedor-metalurgica", 18_500_000, "2026-07-20", "2026-09-18", "pendiente_fondeo", 91, 46.3, 58, "ARS"],
    ["fac-0002", "FC-A-00041893", "pagador-agroexport", "proveedor-metalurgica", 7_200_000, "2026-07-28", "2026-09-05", "elegible", 88, 46.3, 39, "ARS"],
    ["fac-0003", "FC-A-00041899", "pagador-agroexport", "proveedor-metalurgica", 3_950_000, "2026-08-01", "2026-08-30", "validada", 84, 47.1, 29, "ARS"],
    ["fac-0004", "FC-A-00041904", "pagador-agroexport", "proveedor-metalurgica", 12_000_000, "2026-08-05", "2026-08-20", "pendiente_validacion", 79, 48.0, 15, "ARS"],
    ["fac-0005", "FC-A-00041790", "pagador-agroexport", "proveedor-metalurgica", 9_400_000, "2026-06-30", "2026-08-01", "financiada", 90, 46.3, 32, "ARS"],
    ["fac-0006", "FC-A-00041650", "pagador-agroexport", "proveedor-metalurgica", 5_100_000, "2026-06-01", "2026-07-10", "cobrada", 93, 45.8, 39, "ARS"],
    ["fac-0007", "FC-Y-00019921", "pagador-agroexport", "proveedor-litoral", 22_000_000, "2026-07-16", "2026-08-25", "financiada", 89, 45.9, 40, "ARS"],
    ["fac-0008", "FC-Y-00019855", "pagador-agroexport", "proveedor-litoral", 14_500_000, "2026-06-15", "2026-07-15", "cobrada", 90, 45.5, 30, "ARS"],
    ["fac-0009", "FC-Y-00019978", "pagador-agroexport", "proveedor-repuestossur", 9_800_000, "2026-08-06", "2026-09-10", "elegible", 82, 47.0, 35, "ARS"],
    ["fac-0010", "FC-B-00003341", "pagador-bragado", "proveedor-litoral", 17_300_000, "2026-07-18", "2026-09-01", "financiada", 87, 46.8, 45, "ARS"],
    ["fac-0011", "FC-B-00003367", "pagador-bragado", "proveedor-construcciones-australes", 6_200_000, "2026-07-29", "2026-08-18", "pendiente_validacion", 65, 49.5, 20, "ARS", false, true],
    ["fac-0012", "FC-V-00000512", "pagador-valemin", "proveedor-agropampeanos", 11_000_000, "2026-08-03", "2026-08-28", "validada", 75, 48.2, 25, "ARS"],
    ["fac-0013", "FC-A-00041911", "pagador-agroexport", "proveedor-agropampeanos", 8_600_000, "2026-08-11", "2026-09-12", "elegible", 86, 46.3, 32, "ARS"],
    ["fac-0014", "FC-A-00041830", "pagador-agroexport", "proveedor-agropampeanos", 4_300_000, "2026-07-25", "2026-08-22", "financiada", 88, 46.3, 28, "ARS"],
    ["fac-0015", "FC-T-00000198", "pagador-ternium", "proveedor-servitech", 3_100_000, "2026-08-01", "2026-08-19", "pendiente_validacion", 58, 51.0, 18, "ARS", true, false],
    ["fac-0016", "FC-Y-00020044", "pagador-agroexport", "proveedor-litoral", 26_400_000, "2026-08-09", "2026-09-20", "pendiente_fondeo", 92, 45.2, 42, "ARS"],
    ["fac-0017", "FC-B-00003298", "pagador-bragado", "proveedor-litoral", 9_900_000, "2026-06-19", "2026-07-22", "cobrada", 91, 46.0, 33, "ARS"],
    ["fac-0018", "FC-V-00000544", "pagador-valemin", "proveedor-agropampeanos", 8_500_000, "2026-07-22", "2026-08-26", "financiada", 78, 47.5, 26, "ARS"],
    ["fac-0019", "FC-T-00000175", "pagador-ternium", "proveedor-servitech", 4_700_000, "2026-06-25", "2026-07-18", "cobrada", 74, 49.0, 22, "ARS"],
  ];

  for (const [id, numero, pagadorId, proveedorId, montoBruto, fechaEmision, fechaVencimiento, estado, scoreRiesgo, tasaAnual, diasDescuento, moneda, revisionManualL2, bloqueadaAntifraude] of facturasSeed) {
    const fechaFinanciacion = ["financiada", "cobrada"].includes(estado) ? addDias(fechaEmision, 2) : null;
    insertFactura.run(
      id, numero, pagadorId, proveedorId, montoBruto, fechaEmision, fechaVencimiento, estado,
      scoreRiesgo, tasaAnual, diasDescuento, costo(montoBruto, tasaAnual, diasDescuento), moneda,
      revisionManualL2 ? 1 : 0, bloqueadaAntifraude ? 1 : 0, fechaFinanciacion
    );
  }
}
