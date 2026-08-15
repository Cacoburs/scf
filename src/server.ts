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
} from "./lib/data.js";
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
    const user = findUserByEmail(email);

    if (!user || user.password !== password || user.role !== role) {
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
      const user = findUserByEmail("mesa@bancopiano.com.ar")!;
      send(res, 200, bancoDashboard({ user, facturas: facturasParaBanco(), toast }));
      return;
    }

    const bancoAccion = pathname.match(/^\/banco\/facturas\/([\w-]+)\/(aprobar|rechazar)$/);
    if (bancoAccion && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const [, id, accion] = bancoAccion;
      actualizarEstadoFactura(id, accion === "aprobar" ? "financiada" : "rechazada");
      const msg = accion === "aprobar" ? "Fondeo aprobado y desembolso simulado con éxito." : "Factura rechazada.";
      const fromExplorer = req.headers.referer?.includes("/banco/facturas");
      redirect(res, fromExplorer ? `/banco/facturas?toast=${encodeURIComponent(msg)}` : `/banco?toast=${encodeURIComponent(msg)}`);
      return;
    }

    // --- Banco · explorador maestro de facturas (OPS-02) ---
    if (pathname === "/banco/facturas" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@bancopiano.com.ar")!;
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
      const user = findUserByEmail("mesa@bancopiano.com.ar")!;
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
      const user = findUserByEmail("mesa@bancopiano.com.ar")!;
      send(res, 200, bancoPagadoresPage({ user, toast }));
      return;
    }

    if (pathname === "/banco/pagadores/nuevo" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@bancopiano.com.ar")!;
      send(res, 200, bancoAltaPagadorPage({ user }));
      return;
    }

    if (pathname === "/banco/pagadores/nuevo" && method === "POST") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const body = await readBody(req);
      const nombre = body.get("nombre") ?? "";
      const cuit = body.get("cuit") ?? "";
      const sector = body.get("sector") ?? "";
      const ejecutivo = body.get("ejecutivo") ?? "";
      const limiteExposicion = Number(body.get("limite") ?? 0);
      const proponerA4Ojos = body.get("modo") === "4ojos";
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
      const user = findUserByEmail("mesa@bancopiano.com.ar")!;
      send(res, 200, bancoProveedoresPage({ user, toast }));
      return;
    }

    if (pathname === "/banco/proveedores/invitar" && method === "GET") {
      const session = requireRole(req, res, "banco");
      if (!session) return;
      const user = findUserByEmail("mesa@bancopiano.com.ar")!;
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
      const p = subirKYBProveedor(kybUpgrade[1]);
      redirect(res, `/banco/proveedores?toast=${encodeURIComponent(`Upgrade de KYB solicitado — nivel actual ${p?.kyb ?? "L1"}.`)}`);
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
      const user = findUserByEmail("mesa@bancopiano.com.ar")!;
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

    // --- Pagador portal ---
    if (pathname === "/pagador" && method === "GET") {
      const session = requireRole(req, res, "pagador");
      if (!session) return;
      const user = findUserByEmail("finanzas@agroexportpampa.com.ar")!;
      send(res, 200, pagadorDashboard({ user, facturas: facturasPorPagador(user.empresaId), toast }));
      return;
    }

    const pagadorAccion = pathname.match(/^\/pagador\/facturas\/([\w-]+)\/conformar$/);
    if (pagadorAccion && method === "POST") {
      const session = requireRole(req, res, "pagador");
      if (!session) return;
      const [, id] = pagadorAccion;
      actualizarEstadoFactura(id, "elegible");
      redirect(res, `/pagador?toast=${encodeURIComponent("Conformidad registrada. La factura ya es elegible para el proveedor.")}`);
      return;
    }

    // --- Proveedor portal ---
    if (pathname === "/proveedor" && method === "GET") {
      const session = requireRole(req, res, "proveedor");
      if (!session) return;
      const user = findUserByEmail("pagos@metalurgicasur.com.ar")!;
      send(res, 200, proveedorDashboard({ user, facturas: facturasPorProveedor(user.empresaId), toast }));
      return;
    }

    const proveedorAccion = pathname.match(/^\/proveedor\/facturas\/([\w-]+)\/adelantar$/);
    if (proveedorAccion && method === "POST") {
      const session = requireRole(req, res, "proveedor");
      if (!session) return;
      const [, id] = proveedorAccion;
      actualizarEstadoFactura(id, "pendiente_fondeo");
      redirect(res, `/proveedor?toast=${encodeURIComponent("Solicitud enviada. Banco Piano la revisará para el fondeo.")}`);
      return;
    }

    // --- Stub pages (secondary nav items not built yet in this iteration) ---
    const STUBS: Record<string, { role: Role; title: string; empresa: string; userEmail: string }> = {
      "/banco/limites": { role: "banco", title: "Límites y política", empresa: "Banco Piano", userEmail: "mesa@bancopiano.com.ar" },
      "/pagador/facturas": { role: "pagador", title: "Mis facturas", empresa: "AgroExport Pampa S.A.", userEmail: "finanzas@agroexportpampa.com.ar" },
      "/pagador/proveedores": { role: "pagador", title: "Proveedores", empresa: "AgroExport Pampa S.A.", userEmail: "finanzas@agroexportpampa.com.ar" },
      "/pagador/equipo": { role: "pagador", title: "Equipo y reglas", empresa: "AgroExport Pampa S.A.", userEmail: "finanzas@agroexportpampa.com.ar" },
      "/proveedor/facturas": { role: "proveedor", title: "Facturas elegibles", empresa: "Metalúrgica Sur SRL", userEmail: "pagos@metalurgicasur.com.ar" },
      "/proveedor/historial": { role: "proveedor", title: "Historial", empresa: "Metalúrgica Sur SRL", userEmail: "pagos@metalurgicasur.com.ar" },
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
  console.log(`Mills Capital MVP corriendo en http://localhost:${PORT}`);
  console.log(`Facturas cargadas: ${facturas.length}`);
});
