import type { ComprobanteArca } from "../lib/integraciones/index.js";
import type { Empresa, User } from "../lib/types.js";
import { dashboardShell, esc, formatDate, money } from "./layout.js";

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
  toast?: string;
  values?: {
    proveedorId?: string;
    numero?: string;
    montoBruto?: string;
    fechaEmision?: string;
    fechaVencimiento?: string;
    cae?: string;
  };
  notaExtraccion?: string;
  cuitArcaBuscado?: string;
  errorArca?: string;
  resultadosArca?: ComprobanteArca[];
  proveedorArca?: Empresa;
}): string {
  const v = opts.values ?? {};
  const sinProveedores = opts.proveedoresHabilitados.length === 0;

  const opcionesProveedor = opts.proveedoresHabilitados
    .map((p) => `<option value="${esc(p.id)}" ${v.proveedorId === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`)
    .join("");

  const filaArca = (c: ComprobanteArca) => `
      <tr>
        <td><input type="checkbox" name="seleccionadas" value="${esc(c.numero)}" checked /></td>
        <td class="mono">${esc(c.numero)}</td>
        <td>${formatDate(c.fechaEmision)}</td>
        <td>${formatDate(c.fechaVencimiento)}</td>
        <td class="num">${money(c.montoBruto)}</td>
        <td class="mono">${esc(c.cae)}</td>
      </tr>`;

  const content = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Cargar factura</h2>
          <p>Entra directo a tu cola de conformidad — no hace falta nada más para que el proveedor la vea después.</p>
        </div>
      </div>
      ${opts.toast ? `<div class="toast-banner show" style="margin:0 20px 16px;">${esc(opts.toast)}</div>` : ""}
      ${opts.error ? `<div class="error-box" style="margin:20px 20px 0;">${esc(opts.error)}</div>` : ""}
      ${opts.notaExtraccion ? `<div class="empty-note" style="margin:20px 20px 0;">${esc(opts.notaExtraccion)}</div>` : ""}
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
          <div>
            <label for="cae">CAE</label>
            <input class="text-input" id="cae" name="cae" placeholder="Sin detectar — opcional" value="${esc(v.cae)}" />
          </div>
          <div>
            <label for="archivo">Cargar desde archivo (PDF o foto)</label>
            <input class="text-input" id="archivo" name="archivo" type="file" accept=".pdf,.jpg,.jpeg,.png" />
          </div>
        </div>
        <div class="form-actions">
          <button class="mini-btn" type="submit" formaction="/pagador/facturas/nueva/extraer" formenctype="multipart/form-data">Extraer datos del archivo</button>
          <button class="mini-btn primary" type="submit">Cargar factura</button>
          <a class="mini-btn" href="/pagador/facturas">Cancelar</a>
        </div>
      </form>`
      }
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Buscar en ARCA</h2>
          <p>Traé los comprobantes que un proveedor tuyo ya emitió, en vez de cargarlos uno por uno.</p>
        </div>
      </div>
      <form method="get" action="/pagador/facturas/nueva" class="toolbar">
        <input type="text" name="cuitArca" class="text-input" placeholder="CUIT del proveedor, ej. 30-70987654-1" value="${esc(opts.cuitArcaBuscado)}" />
        <button class="mini-btn" type="submit">Buscar en ARCA</button>
      </form>
      ${opts.errorArca ? `<div class="error-box" style="margin:0 20px 20px;">${esc(opts.errorArca)}</div>` : ""}
      ${
        opts.resultadosArca && opts.resultadosArca.length === 0
          ? `<div class="empty-note" style="margin:0 20px 20px;">Ya importaste todos los comprobantes disponibles para el CUIT ${esc(opts.cuitArcaBuscado)}.</div>`
          : ""
      }
      ${
        opts.resultadosArca && opts.resultadosArca.length > 0
          ? `
        ${
          opts.proveedorArca
            ? `<div class="empty-note" style="margin:0 20px 16px;">Estos comprobantes se importarían a nombre de <strong>${esc(opts.proveedorArca.nombre)}</strong>.</div>`
            : `<div class="error-box" style="margin:0 20px 16px;">El CUIT ${esc(opts.cuitArcaBuscado)} no corresponde a ningún proveedor habilitado en tu cadena — invitalo primero desde <a href="/pagador/proveedores" style="color:inherit;font-weight:600;">Proveedores</a> para poder importar sus comprobantes.</div>`
        }
        <form method="post" action="/pagador/facturas/nueva/arca-importar">
          <input type="hidden" name="cuitArca" value="${esc(opts.cuitArcaBuscado)}" />
          <table>
            <thead><tr>
              <th></th><th>Factura</th><th>Emisión</th><th>Vencimiento</th><th class="num">Bruto</th><th>CAE</th>
            </tr></thead>
            <tbody>${opts.resultadosArca.map(filaArca).join("")}</tbody>
          </table>
          <div class="form-actions">
            <button class="mini-btn primary" type="submit" name="modo" value="seleccionadas" ${opts.proveedorArca ? "" : "disabled"}>Agregar seleccionadas</button>
            <button class="mini-btn" type="submit" name="modo" value="todas" ${opts.proveedorArca ? "" : "disabled"}>Agregar todas las facturas de este CUIT</button>
          </div>
        </form>`
          : ""
      }
    </div>

    <p class="footnote">
      La tasa y el score de riesgo se calculan solos a partir del historial de tu empresa con la plataforma —
      no hace falta que los cargues vos. "Extraer datos del archivo" y "Buscar en ARCA" son simulados en esta
      versión (no hay OCR ni conexión real a ARCA todavía) — revisá siempre los valores antes de confirmar.
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
