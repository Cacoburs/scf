import type { Factura, Notificacion, User } from "../lib/types.js";
import { dashboardShell, money, formatDate, estadoPill, esc, teaDesde } from "./layout.js";
import { getEmpresa } from "../lib/data.js";

export function proveedorDashboard(opts: {
  user: User;
  facturas: Factura[];
  toast?: string;
  facturasNuevas?: Set<string>;
  acreditaciones?: Notificacion[];
  busqueda?: string;
}): string {
  const facturasNuevas = opts.facturasNuevas ?? new Set<string>();
  const acreditaciones = opts.acreditaciones ?? [];
  let facturasFiltradas = opts.facturas;
  if (opts.busqueda) {
    const q = opts.busqueda.trim().toLowerCase();
    facturasFiltradas = facturasFiltradas.filter(
      (f) => f.numero.toLowerCase().includes(q) || (getEmpresa(f.pagadorId)?.cuit ?? "").toLowerCase().includes(q)
    );
  }
  const elegibles = facturasFiltradas.filter((f) => f.estado === "elegible");
  const enTramite = facturasFiltradas.filter((f) => f.estado === "pendiente_fondeo");
  const cobradasOFinanciadas = opts.facturas.filter((f) =>
    ["financiada", "cobrada"].includes(f.estado)
  );
  const noElegiblesAun = opts.facturas.filter((f) =>
    ["pendiente_validacion", "validada"].includes(f.estado)
  );

  const totalAnticipableHoy = elegibles.reduce((acc, f) => acc + f.montoNeto, 0);

  const filaElegible = (f: Factura) => {
    const costo = f.montoBruto - f.montoNeto;
    const tea = teaDesde(f.tasaAnual);
    const esNueva = facturasNuevas.has(f.id);
    return `
      <tr class="${esNueva ? "row-nuevo" : ""}">
        <td class="mono">${esc(f.numero)}${esNueva ? '<span class="chip-nuevo">Nuevo</span>' : ""}</td>
        <td>${formatDate(f.fechaVencimiento)}</td>
        <td class="num">${money(f.montoBruto, f.moneda)}</td>
        <td class="num" style="color:var(--teal-600);font-weight:700;">${money(f.montoNeto, f.moneda)}</td>
        <td class="num">${money(costo, f.moneda)}</td>
        <td class="num">${tea.toFixed(1)}%</td>
        <td>
          <form method="post" action="/proveedor/facturas/${f.id}/adelantar">
            <button class="mini-btn primary" type="submit">Adelantar</button>
          </form>
        </td>
      </tr>`;
  };

  const filaSimple = (f: Factura) => `
      <tr>
        <td class="mono">${esc(f.numero)}</td>
        <td>${formatDate(f.fechaVencimiento)}</td>
        <td class="num">${money(f.montoBruto, f.moneda)}</td>
        <td>${estadoPill(f.estado)}</td>
      </tr>`;

  const bannerAcreditacion =
    acreditaciones.length === 0
      ? ""
      : `
    <div class="acreditacion-banner">
      <div class="acreditacion-icon">$</div>
      <div>
        <div class="acreditacion-title">${
          acreditaciones.length === 1 ? "¡Tenés un cobro nuevo!" : `¡Tenés ${acreditaciones.length} cobros nuevos!`
        }</div>
        ${acreditaciones.map((n) => `<div class="acreditacion-item">${esc(n.mensaje)}</div>`).join("")}
      </div>
    </div>`;

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${esc(opts.toast)}</div>` : ""}
    ${bannerAcreditacion}

    <div class="hero-liquidity">
      <div>
        <div class="label">Podés cobrar hoy</div>
        <div class="amount">${money(totalAnticipableHoy)} <small>de ${elegibles.length} facturas elegibles</small></div>
      </div>
      <a href="#elegibles" class="mini-btn" style="background:var(--teal-500);color:var(--navy-950);border-color:var(--teal-500);font-size:13px;padding:9px 16px;">Ver facturas elegibles →</a>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">En trámite de fondeo</div>
        <div class="value">${enTramite.length}</div>
        <div class="delta delta-flat">esperando aprobación de Fondos S.A.</div>
      </div>
      <div class="kpi-card">
        <div class="label">Ya cobradas / financiadas</div>
        <div class="value">${cobradasOFinanciadas.length}</div>
        <div class="delta delta-up">ciclo completo</div>
      </div>
      <div class="kpi-card">
        <div class="label">Sin conformidad aún</div>
        <div class="value">${noElegiblesAun.length}</div>
        <div class="delta delta-flat">esperando al pagador</div>
      </div>
      <div class="kpi-card">
        <div class="label">Anticipo promedio</div>
        <div class="value">${elegibles.length > 0 ? Math.round((totalAnticipableHoy / elegibles.reduce((a, f) => a + f.montoBruto, 0)) * 100) : 0}%</div>
        <div class="delta delta-flat">sobre valor nominal</div>
      </div>
    </div>

    <form method="get" action="/proveedor" class="toolbar">
      <input type="search" name="q" class="text-input" placeholder="Buscar por N° de factura o CUIT del pagador" value="${esc(opts.busqueda)}" />
      <button class="mini-btn" type="submit">Buscar</button>
      ${opts.busqueda ? `<a class="mini-btn" href="/proveedor">Limpiar</a>` : ""}
    </form>

    <div class="panel" id="elegibles">
      <div class="panel-header">
        <div>
          <h2>Facturas elegibles para anticipo</h2>
          <p>Ya tienen la conformidad de YPF. Elegí cuáles descontar hoy.</p>
        </div>
      </div>
      ${
        elegibles.length === 0
          ? `<div class="empty-note">${opts.busqueda ? "No hay facturas elegibles que coincidan con la búsqueda." : "No tenés facturas elegibles en este momento."}</div>`
          : `<table>
        <thead><tr>
          <th>Factura</th><th>Vencimiento</th><th class="num">Bruto</th><th class="num">Neto hoy</th>
          <th class="num">Costo</th><th class="num">TEA</th><th>Acción</th>
        </tr></thead>
        <tbody>${elegibles.map(filaElegible).join("")}</tbody>
      </table>`
      }
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>En trámite de fondeo</h2>
          <p>Ya pediste el anticipo — esperando la aprobación de Fondos S.A..</p>
        </div>
      </div>
      ${
        enTramite.length === 0
          ? `<div class="empty-note">No tenés anticipos en trámite.</div>`
          : `<table>
        <thead><tr><th>Factura</th><th>Vencimiento</th><th class="num">Bruto</th><th>Estado</th></tr></thead>
        <tbody>${enTramite.map(filaSimple).join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      Vista de demostración — Errázuriz S.A.. El anticipo se acredita en la cuenta registrada del
      proveedor una vez que Fondos S.A. aprueba el fondeo. Datos y tasas simulados.
    </p>
  `;

  return dashboardShell({
    role: "proveedor",
    user: opts.user,
    empresaNombre: "Errázuriz S.A.",
    activeHref: "/proveedor",
    pageTitle: "Inicio — liquidez",
    content,
  });
}
