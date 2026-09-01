import type { Empresa, User } from "../lib/types.js";
import { dashboardShell, esc } from "./layout.js";

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function masDiasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function pagadorAltaFacturaPage(opts: {
  user: User;
  proveedoresHabilitados: Empresa[];
  error?: string;
  values?: { proveedorId?: string; numero?: string; montoBruto?: string; fechaEmision?: string; fechaVencimiento?: string };
}): string {
  const v = opts.values ?? {};
  const sinProveedores = opts.proveedoresHabilitados.length === 0;

  const opcionesProveedor = opts.proveedoresHabilitados
    .map((p) => `<option value="${esc(p.id)}" ${v.proveedorId === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`)
    .join("");

  const content = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Cargar factura</h2>
          <p>Entra directo a tu cola de conformidad — no hace falta nada más para que el proveedor la vea después.</p>
        </div>
      </div>
      ${opts.error ? `<div class="error-box" style="margin:20px 20px 0;">${esc(opts.error)}</div>` : ""}
      ${
        sinProveedores
          ? `<div class="empty-note">
              Todavía no tenés ningún proveedor habilitado en tu cadena, así que no hay a quién cargarle una factura.
              Invitá uno primero desde <a href="/pagador/proveedores" style="color:var(--teal-600);font-weight:600;">Proveedores</a>.
            </div>`
          : `<form method="post" action="/pagador/facturas/nueva">
        <div class="form-grid">
          <div class="full">
            <label for="proveedorId">Proveedor</label>
            <select class="select-input" id="proveedorId" name="proveedorId" required style="width:100%;">${opcionesProveedor}</select>
          </div>
          <div>
            <label for="numero">Número de factura</label>
            <input class="text-input" id="numero" name="numero" required placeholder="Ej. FC-A-00099123" value="${esc(v.numero)}" />
          </div>
          <div>
            <label for="montoBruto">Monto bruto (ARS)</label>
            <input class="text-input" id="montoBruto" name="montoBruto" type="number" min="1" step="0.01" required placeholder="0" value="${esc(v.montoBruto)}" />
          </div>
          <div>
            <label for="fechaEmision">Fecha de emisión</label>
            <input class="text-input" id="fechaEmision" name="fechaEmision" type="date" required value="${esc(v.fechaEmision) || hoyISO()}" />
          </div>
          <div>
            <label for="fechaVencimiento">Fecha de vencimiento</label>
            <input class="text-input" id="fechaVencimiento" name="fechaVencimiento" type="date" required value="${esc(v.fechaVencimiento) || masDiasISO(30)}" />
          </div>
        </div>
        <div class="form-actions">
          <button class="mini-btn primary" type="submit">Cargar factura</button>
          <a class="mini-btn" href="/pagador/facturas">Cancelar</a>
        </div>
      </form>`
      }
    </div>

    <p class="footnote">
      La tasa y el score de riesgo se calculan solos a partir del historial de tu empresa con la plataforma —
      no hace falta que los cargues vos. Quedan visibles recién más adelante en el circuito.
    </p>
  `;

  return dashboardShell({
    role: "pagador",
    user: opts.user,
    empresaNombre: "YPF S.A.",
    activeHref: "/pagador/facturas",
    pageTitle: "Cargar factura",
    content,
  });
}
