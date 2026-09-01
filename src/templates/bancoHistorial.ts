import type { Factura, User } from "../lib/types.js";
import { dashboardShell, money, formatDate, estadoPill, esc } from "./layout.js";
import { getEmpresa } from "../lib/data.js";

export function bancoHistorialPage(opts: { user: User; facturas: Factura[] }): string {
  const cerradas = [...opts.facturas]
    .filter((f) => ["cobrada", "rechazada"].includes(f.estado))
    .sort((a, b) => (b.fechaFinanciacion ?? b.fechaVencimiento).localeCompare(a.fechaFinanciacion ?? a.fechaVencimiento));

  const cobradas = cerradas.filter((f) => f.estado === "cobrada");
  const rechazadas = cerradas.filter((f) => f.estado === "rechazada");
  const totalCobrado = cobradas.reduce((acc, f) => acc + f.montoNeto, 0);
  const tasaAprobacion = cerradas.length > 0 ? (cobradas.length / cerradas.length) * 100 : 0;

  const fila = (f: Factura) => {
    const pagador = getEmpresa(f.pagadorId);
    const proveedor = getEmpresa(f.proveedorId);
    return `
      <tr>
        <td class="mono">${esc(f.numero)}</td>
        <td>${esc(pagador?.nombre) || "—"}</td>
        <td>${esc(proveedor?.nombre) || "—"}</td>
        <td>${f.fechaFinanciacion ? formatDate(f.fechaFinanciacion) : "—"}</td>
        <td class="num">${money(f.montoBruto, f.moneda)}</td>
        <td class="num">${f.tasaAnual.toFixed(1)}%</td>
        <td class="num">${money(f.montoNeto, f.moneda)}</td>
        <td>${estadoPill(f.estado)}</td>
      </tr>`;
  };

  const content = `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Total cobrado (histórico)</div>
        <div class="value">${money(totalCobrado)}</div>
        <div class="delta delta-up">${cobradas.length} operaciones con cobro cerrado</div>
      </div>
      <div class="kpi-card">
        <div class="label">Tasa de cobranza</div>
        <div class="value">${tasaAprobacion.toFixed(0)}%</div>
        <div class="delta delta-flat">de las operaciones cerradas</div>
      </div>
      <div class="kpi-card">
        <div class="label">Rechazadas</div>
        <div class="value">${rechazadas.length}</div>
        <div class="delta delta-flat">no llegaron a fondearse o cobrarse</div>
      </div>
      <div class="kpi-card">
        <div class="label">Operaciones cerradas</div>
        <div class="value">${cerradas.length}</div>
        <div class="delta delta-flat">total histórico de la plataforma</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Historial de operaciones</h2>
          <p>Toda factura que llegó a un estado final — cobrada o rechazada — con pagador, proveedor y montos.</p>
        </div>
        <a class="mini-btn" href="/banco/historial/exportar.csv">Exportar CSV</a>
      </div>
      ${
        cerradas.length === 0
          ? `<div class="empty-note">Todavía no hay operaciones cerradas.</div>`
          : `<table>
        <thead><tr>
          <th>Factura</th><th>Pagador</th><th>Proveedor</th><th>Fecha de descuento</th>
          <th class="num">Bruto</th><th class="num">Tasa (TNA)</th><th class="num">Monto transferido</th><th>Cierre</th>
        </tr></thead>
        <tbody>${cerradas.map(fila).join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      Vista de demostración — Fondos S.A. "Cartera activa" muestra lo que todavía está en la calle (financiada,
      sin cobrar); este historial es solo lo que ya cerró de una forma u otra.
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Fondos S.A.",
    activeHref: "/banco/historial",
    pageTitle: "Historial",
    content,
  });
}
