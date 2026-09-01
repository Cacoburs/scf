import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearSessionCookie,
  createSessionCookie,
  getSession,
  requireRole,
} from "./lib/auth.js";
import {
  actualizarEstadoFactura,
  facturas,
  facturasParaBanco,
  facturasPorPagador,
  facturasPorProveedor,
  findUserByEmail,
  verifyCredentials,
  getEmpresa,
  toggleRevisionManualL2,
  toggleBloqueadaAntifraude,
  ampliarLimitePagador,
  toggleWatchlistPagador,
  toggleBloqueoCesionesPagador,
  reasignarEjecutivoPagador,
  suspenderPagador,
  aprobarPagadorPendiente,
  crearPagador,
  subirKYBProveedor,
  toggleDormantProveedor,
  toggleBloqueoAntifraudeProveedor,
  invitarProveedor,
  recalcularScoring,
  proveedoresDePagador,
  crearFactura,
  existeNumeroFacturaParaPagador,
  crearNotificacion,
  notificacionesPendientes,
  marcarNotificacionesVistas,
} from "./lib/data.js";
import { money } from "./templates/layout.js";
import { pagosProvider, firmaDigitalProvider, kycProvider, notificacionesProvider } from "./lib/integraciones/index.js";
import { bancoMonitoreoPage } from "./templates/bancoMonitoreo.js";
import { pagadorFacturasPage } from "./templates/pagadorFacturas.js";
import { pagadorAltaFacturaPage } from "./templates/pagadorAltaFactura.js";
import { bancoHistorialPage } from "./templates/bancoHistorial.js";
import { pagadorHistorialPage } from "./templates/pagadorHistorial.js";
import { proveedorHistorialPage } from "./templates/proveedorHistorial.js";
import { landingPage } from "./templates/landing.js";
import { loginPage } from "./templates/login.js";
import { bancoDashboard } from "./templates/dashboardBanco.js";
import { pagadorDashboard } from "./templates/dashboardPagador.js";
import { proveedorDashboard } from "./templates/dashboardProveedor.js";
import { bancoFacturasPage } from "./templates/bancoFacturas.js";
import { bancoCarteraPage } from "./templates/bancoCartera.js";
import { bancoPagadoresPage } from "./templates/bancoPagadores.js";
import { bancoAltaPagadorPage } from "./templates/bancoAltaPagador.js";
import { bancoProveedoresPage } from "./templates/bancoProveedores.js";
import { bancoInvitarProveedorPage } from "./templates/bancoInvitarProveedor.js";
import { bancoScoringPage } from "./templates/bancoScoring.js";
import { stubPage } from "./templates/stub.js";
import type { Role } from "./lib/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const PORT = Number(process.env.PORT ?? 3000);

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function send(res: http.ServerResponse, status: number, html: string, extraHeaders: Record<string, string> = {}) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", ...extraHeaders });
  res.end(html);
}

function redirect(res: http.ServerResponse, location: string, setCookie?: string) {
  const headers: Record<string, string> = { Location: location };
  res.writeHead(302, setCookie ? { ...headers, "Set-Cookie": setCookie } : headers);
  res.end();
}

