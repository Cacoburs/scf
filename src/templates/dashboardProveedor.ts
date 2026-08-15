import type { Factura, User } from "../lib/types.js";
import { dashboardShell, money, formatDate, estadoPill } from "./layout.js";

export function proveedorDashboard(opts: {
  user: User;
  facturas: Factura[];
  toast?: string;
}): string {
  const elegibles = opts.facturas.filter((f) => f.estado === "elegible");
  const enTramite = opts.facturas.filter((f) => f.estado === "pendiente_fondeo");
  const cobradasOFinanciadas = opts.facturas.filter((f) =>
    ["financiada", "cobrada"].includes(f.estado)
  );
  const noElegiblesAun = opts.facturas.filter((f) =>
    ["pendiente_validacion", "validada"].includes(f.estado)
  );

  const totalAnticipableHoy = elegibles.reduce((acc, f) => acc + f.montoNeto, 0);

  const filaElegible = (f: Factura) => {
    const costo = f.montoBruto - f.montoNeto;
    const tea = (Math.pow(1 + f.tasaAnual / 100 / 365, 365) - 1) * 100;
    return `
      <tr>
        <td class="mono">${f.numero}</td>
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
        <td class="mono">${f.numero}</td>
        <td>${formatDate(f.fechaVencimiento)}</td>
        <td class="num">${money(f.montoBruto, f.moneda)}</td>
        <td>${estadoPill(f.estado)}</td>
      </tr>`;

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${opts.toast}</div>` : ""}

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
        <div class="delta delta-flat">esperando aprobación de Banco Piano</div>
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

    <div class="panel" id="elegibles">
      <div class="panel-header">
        <div>
          <h2>Facturas elegibles para anticipo</h2>
          <p>Ya tienen la conformidad de AgroExport Pampa. Elegí cuáles descontar hoy.</p>
        </div>
      </div>
      ${
        elegibles.length === 0
          ? `<div class="empty-note">No tenés facturas elegibles en este momento.</div>`
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
          <p>Ya pediste el anticipo — esperando la aprobación de Banco Piano.</p>
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
      Vista de demostración — Metalúrgica Sur SRL. El anticipo se acredita en la cuenta registrada del
      proveedor una vez que Banco Piano aprueba el fondeo. Datos y tasas simulados.
    </p>
  `;

  return dashboardShell({
    role: "proveedor",
    user: opts.user,
    empresaNombre: "Metalúrgica Sur SRL",
    activeHref: "/proveedor",
    pageTitle: "Inicio — liquidez",
    content,
  });
}
