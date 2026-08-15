import type { Factura, User } from "../lib/types.js";
import { dashboardShell, money, formatDate, estadoPill, scoreBar } from "./layout.js";
import { getEmpresa } from "../lib/data.js";

export function bancoDashboard(opts: {
  user: User;
  facturas: Factura[];
  toast?: string;
}): string {
  const cola = opts.facturas.filter((f) => f.estado === "pendiente_fondeo");
  const elegibles = opts.facturas.filter((f) => f.estado === "elegible");
  const cartera = opts.facturas.filter((f) => f.estado === "financiada");
  const cobradas = opts.facturas.filter((f) => f.estado === "cobrada");

  const carteraActiva = cartera.reduce((acc, f) => acc + f.montoNeto, 0);
  const disponibleFondeo = cola.reduce((acc, f) => acc + f.montoNeto, 0);
  const tasaPromedio =
    opts.facturas.length > 0
      ? opts.facturas.reduce((acc, f) => acc + f.tasaAnual, 0) / opts.facturas.length
      : 0;

  const filaCola = (f: Factura) => {
    const proveedor = getEmpresa(f.proveedorId);
    const pagador = getEmpresa(f.pagadorId);
    return `
      <tr>
        <td class="mono">${f.numero}</td>
        <td>${pagador?.nombre ?? "—"}</td>
        <td>${proveedor?.nombre ?? "—"}</td>
        <td>${formatDate(f.fechaVencimiento)}</td>
        <td>${scoreBar(f.scoreRiesgo)}</td>
        <td class="num">${money(f.montoBruto, f.moneda)}</td>
        <td class="num">${money(f.montoNeto, f.moneda)}</td>
        <td>
          <div class="row-actions">
            <form method="post" action="/banco/facturas/${f.id}/aprobar">
              <button class="mini-btn primary" type="submit">Aprobar fondeo</button>
            </form>
            <form method="post" action="/banco/facturas/${f.id}/rechazar">
              <button class="mini-btn danger" type="submit">Rechazar</button>
            </form>
          </div>
        </td>
      </tr>`;
  };

  const filaCartera = (f: Factura) => {
    const proveedor = getEmpresa(f.proveedorId);
    return `
      <tr>
        <td class="mono">${f.numero}</td>
        <td>${proveedor?.nombre ?? "—"}</td>
        <td>${formatDate(f.fechaVencimiento)}</td>
        <td>${estadoPill(f.estado)}</td>
        <td class="num">${money(f.montoNeto, f.moneda)}</td>
      </tr>`;
  };

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${opts.toast}</div>` : ""}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Cartera activa financiada</div>
        <div class="value">${money(carteraActiva)}</div>
        <div class="delta delta-up">${cartera.length} operaciones vigentes</div>
      </div>
      <div class="kpi-card">
        <div class="label">Pendiente de fondeo</div>
        <div class="value">${money(disponibleFondeo)}</div>
        <div class="delta delta-flat">${cola.length} facturas en cola</div>
      </div>
      <div class="kpi-card">
        <div class="label">Tasa promedio (TNA)</div>
        <div class="value">${tasaPromedio.toFixed(1)}%</div>
        <div class="delta delta-flat">sobre cartera visible</div>
      </div>
      <div class="kpi-card">
        <div class="label">Facturas cobradas (ciclo cerrado)</div>
        <div class="value">${cobradas.length}</div>
        <div class="delta delta-up">100% tasa de cobranza</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Cola de aprobación de fondeo</h2>
          <p>Facturas que ya pasaron scoring y validación del pagador ancla — listas para tu decisión.</p>
        </div>
      </div>
      ${
        cola.length === 0
          ? `<div class="empty-note">No hay facturas esperando aprobación en este momento.</div>`
          : `<table>
        <thead><tr>
          <th>Factura</th><th>Pagador (ancla)</th><th>Proveedor</th><th>Vencimiento</th>
          <th>Score</th><th class="num">Bruto</th><th class="num">Neto a girar</th><th>Acción</th>
        </tr></thead>
        <tbody>${cola.map(filaCola).join("")}</tbody>
      </table>`
      }
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Elegibles — aún no solicitadas por el proveedor</h2>
          <p>Ya pasaron el filtro de riesgo. Aparecerán en tu cola cuando el proveedor pida el anticipo.</p>
        </div>
      </div>
      ${
        elegibles.length === 0
          ? `<div class="empty-note">No hay facturas elegibles pendientes de solicitud.</div>`
          : `<table>
        <thead><tr><th>Factura</th><th>Proveedor</th><th>Vencimiento</th><th>Score</th><th class="num">Bruto</th></tr></thead>
        <tbody>${elegibles
          .map(
            (f) => `<tr>
              <td class="mono">${f.numero}</td>
              <td>${getEmpresa(f.proveedorId)?.nombre ?? "—"}</td>
              <td>${formatDate(f.fechaVencimiento)}</td>
              <td>${scoreBar(f.scoreRiesgo)}</td>
              <td class="num">${money(f.montoBruto, f.moneda)}</td>
            </tr>`
          )
          .join("")}</tbody>
      </table>`
      }
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Cartera financiada</h2>
          <p>Operaciones desembolsadas por Fondos S.A., a la espera del cobro del deudor cedido.</p>
        </div>
      </div>
      ${
        cartera.length === 0
          ? `<div class="empty-note">Todavía no hay operaciones financiadas.</div>`
          : `<table>
        <thead><tr><th>Factura</th><th>Proveedor</th><th>Vencimiento</th><th>Estado</th><th class="num">Neto girado</th></tr></thead>
        <tbody>${cartera.map(filaCartera).join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      Vista de demostración — Fondos S.A.. Los montos, scores y tasas son datos simulados para ilustrar el
      flujo de aprobación de fondeo. Sin integración con sistemas core bancarios en esta versión.
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Fondos S.A.",
    activeHref: "/banco",
    pageTitle: "Mesa de fondeo",
    content,
  });
}
