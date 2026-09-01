import type { Factura, User } from "../lib/types.js";
import { dashboardShell, money, formatDate, estadoPill, esc } from "./layout.js";
import { getEmpresa } from "../lib/data.js";

export function proveedorHistorialPage(opts: { user: User; facturas: Factura[] }): string {
  const cerradas = opts.facturas
    .filter((f) => ["cobrada", "rechazada"].includes(f.estado))
    .sort((a, b) => (b.fechaFinanciacion ?? b.fechaVencimiento).localeCompare(a.fechaFinanciacion ?? a.fechaVencimiento));

  const cobradas = cerradas.filter((f) => f.estado === "cobrada");
  const rechazadas = cerradas.filter((f) => f.estado === "rechazada");
  const totalCobrado = cobradas.reduce((acc, f) => acc + f.montoNeto, 0);
  const tasaPromedio = cobradas.length > 0 ? cobradas.reduce((acc, f) => acc + f.tasaAnual, 0) / cobradas.length : 0;

  const fila = (f: Factura) => {
    const pagador = getEmpresa(f.pagadorId);
    return `
      <tr>
        <td class="mono">${esc(f.numero)}</td>
        <td>${esc(pagador?.nombre) || "—"}</td>
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
        <div class="delta delta-up">${cobradas.length} operaciones cerradas con cobro</div>
      </div>
      <div class="kpi-card">
        <div class="label">Tasa efectiva promedio</div>
        <div class="value">${tasaPromedio.toFixed(1)}%</div>
        <div class="delta delta-flat">sobre operaciones cobradas</div>
      </div>
      <div class="kpi-card">
        <div class="label">Rechazadas</div>
        <div class="value">${rechazadas.length}</div>
        <div class="delta delta-flat">no llegaron a cobrarse</div>
      </div>
      <div class="kpi-card">
        <div class="label">Operaciones cerradas</div>
        <div class="value">${cerradas.length}</div>
        <div class="delta delta-flat">total histórico</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Historial de operaciones</h2>
          <p>Cada factura que ya recorrió el circuito completo, con quién y en qué terminó.</p>
        </div>
      </div>
      ${
        cerradas.length === 0
          ? `<div class="empty-note">Todavía no tenés operaciones cerradas — van a aparecer acá una vez que se cobren o se rechacen.</div>`
          : `<table>
        <thead><tr>
          <th>Factura</th><th>Pagador</th><th>Fecha de descuento</th>
          <th class="num">Bruto</th><th class="num">Tasa (TNA)</th><th class="num">Monto transferido</th><th>Cierre</th>
        </tr></thead>
        <tbody>${cerradas.map(fila).join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      Vista de demostración — Errázuriz S.A. Incluye toda factura que llegó a un estado final (cobrada o
      rechazada); lo que sigue en curso se ve en "Facturas elegibles" y en la vista general.
    </p>
  `;

  return dashboardShell({
    role: "proveedor",
    user: opts.user,
    empresaNombre: "Errázuriz S.A.",
    activeHref: "/proveedor/historial",
    pageTitle: "Historial",
    content,
  });
}
