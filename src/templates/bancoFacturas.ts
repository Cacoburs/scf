import type { Factura, User } from "../lib/types.js";
import { dashboardShell, money, formatDate, estadoPill, scoreBar, esc } from "./layout.js";
import { getEmpresa, pagadores } from "../lib/data.js";

const ESTADOS_ORDEN: Factura["estado"][] = [
  "pendiente_validacion",
  "validada",
  "elegible",
  "pendiente_fondeo",
  "financiada",
  "cobrada",
  "rechazada",
];

const ESTADO_FILTER_LABEL: Record<string, string> = {
  pendiente_validacion: "Pend. validación",
  validada: "Validada",
  elegible: "Elegible",
  pendiente_fondeo: "Pend. fondeo",
  financiada: "Financiada",
  cobrada: "Cobrada",
  rechazada: "Rechazada",
};

const PAGE_SIZE = 8;

export function bancoFacturasPage(opts: {
  user: User;
  todas: Factura[];
  estadoFiltro?: string;
  pagadorFiltro?: string;
  page: number;
  toast?: string;
}): string {
  let lista = opts.todas;
  if (opts.estadoFiltro) lista = lista.filter((f) => f.estado === opts.estadoFiltro);
  if (opts.pagadorFiltro) lista = lista.filter((f) => f.pagadorId === opts.pagadorFiltro);
  lista = [...lista].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));

  const totalPaginas = Math.max(1, Math.ceil(lista.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, opts.page), totalPaginas);
  const pagina = lista.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const qs = (extra: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (opts.estadoFiltro) params.set("estado", opts.estadoFiltro);
    if (opts.pagadorFiltro) params.set("pagador", opts.pagadorFiltro);
    for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
    return `?${params.toString()}`;
  };

  const excepcion = (f: Factura) => {
    if (f.bloqueadaAntifraude) return `<span class="pill pill-rechazada"><span class="pill-dot"></span>Bloqueada AF</span>`;
    if (f.revisionManualL2) return `<span class="pill pill-pendiente_fondeo"><span class="pill-dot"></span>Revisión L2</span>`;
    return `<span style="color:var(--ink-400);">—</span>`;
  };

  const puedeOverride = (f: Factura) => !["cobrada", "rechazada"].includes(f.estado);

  const fila = (f: Factura) => {
    const pagador = getEmpresa(f.pagadorId);
    const proveedor = getEmpresa(f.proveedorId);
    return `
      <tr>
        <td class="mono">${esc(f.numero)}</td>
        <td>${esc(pagador?.nombre) || "—"}</td>
        <td>${esc(proveedor?.nombre) || "—"}</td>
        <td>${formatDate(f.fechaVencimiento)}</td>
        <td class="num">${money(f.montoBruto, f.moneda)}</td>
        <td>${scoreBar(f.scoreRiesgo)}</td>
        <td>${estadoPill(f.estado)}</td>
        <td class="num">${money(f.montoNeto, f.moneda)}</td>
        <td>${excepcion(f)}</td>
        <td>
          <div class="row-actions">
            <form method="post" action="/banco/facturas/${f.id}/revision-manual">
              <button class="mini-btn" type="submit">${f.revisionManualL2 ? "Sacar de L2" : "Manual review L2"}</button>
            </form>
            <form method="post" action="/banco/facturas/${f.id}/bloquear-antifraude">
              <button class="mini-btn danger" type="submit">${f.bloqueadaAntifraude ? "Desbloquear" : "Bloquear AF"}</button>
            </form>
            ${
              puedeOverride(f)
                ? `<form method="post" action="/banco/facturas/${f.id}/aprobar"><button class="mini-btn primary" type="submit">Aprobar</button></form>
                   <form method="post" action="/banco/facturas/${f.id}/rechazar"><button class="mini-btn danger" type="submit">Rechazar</button></form>`
                : ""
            }
          </div>
        </td>
      </tr>`;
  };

  const optionsEstado = ESTADOS_ORDEN.map(
    (e) => `<option value="${e}" ${opts.estadoFiltro === e ? "selected" : ""}>${ESTADO_FILTER_LABEL[e]}</option>`
  ).join("");

  const optionsPagador = pagadores()
    .map((p) => `<option value="${esc(p.id)}" ${opts.pagadorFiltro === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`)
    .join("");

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${esc(opts.toast)}</div>` : ""}

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Explorador maestro de facturas</h2>
          <p>Todas las facturas del sistema, con filtros y acciones de intervención manual.</p>
        </div>
        <a class="mini-btn" href="/banco/facturas/exportar.csv${qs({})}">Exportar CSV</a>
      </div>
      <form method="get" action="/banco/facturas" class="toolbar">
        <select name="estado" class="select-input" onchange="this.form.submit()">
          <option value="">Todos los estados</option>
          ${optionsEstado}
        </select>
        <select name="pagador" class="select-input" onchange="this.form.submit()">
          <option value="">Todos los pagadores</option>
          ${optionsPagador}
        </select>
        ${opts.estadoFiltro || opts.pagadorFiltro ? `<a class="mini-btn" href="/banco/facturas">Limpiar filtros</a>` : ""}
        <span class="toolbar-count">${lista.length} factura${lista.length === 1 ? "" : "s"}</span>
      </form>
      ${
        pagina.length === 0
          ? `<div class="empty-note">No hay facturas que coincidan con los filtros.</div>`
          : `<table>
        <thead><tr>
          <th>Factura</th><th>Pagador</th><th>Proveedor</th><th>Vto</th>
          <th class="num">Monto</th><th>Score</th><th>Estado</th><th class="num">Fondeo</th><th>Excepción</th><th>Acción</th>
        </tr></thead>
        <tbody>${pagina.map(fila).join("")}</tbody>
      </table>
      <div class="pager">
        <span>Página ${page} de ${totalPaginas}</span>
        <div class="pager-btns">
          <a class="mini-btn ${page <= 1 ? "disabled" : ""}" href="${page > 1 ? qs({ page: page - 1 }) : "#"}">← Anterior</a>
          <a class="mini-btn ${page >= totalPaginas ? "disabled" : ""}" href="${page < totalPaginas ? qs({ page: page + 1 }) : "#"}">Siguiente →</a>
        </div>
      </div>`
      }
    </div>

    <p class="footnote">
      "Manual review L2" y "Bloquear AF" son flags de intervención manual sobre la factura, quedan visibles
      para el resto del equipo. Los overrides de aprobar/rechazar quedan registrados en el historial (simulado
      en esta iteración — no hay persistencia de auditoría todavía).
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Fondos S.A.",
    activeHref: "/banco/facturas",
    pageTitle: "Facturas a fondear",
    content,
  });
}