async function readBody(req: http.IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return new URLSearchParams(raw);
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse, urlPath: string): boolean {
  const filePath = path.join(PUBLIC_DIR, urlPath);
  if (!filePath.startsWith(PUBLIC_DIR)) return false;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function handleLoginPost(role: Role) {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const body = await readBody(req);
    const email = body.get("email") ?? "";
    const password = body.get("password") ?? "";
    const user = verifyCredentials(email, password, role);

    if (!user) {
      send(res, 401, loginPage(role, "Email o contraseña incorrectos para este portal."));
      return;
    }

    const cookie = createSessionCookie({ userId: user.id, role: user.role });
    redirect(res, `/${role}`, cookie);
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const pathname = url.pathname;
    const toast = url.searchParams.get("toast") ?? undefined;
    const method = req.method ?? "GET";

    // Static assets
    if (method === "GET" && (pathname.startsWith("/styles.css") || pathname.startsWith("/client.js"))) {
      if (serveStatic(req, res, pathname)) return;
    }

    // Landing
    if (method === "GET" && pathname === "/") {
      send(res, 200, landingPage());
      return;
    }

    // Logout
    if (method === "POST" && pathname === "/logout") {
      redirect(res, "/", clearSessionCookie());
      return;
    }

    // --- Login pages (GET) ---
    if (method === "GET" && pathname === "/banco/login") return send(res, 200, loginPage("banco"));
    if (method === "GET" && pathname === "/pagador/login") return send(res, 200, loginPage("pagador"));
    if (method === "GET" && pathname === "/proveedor/login") return send(res, 200, loginPage("proveedor"));

    // --- Login submits (POST) ---
    if (method === "POST" && pathname === "/banco/login") return handleLoginPost("banco")(req, res);
    if (method === "POST" && pathname === "/pagador/login") return handleLoginPost("pagador")(req, res);
    if (method === "POST" && pathname === "/proveedor/login") return handleLoginPost("proveedor")(req, res);

    // --- Banco portal ---
    if (pathname === "/banco" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      const facturasNuevas = new Set(notificacionesPendientes("banco", "solicitud").map((n) => n.facturaId));
      marcarNotificacionesVistas("banco");
      send(res, 200, bancoDashboard({ user, facturas: facturasParaBanco(), toast, facturasNuevas }));
      return;
    }

    const bancoAccion = pathname.match(/^\/banco\/facturas\/([\w-]+)\/(aprobar|rechazar)$/);
    if (bancoAccion && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const [, id, accion] = bancoAccion;
      const facturaAntesDeAprobar = facturas.find((f) => f.id === id);
      actualizarEstadoFactura(id, accion === "aprobar" ? "financiada" : "rechazada");
      let msg: string;
      if (accion === "aprobar" && facturaAntesDeAprobar) {
        const resultado = await pagosProvider.desembolsar(facturaAntesDeAprobar);
        msg = `Fondeo aprobado. ${resultado.mensaje}`;
        crearNotificacion({
          role: "proveedor",
          facturaId: id,
          tipo: "acreditacion",
          mensaje: `Se acreditaron ${money(facturaAntesDeAprobar.montoNeto)} sobre la factura ${facturaAntesDeAprobar.numero}.`,
        });
        const proveedor = getEmpresa(facturaAntesDeAprobar.proveedorId);
        if (proveedor) {
          await notificacionesProvider.enviar(
            `contacto@${proveedor.id}.com.ar`,
            `Tu factura ${facturaAntesDeAprobar.numero} fue aprobada`,
            `Fondos S.A. aprobó el fondeo de ${facturaAntesDeAprobar.numero}. ${resultado.mensaje}`
          );
        }
      } else {
        msg = "Factura rechazada.";
      }
      const fromExplorer = req.headers.referer?.includes("/banco/facturas");
      redirect(res, fromExplorer ? `/banco/facturas?toast=${encodeURIComponent(msg)}` : `/banco?toast=${encodeURIComponent(msg)}`);
      return;
    }

    // --- Banco · explorador maestro de facturas (OPS-02) ---
    if (pathname === "/banco/facturas" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      send(
        res,
        200,
        bancoFacturasPage({
          user,
          todas: facturas,
          estadoFiltro: url.searchParams.get("estado") ?? undefined,
          pagadorFiltro: url.searchParams.get("pagador") ?? undefined,
          page: Number(url.searchParams.get("page") ?? 1),
          toast,
        })
      );
      return;
    }

    if (pathname === "/banco/facturas/exportar.csv" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      let lista = facturas;
      const estadoFiltro = url.searchParams.get("estado");
      const pagadorFiltro = url.searchParams.get("pagador");
      if (estadoFiltro) lista = lista.filter((f) => f.estado === estadoFiltro);
      if (pagadorFiltro) lista = lista.filter((f) => f.pagadorId === pagadorFiltro);
      const header = "numero,pagador,proveedor,vencimiento,montoBruto,montoNeto,scoreRiesgo,estado\n";
      const rows = lista
        .map((f) =>
          [
            f.numero,
            getEmpresa(f.pagadorId)?.nombre ?? "",
            getEmpresa(f.proveedorId)?.nombre ?? "",
            f.fechaVencimiento,
            f.montoBruto,
            f.montoNeto,
            f.scoreRiesgo,
            f.estado,
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="facturas-mills.csv"',
      });
      res.end(header + rows + "\n");
      return;
    }

    const revisionL2 = pathname.match(/^\/banco\/facturas\/([\w-]+)\/revision-manual$/);
    if (revisionL2 && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const f = toggleRevisionManualL2(revisionL2[1]);
      const msg = f?.revisionManualL2 ? "Factura movida a revisión manual L2." : "Factura sacada de revisión manual L2.";
      redirect(res, `/banco/facturas?toast=${encodeURIComponent(msg)}`);
      return;
    }

    const bloqueoAF = pathname.match(/^\/banco\/facturas\/([\w-]+)\/bloquear-antifraude$/);
    if (bloqueoAF && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const f = toggleBloqueadaAntifraude(bloqueoAF[1]);
      const msg = f?.bloqueadaAntifraude ? "Factura bloqueada por anti-fraude." : "Bloqueo anti-fraude levantado.";
      redirect(res, `/banco/facturas?toast=${encodeURIComponent(msg)}`);
      return;
    }

    // --- Banco · cartera vigente y concentración (OPS-03) ---
    if (pathname === "/banco/cartera" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      send(res, 200, bancoCarteraPage({ user, toast }));
      return;
    }

    const ampliarLinea = pathname.match(/^\/banco\/pagadores\/([\w-]+)\/ampliar-linea$/);
    if (ampliarLinea && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      ampliarLimitePagador(ampliarLinea[1], 1.2);
      redirect(res, `/banco/cartera?toast=${encodeURIComponent("Línea ampliada un 20%.")}`);
      return;
    }

    const watchlistToggle = pathname.match(/^\/banco\/pagadores\/([\w-]+)\/watchlist$/);
    if (watchlistToggle && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const p = toggleWatchlistPagador(watchlistToggle[1]);
      const msg = p?.watchlist ? "Pagador movido a watch list." : "Pagador sacado de watch list.";
      redirect(res, `/banco/cartera?toast=${encodeURIComponent(msg)}`);
      return;
    }

    const bloqueoCesiones = pathname.match(/^\/banco\/pagadores\/([\w-]+)\/bloquear-cesiones$/);
    if (bloqueoCesiones && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const p = toggleBloqueoCesionesPagador(bloqueoCesiones[1]);
      const msg = p?.bloqueadoCesiones ? "Nuevas cesiones bloqueadas para este pagador." : "Cesiones reactivadas.";
      redirect(res, `/banco/cartera?toast=${encodeURIComponent(msg)}`);
      return;
    }

    // --- Banco · CRM de pagadores ancla (OPS-04 / OPS-05) ---
    if (pathname === "/banco/pagadores" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      send(res, 200, bancoPagadoresPage({ user, toast }));
      return;
    }

    if (pathname === "/banco/pagadores/nuevo" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      send(res, 200, bancoAltaPagadorPage({ user }));
      return;
    }

    if (pathname === "/banco/pagadores/nuevo" && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const body = await readBody(req);
      const nombre = (body.get("nombre") ?? "").trim();
      const cuit = (body.get("cuit") ?? "").trim();
      const sector = (body.get("sector") ?? "").trim();
      const ejecutivo = (body.get("ejecutivo") ?? "").trim();
      const limiteRaw = body.get("limite") ?? "";
      const limiteExposicion = Number(limiteRaw);
      const proponerA4Ojos = body.get("modo") === "4ojos";

      const values = { nombre, cuit, sector, ejecutivo, limite: limiteRaw };
      const user = findUserByEmail("mesa@fondossa.com.ar")!;

      if (!nombre || !cuit || !sector || !ejecutivo) {
        send(res, 400, bancoAltaPagadorPage({ user, values, error: "Completá todos los campos antes de guardar." }));
        return;
      }
      if (!Number.isFinite(limiteExposicion) || limiteExposicion < 1_000_000) {
        send(res, 400, bancoAltaPagadorPage({ user, values, error: "El límite de exposición tiene que ser un número válido de al menos $1.000.000." }));
        return;
      }

      crearPagador({ nombre, cuit, sector, ejecutivo, limiteExposicion, proponerA4Ojos });
      const msg = proponerA4Ojos
        ? `${nombre} propuesto a 4-eyes. Queda pendiente hasta la aprobación de un segundo admin.`
        : `${nombre} guardado como borrador.`;
      redirect(res, `/banco/pagadores?toast=${encodeURIComponent(msg)}`);
      return;
    }

    const qbrPagador = pathname.match(/^\/banco\/pagadores\/([\w-]+)\/qbr$/);
    if (qbrPagador && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      redirect(res, `/banco/pagadores?toast=${encodeURIComponent("Review / QBR programado.")}`);
      return;
    }

    const ejecutivoPagador = pathname.match(/^\/banco\/pagadores\/([\w-]+)\/ejecutivo$/);
    if (ejecutivoPagador && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const body = await readBody(req);
      reasignarEjecutivoPagador(ejecutivoPagador[1], body.get("ejecutivo") ?? "");
      redirect(res, `/banco/pagadores?toast=${encodeURIComponent("Ejecutivo reasignado.")}`);
      return;
    }

    const suspenderPagadorMatch = pathname.match(/^\/banco\/pagadores\/([\w-]+)\/suspender$/);
    if (suspenderPagadorMatch && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const p = suspenderPagador(suspenderPagadorMatch[1]);
      const msg = p?.lifecyclePagador === "suspendido" ? "Pagador suspendido." : "Pagador reactivado.";
      redirect(res, `/banco/pagadores?toast=${encodeURIComponent(msg)}`);
      return;
    }

    const aprobarAltaMatch = pathname.match(/^\/banco\/pagadores\/([\w-]+)\/aprobar-alta$/);
    if (aprobarAltaMatch && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      aprobarPagadorPendiente(aprobarAltaMatch[1]);
      redirect(res, `/banco/pagadores?toast=${encodeURIComponent("Alta aprobada por 4-eyes. Pagador activo.")}`);
      return;
    }

    // --- Banco · CRM de proveedores cedentes (OPS-06) ---
    if (pathname === "/banco/proveedores" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      send(res, 200, bancoProveedoresPage({ user, toast }));
      return;
    }

    if (pathname === "/banco/proveedores/invitar" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      send(res, 200, bancoInvitarProveedorPage({ user }));
      return;
    }

    if (pathname === "/banco/proveedores/invitar" && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const body = await readBody(req);
      const nombre = body.get("nombre") ?? "";
      invitarProveedor({
        nombre,
        cuit: body.get("cuit") ?? "",
        sector: body.get("sector") ?? "",
        pagadorId: body.get("pagadorId") ?? "",
      });
      redirect(res, `/banco/proveedores?toast=${encodeURIComponent(`${nombre} invitado. Queda con estado "invitado" hasta que complete su onboarding.`)}`);
      return;
    }

    const kybUpgrade = pathname.match(/^\/banco\/proveedores\/([\w-]+)\/kyb-upgrade$/);
    if (kybUpgrade && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const ORDEN_KYB = ["L1", "L2", "L3"] as const;
      const actual = getEmpresa(kybUpgrade[1])?.kyb ?? "L1";
      const objetivo = ORDEN_KYB[Math.min(ORDEN_KYB.indexOf(actual) + 1, ORDEN_KYB.length - 1)];
      const resultado = await kycProvider.solicitarVerificacion(kybUpgrade[1], objetivo);
      const p = resultado.ok ? subirKYBProveedor(kybUpgrade[1]) : undefined;
      redirect(res, `/banco/proveedores?toast=${encodeURIComponent(`${resultado.mensaje} Nivel actual: ${p?.kyb ?? actual}.`)}`);
      return;
    }

    const dormantToggle = pathname.match(/^\/banco\/proveedores\/([\w-]+)\/dormant$/);
    if (dormantToggle && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const p = toggleDormantProveedor(dormantToggle[1]);
      const msg = p?.lifecycleProveedor === "dormant" ? "Proveedor marcado como dormant." : "Proveedor reactivado.";
      redirect(res, `/banco/proveedores?toast=${encodeURIComponent(msg)}`);
      return;
    }

    const bloqueoAFProveedor = pathname.match(/^\/banco\/proveedores\/([\w-]+)\/bloquear-antifraude$/);
    if (bloqueoAFProveedor && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const p = toggleBloqueoAntifraudeProveedor(bloqueoAFProveedor[1]);
      const msg = p?.bloqueadoAntifraude ? "Proveedor bloqueado por anti-fraude." : "Bloqueo anti-fraude levantado.";
      redirect(res, `/banco/proveedores?toast=${encodeURIComponent(msg)}`);
      return;
    }

    // --- Banco · scoring vista global (OPS-07) ---
    if (pathname === "/banco/scoring" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      send(res, 200, bancoScoringPage({ user, toast }));
      return;
    }

    if (pathname === "/banco/scoring/recalcular" && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      recalcularScoring();
      redirect(res, `/banco/scoring?toast=${encodeURIComponent("Scores recalculados sobre toda la cartera.")}`);
      return;
    }

    // --- Banco · monitoreo de fondeo (dashboard de desembolsos) ---
    if (pathname === "/banco/monitoreo" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      send(res, 200, bancoMonitoreoPage({ user, toast }));
      return;
    }

    // --- Banco · historial (libro mayor de operaciones cerradas) ---
    if (pathname === "/banco/historial" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@fondossa.com.ar")!;
      send(res, 200, bancoHistorialPage({ user, facturas }));
      return;
    }

    if (pathname === "/banco/historial/exportar.csv" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const cerradas = facturas.filter((f) => ["cobrada", "rechazada"].includes(f.estado));
      const header = "numero,pagador,proveedor,vencimiento,montoBruto,montoNeto,tasaAnual,estado\n";
      const rows = cerradas
        .map((f) =>
          [
            f.numero,
            getEmpresa(f.pagadorId)?.nombre ?? "",
            getEmpresa(f.proveedorId)?.nombre ?? "",
            f.fechaVencimiento,
            f.montoBruto,
            f.montoNeto,
            f.tasaAnual,
            f.estado,
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="historial-fondos-sa.csv"',
      });
      res.end(header + rows + "\n");
      return;
    }

    // --- Pagador portal ---
    if (pathname === "/pagador" && method === "GET") {
      const session = requireRole(req, res, "pagador");
      if (!session) return;
      const user = findUserByEmail("finanzas@ypf.com.ar")!;
      send(res, 200, pagadorDashboard({ user, facturas: facturasPorPagador(user.empresaId), toast }));
      return;
    }

    const pagadorAccion = pathname.match(/^\/pagador\/facturas\/([\w-]+)\/conformar$/);
    if (pagadorAccion && method === "POST") {
      const session = requireRole(req, res, "pagador");
      if (!session) return;
      const [, id] = pagadorAccion;
      const facturaConformada = facturas.find((f) => f.id === id);
      actualizarEstadoFactura(id, "elegible");
      if (facturaConformada) {
        crearNotificacion({
          role: "proveedor",
          facturaId: id,
          tipo: "conformidad",
          mensaje: `${facturaConformada.numero} ya tiene tu conformidad — disponible para pedir el anticipo.`,
        });
      }
      redirect(res, `/pagador?toast=${encodeURIComponent("Conformidad registrada. La factura ya es elegible para el proveedor.")}`);
      return;
    }

    // --- Pagador · Mis facturas (listado + alta) ---
    if (pathname === "/pagador/facturas" && method === "GET") {
      const session = requireRole(req, res, "pagador");
      if (!session) return;
      const user = findUserByEmail("finanzas@ypf.com.ar")!;
      send(res, 200, pagadorFacturasPage({ user, facturas: facturasPorPagador(user.empresaId), toast }));
      return;
    }

    if (pathname === "/pagador/facturas/nueva" && method === "GET") {
      const session = requireRole(req, res, "pagador");
      if (!session) return;
      const user = findUserByEmail("finanzas@ypf.com.ar")!;
      send(res, 200, pagadorAltaFacturaPage({ user, proveedoresHabilitados: proveedoresDePagador(user.empresaId) }));
      return;
    }

    if (pathname === "/pagador/facturas/nueva" && method === "POST") {
      const session = requireRole(req, res, "pagador");
      if (!session) return;
      const body = await readBody(req);
      const user = findUserByEmail("finanzas@ypf.com.ar")!;
      const proveedorId = (body.get("proveedorId") ?? "").trim();
      const numero = (body.get("numero") ?? "").trim();
      const montoBrutoRaw = body.get("montoBruto") ?? "";
      const montoBruto = Number(montoBrutoRaw);
      const fechaEmision = (body.get("fechaEmision") ?? "").trim();
      const fechaVencimiento = (body.get("fechaVencimiento") ?? "").trim();

      const proveedoresHabilitados = proveedoresDePagador(user.empresaId);
      const values = { proveedorId, numero, montoBruto: montoBrutoRaw, fechaEmision, fechaVencimiento };
      const conError = (error: string) => {
        send(res, 400, pagadorAltaFacturaPage({ user, proveedoresHabilitados, values, error }));
      };

      if (!proveedoresHabilitados.some((p) => p.id === proveedorId)) {
        conError("Elegí un proveedor válido de tu cadena habilitada.");
        return;
      }
      if (!numero) {
        conError("Ingresá el número de factura.");
        return;
      }
      if (existeNumeroFacturaParaPagador(user.empresaId, numero)) {
        conError(`Ya cargaste una factura con el número "${numero}". Revisá que no esté duplicada.`);
        return;
      }
      if (!Number.isFinite(montoBruto) || montoBruto <= 0) {
        conError("El monto tiene que ser un número mayor a cero.");
        return;
      }
      if (!fechaEmision || !fechaVencimiento) {
        conError("Completá las dos fechas.");
        return;
      }
      if (fechaVencimiento <= fechaEmision) {
        conError("La fecha de vencimiento tiene que ser posterior a la fecha de emisión.");
        return;
      }

      const factura = crearFactura({ numero, pagadorId: user.empresaId, proveedorId, montoBruto, fechaEmision, fechaVencimiento });
      redirect(res, `/pagador?toast=${encodeURIComponent(`Factura ${factura.numero} cargada — ya está pendiente de tu conformidad.`)}`);
      return;
    }

    if (pathname === "/pagador/historial" && method === "GET") {
      const session = requireRole(req, res, "pagador");
      if (!session) return;
      const user = findUserByEmail("finanzas@ypf.com.ar")!;
      send(res, 200, pagadorHistorialPage({ user, facturas: facturasPorPagador(user.empresaId) }));
      return;
    }

    // --- Proveedor portal ---
    if (pathname === "/proveedor" && method === "GET") {
      const session = requireRole(req, res, "proveedor");
      if (!session) return;
      const user = findUserByEmail("pagos@errazuriz.com.ar")!;
      const facturasNuevas = new Set(notificacionesPendientes("proveedor", "conformidad").map((n) => n.facturaId));
      const acreditaciones = notificacionesPendientes("proveedor", "acreditacion");
      marcarNotificacionesVistas("proveedor");
      send(res, 200, proveedorDashboard({ user, facturas: facturasPorProveedor(user.empresaId), toast, facturasNuevas, acreditaciones }));
      return;
    }

    const proveedorAccion = pathname.match(/^\/proveedor\/facturas\/([\w-]+)\/adelantar$/);
    if (proveedorAccion && method === "POST") {
      const session = requireRole(req, res, "proveedor");
      if (!session) return;
      const [, id] = proveedorAccion;
      const factura = facturas.find((f) => f.id === id);
      const usuarioProveedor = findUserByEmail("pagos@errazuriz.com.ar");
      const firma = factura
        ? await firmaDigitalProvider.firmarCesion(factura.id, usuarioProveedor?.nombre ?? "Proveedor")
        : null;
      actualizarEstadoFactura(id, "pendiente_fondeo");
      if (factura) {
        crearNotificacion({
          role: "banco",
          facturaId: id,
          tipo: "solicitud",
          mensaje: `${factura.numero} — nueva solicitud de anticipo por ${money(factura.montoNeto)}.`,
        });
      }
      await notificacionesProvider.enviar(
        "mesa@fondossa.com.ar",
        `Nueva solicitud de anticipo — ${factura?.numero ?? id}`,
        `Un proveedor pidió el anticipo de ${factura?.numero ?? id}. ${firma?.mensaje ?? ""}`
      );
      const msgFirma = firma ? ` ${firma.mensaje}` : "";
      redirect(res, `/proveedor?toast=${encodeURIComponent(`Solicitud enviada. Fondos S.A. la revisará para el fondeo.${msgFirma}`)}`);
      return;
    }

    if (pathname === "/proveedor/historial" && method === "GET") {
      const session = requireRole(req, res, "proveedor");
      if (!session) return;
      const user = findUserByEmail("pagos@errazuriz.com.ar")!;
      send(res, 200, proveedorHistorialPage({ user, facturas: facturasPorProveedor(user.empresaId) }));
      return;
    }

    // --- Stub pages (secondary nav items not built yet in this iteration) ---
    const STUBS: Record<string, { role: Role; title: string; empresa: string; userEmail: string }> = {
      "/banco/limites": { role: "banco", title: "Límites y política", empresa: "Fondos S.A.", userEmail: "mesa@fondossa.com.ar" },
      "/pagador/proveedores": { role: "pagador", title: "Proveedores", empresa: "YPF S.A.", userEmail: "finanzas@ypf.com.ar" },
      "/pagador/equipo": { role: "pagador", title: "Equipo y reglas", empresa: "YPF S.A.", userEmail: "finanzas@ypf.com.ar" },
      "/proveedor/facturas": { role: "proveedor", title: "Facturas elegibles", empresa: "Errázuriz S.A.", userEmail: "pagos@errazuriz.com.ar" },
    };
    if (method === "GET" && STUBS[pathname]) {
      const stub = STUBS[pathname];
      const session = requireRole(req, res, stub.role);
      if (!session) return;
      const user = findUserByEmail(stub.userEmail)!;
      send(
        res,
        200,
        stubPage({ role: stub.role, user, empresaNombre: stub.empresa, activeHref: pathname, pageTitle: stub.title })
      );
      return;
    }

    // Root-redirect helper: if logged in and hitting an unknown role-root, send home
    const session = getSession(req);
    if (session && (pathname === "/banco" || pathname === "/pagador" || pathname === "/proveedor")) {
      redirect(res, "/");
      return;
    }

    send(res, 404, `<h1 style="font-family:sans-serif;padding:40px;">404 — página no encontrada</h1><p style="font-family:sans-serif;padding:0 40px;"><a href="/">Volver al inicio</a></p>`, {});
  } catch (err) {
    console.error(err);
    send(res, 500, `<h1 style="font-family:sans-serif;padding:40px;">Error interno</h1>`);
  }
});

server.listen(PORT, () => {
  console.log(`Fondos S.A. MVP corriendo en http://localhost:${PORT}`);
  console.log(`Facturas cargadas: ${facturas.length}`);
});
