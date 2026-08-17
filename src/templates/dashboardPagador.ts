import type { Factura, User } from "../lib/types.js";
import { dashboardShell, money, formatDate, estadoPill, esc } from "./layout.js";
import { getEmpresa } from "../lib/data.js";

export function pagadorDashboard(opts: {
  user: User;
  facturas: Factura[];
  toast?: string;
}): string {
  const pendientes = opts.facturas.filter((f) => f.estado === "pendiente_validacion");
  const enCurso = opts.facturas.filter((f) =>
    ["validada", "elegible", "pendiente_fondeo"].includes(f.estado)
  );
  const financiadas = opts.facturas.filter((f) => f.estado === "financiada");
  const totalEmitido = opts.facturas.reduce((acc, f) => acc + f.montoBruto, 0);

  const fila = (f: Factura, conAccion: boolean) => {
    const proveedor = getEmpresa(f.proveedorId);
    return `
      <tr>
        <td class="mono">${esc(f.numero)}</td>
        <td>${esc(proveedor?.nombre) || "—"}</td>
        <td>${formatDate(f.fechaEmision)}</td>
        <td>${formatDate(f.fechaVencimiento)}</td>
        <td class="num">${money(f.montoBruto, f.moneda)}</td>
        <td>${estadoPill(f.estado)}</td>
        <td>
          ${
            conAccion
              ? `<form method="post" action="/pagador/facturas/${f.id}/conformar">
                  <button class="mini-btn primary" type="submit">Dar conformidad</button>
                </form>`
              : `<span style="color:var(--ink-400);font-size:12.5px;">—</span>`
          }
        </td>
      </tr>`;
  };

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${esc(opts.toast)}</div>` : ""}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Monto total emitido al circuito</div>
        <div class="value">${money(totalEmitido)}</div>
        <div class="delta delta-flat">${opts.facturas.length} facturas cargadas</div>
      </div>
      <div class="kpi-card">
        <div class="label">Pendientes de tu conformidad</div>
        <div class="value">${pendientes.length}</div>
        <div class="delta delta-flat">requieren tu aprobación</div>
      </div>
      <div class="kpi-card">
        <div class="label">En circuito de descuento</div>
        <div class="value">${enCurso.length}</div>
        <div class="delta delta-up">avanzando hacia fondeo</div>
      </div>
      <div class="kpi-card">
        <div class="label">Financiadas por Fondos S.A.</div>
        <div class="value">${financiadas.length}</div>
        <div class="delta delta-up">proveedor ya cobró</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Pendientes de tu conformidad</h2>
          <p>Confirmá que la factura corresponde a una entrega real antes de habilitarla para descuento.</p>
        </div>
      </div>
      ${
        pendientes.length === 0
          ? `<div class="empty-note">No tenés facturas pendientes de conformidad.</div>`
          : `<table>
        <thead><tr><th>Factura</th><th>Proveedor</th><th>Emisión</th><th>Vencimiento</th><th class="num">Monto</th><th>Estado</th><th>Acción</th></tr></thead>
        <tbody>${pendientes.map((f) => fila(f, true)).join("")}</tbody>
      </table>`
      }
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>En circuito de descuento</h2>
          <p>Ya conformadas — siguiendo su recorrido de elegibilidad, solicitud y fondeo.</p>
        </div>
      </div>
      ${
        enCurso.length === 0
          ? `<div class="empty-note">No hay facturas en circuito en este momento.</div>`
          : `<table>
        <thead><tr><th>Factura</th><th>Proveedor</th><th>Emisión</th><th>Vencimiento</th><th class="num">Monto</th><th>Estado</th><th></th></tr></thead>
        <tbody>${enCurso.map((f) => fila(f, false)).join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      Vista de demostración — YPF S.A. Al dar conformidad, la factura queda habilitada para que
      el proveedor pida el anticipo; el pagador no adelanta fondos ni asume costo alguno.
    </p>
  `;

  return dashboardShell({
    role: "pagador",
    user: opts.user,
    empresaNombre: "YPF S.A.",
    activeHref: "/pagador",
    pageTitle: "Vista general",
    content,
  });
}
