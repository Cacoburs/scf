import type { Factura, User } from "../lib/types.js";
import { dashboardShell, money, formatDate, estadoPill, esc } from "./layout.js";
import { getEmpresa } from "../lib/data.js";

export function pagadorFacturasPage(opts: { user: User; facturas: Factura[]; toast?: string; busqueda?: string }): string {
  let lista = [...opts.facturas].sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
  if (opts.busqueda) {
    const q = opts.busqueda.trim().toLowerCase();
    lista = lista.filter(
      (f) => f.numero.toLowerCase().includes(q) || (getEmpresa(f.proveedorId)?.cuit ?? "").toLowerCase().includes(q)
    );
  }

  const fila = (f: Factura) => {
    const proveedor = getEmpresa(f.proveedorId);
    return `
      <tr>
        <td class="mono">${esc(f.numero)}</td>
        <td>${esc(proveedor?.nombre) || "—"}</td>
        <td>${formatDate(f.fechaEmision)}</td>
        <td>${formatDate(f.fechaVencimiento)}</td>
        <td class="num">${money(f.montoBruto, f.moneda)}</td>
        <td>${estadoPill(f.estado)}</td>
      </tr>`;
  };

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${esc(opts.toast)}</div>` : ""}

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Mis facturas</h2>
          <p>Todas las facturas que cargaste al circuito, en cualquier estado.</p>
        </div>
        <a class="mini-btn primary" href="/pagador/facturas/nueva">+ Cargar factura</a>
      </div>
      <form method="get" action="/pagador/facturas" class="toolbar">
        <input type="search" name="q" class="text-input" placeholder="Buscar por N° de factura o CUIT del proveedor" value="${esc(opts.busqueda)}" />
        <button class="mini-btn" type="submit">Buscar</button>
        ${opts.busqueda ? `<a class="mini-btn" href="/pagador/facturas">Limpiar</a>` : ""}
      </form>
      ${
        lista.length === 0
          ? `<div class="empty-note">${
              opts.busqueda
                ? "No hay facturas que coincidan con la búsqueda."
                : 'Todavía no cargaste ninguna factura. Arrancá con "+ Cargar factura".'
            }</div>`
          : `<table>
        <thead><tr><th>Factura</th><th>Proveedor</th><th>Emisión</th><th>Vencimiento</th><th class="num">Monto</th><th>Estado</th></tr></thead>
        <tbody>${lista.map(fila).join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      Al cargar una factura nueva, entra al circuito en estado "Pendiente validación" y aparece de inmediato
      en el panel de conformidad de la vista general.
    </p>
  `;

  return dashboardShell({
    role: "pagador",
    user: opts.user,
    empresaNombre: "YPF S.A.",
    activeHref: "/pagador/facturas",
    pageTitle: "Mis facturas",
    content,
  });
}
