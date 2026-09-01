import type { Factura, User } from "../lib/types.js";
import { dashboardShell, money, formatDate, estadoPill, esc } from "./layout.js";
import { getEmpresa } from "../lib/data.js";

export function pagadorHistorialPage(opts: { user: User; facturas: Factura[] }): string {
  const cerradas = opts.facturas
    .filter((f) => ["cobrada", "rechazada"].includes(f.estado))
    .sort((a, b) => (b.fechaFinanciacion ?? b.fechaVencimiento).localeCompare(a.fechaFinanciacion ?? a.fechaVencimiento));

  const cobradas = cerradas.filter((f) => f.estado === "cobrada");
  const rechazadas = cerradas.filter((f) => f.estado === "rechazada");
  const totalCerrado = cobradas.reduce((acc, f) => acc + f.montoBruto, 0);
  const proveedoresDistintos = new Set(cobradas.map((f) => f.proveedorId)).size;

  const fila = (f: Factura) => {
    const proveedor = getEmpresa(f.proveedorId);
    return `
      <tr>
        <td class="mono">${esc(f.numero)}</td>
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
        <div class="label">Monto total cerrado</div>
        <div class="value">${money(totalCerrado)}</div>
        <div class="delta delta-up">${cobradas.length} facturas cobradas por tus proveedores</div>
      </div>
      <div class="kpi-card">
        <div class="label">Proveedores atendidos</div>
        <div class="value">${proveedoresDistintos}</div>
        <div class="delta delta-flat">con al menos un cobro cerrado</div>
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
          <h2>Historial de facturas</h2>
          <p>Cada factura que ya recorrió el circuito completo, con qué proveedor y en qué terminó.</p>
        </div>
      </div>
      ${
        cerradas.length === 0
          ? `<div class="empty-note">Todavía no hay facturas cerradas — van a aparecer acá una vez que se cobren o se rechacen.</div>`
          : `<table>
        <thead><tr>
          <th>Factura</th><th>Proveedor</th><th>Fecha de descuento</th>
          <th class="num">Bruto</th><th class="num">Tasa (TNA)</th><th class="num">Monto transferido</th><th>Cierre</th>
        </tr></thead>
        <tbody>${cerradas.map(fila).join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      Vista de demostración — YPF S.A. "Monto transferido" es lo que cobró tu proveedor al descontar la factura, no lo que
      vos pagás — vos siempre pagás el bruto al vencimiento, sin costo por el descuento.
    </p>
  `;

  return dashboardShell({
    role: "pagador",
    user: opts.user,
    empresaNombre: "YPF S.A.",
    activeHref: "/pagador/historial",
    pageTitle: "Historial",
    content,
  });
}
