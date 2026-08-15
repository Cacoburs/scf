import type { User } from "../lib/types.js";
import { dashboardShell, money } from "./layout.js";
import {
  facturasDesembolsadas,
  desembolsoPorIndustria,
  desembolsoPorProveedor,
  desembolsoPorPagador,
  desembolsoPorTramoMonto,
  desembolsoPorMes,
  type DesembolsoPorGrupo,
} from "../lib/data.js";

const PALETTE = ["#0d9488", "#ca8a04", "#1f3358", "#0e7490", "#ea580c", "#7c3aed", "#64748b", "#be123c"];

function mesLabel(clave: string): string {
  const d = new Date(`${clave}-01T00:00:00`);
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" }).format(d);
}

function barraHorizontal(grupos: DesembolsoPorGrupo[], total: number, opts?: { limit?: number }): string {
  const lista = opts?.limit ? grupos.slice(0, opts.limit) : grupos;
  return lista
    .map((g, i) => {
      const pct = total > 0 ? (g.monto / total) * 100 : 0;
      return `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <span style="width:150px;font-size:12.5px;color:var(--ink-700);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${g.clave}">${g.clave}</span>
          <div style="flex:1;background:var(--line);border-radius:999px;height:14px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${PALETTE[i % PALETTE.length]};"></div>
          </div>
          <span style="width:110px;text-align:right;font-size:12.5px;font-weight:600;color:var(--ink-900);">${money(g.monto)}</span>
          <span style="width:44px;text-align:right;font-size:11.5px;color:var(--ink-500);">${pct.toFixed(0)}%</span>
        </div>`;
    })
    .join("");
}

export function bancoMonitoreoPage(opts: { user: User; toast?: string }): string {
  const desembolsadas = facturasDesembolsadas();
  const totalDesembolsado = desembolsadas.reduce((acc, f) => acc + f.montoNeto, 0);
  const ticketPromedio = desembolsadas.length > 0 ? Math.round(totalDesembolsado / desembolsadas.length) : 0;

  const porMes = desembolsoPorMes();
  const mesActual = porMes[porMes.length - 1];
  const mesAnterior = porMes[porMes.length - 2];
  const variacionMensual =
    mesAnterior && mesAnterior.monto > 0 ? ((mesActual.monto - mesAnterior.monto) / mesAnterior.monto) * 100 : null;

  const porIndustria = desembolsoPorIndustria();
  const porProveedor = desembolsoPorProveedor();
  const porPagador = desembolsoPorPagador();
  const porTramo = desembolsoPorTramoMonto();

  const maxMes = Math.max(1, ...porMes.map((m) => m.monto));

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${opts.toast}</div>` : ""}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Total desembolsado (histórico)</div>
        <div class="value">${money(totalDesembolsado)}</div>
        <div class="delta delta-flat">${desembolsadas.length} operaciones financiadas o cobradas</div>
      </div>
      <div class="kpi-card">
        <div class="label">Ticket promedio</div>
        <div class="value">${money(ticketPromedio)}</div>
        <div class="delta delta-flat">neto girado por operación</div>
      </div>
      <div class="kpi-card">
        <div class="label">Desembolsado — ${mesActual ? mesLabel(mesActual.clave) : "—"}</div>
        <div class="value">${money(mesActual?.monto ?? 0)}</div>
        <div class="delta ${variacionMensual === null ? "delta-flat" : variacionMensual >= 0 ? "delta-up" : ""}" style="${variacionMensual !== null && variacionMensual < 0 ? "color:var(--red-600);" : ""}">
          ${variacionMensual === null ? "sin mes previo para comparar" : `${variacionMensual >= 0 ? "+" : ""}${variacionMensual.toFixed(0)}% vs. mes anterior`}
        </div>
      </div>
      <div class="kpi-card">
        <div class="label">Industrias activas</div>
        <div class="value">${porIndustria.length}</div>
        <div class="delta delta-flat">${porProveedor.length} proveedores con desembolso</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Evolución mensual del desembolso</h2>
          <p>Neto girado por mes de emisión de la factura, sobre el histórico financiado/cobrado.</p>
        </div>
      </div>
      <div style="padding:24px 20px 8px;display:flex;align-items:flex-end;gap:18px;min-height:160px;">
        ${porMes
          .map((m) => {
            const alturaPct = (m.monto / maxMes) * 100;
            return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;">
              <span style="font-size:11px;color:var(--ink-500);font-weight:600;">${money(m.monto).replace("ARS", "").trim()}</span>
              <div style="width:100%;max-width:56px;height:120px;display:flex;align-items:flex-end;">
                <div style="width:100%;height:${Math.max(alturaPct, 3)}%;background:linear-gradient(180deg, var(--teal-500), var(--teal-600));border-radius:6px 6px 2px 2px;"></div>
              </div>
              <span style="font-size:11.5px;color:var(--ink-700);font-weight:600;text-transform:capitalize;">${mesLabel(m.clave)}</span>
            </div>`;
          })
          .join("")}
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Desembolsos por industria</h2>
          <p>Sector del pagador ancla que origina la factura — dónde está concentrado el capital entregado.</p>
        </div>
      </div>
      <div style="padding:20px;">
        ${porIndustria.length === 0 ? `<div class="empty-note">Todavía no hay desembolsos registrados.</div>` : barraHorizontal(porIndustria, totalDesembolsado)}
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Desembolsos por proveedor</h2>
          <p>Quién recibió el neto girado — top proveedores por volumen histórico.</p>
        </div>
      </div>
      ${
        porProveedor.length === 0
          ? `<div class="empty-note">Todavía no hay desembolsos registrados.</div>`
          : `<table>
        <thead><tr><th>Proveedor</th><th class="num">Operaciones</th><th class="num">Neto desembolsado</th><th class="num">% del total</th></tr></thead>
        <tbody>${porProveedor
          .map(
            (g) => `<tr>
              <td>${g.clave}</td>
              <td class="num">${g.operaciones}</td>
              <td class="num">${money(g.monto)}</td>
              <td class="num">${totalDesembolsado > 0 ? ((g.monto / totalDesembolsado) * 100).toFixed(1) : "0.0"}%</td>
            </tr>`
          )
          .join("")}</tbody>
      </table>`
      }
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Desembolsos por tramo de monto</h2>
          <p>Distribución del neto girado según el tamaño del ticket (monto bruto de la factura).</p>
        </div>
      </div>
      <div style="padding:20px;">
        ${barraHorizontal(porTramo, totalDesembolsado)}
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Top pagadores por desembolso histórico</h2>
          <p>Quién concentra el capital entregado del lado del deudor cedido.</p>
        </div>
        <a class="mini-btn" href="/banco/cartera">Ver cartera vigente</a>
      </div>
      ${
        porPagador.length === 0
          ? `<div class="empty-note">Todavía no hay desembolsos registrados.</div>`
          : `<table>
        <thead><tr><th>Pagador</th><th class="num">Operaciones</th><th class="num">Neto desembolsado</th><th class="num">% del total</th></tr></thead>
        <tbody>${porPagador
          .map(
            (g) => `<tr>
              <td>${g.clave}</td>
              <td class="num">${g.operaciones}</td>
              <td class="num">${money(g.monto)}</td>
              <td class="num">${totalDesembolsado > 0 ? ((g.monto / totalDesembolsado) * 100).toFixed(1) : "0.0"}%</td>
            </tr>`
          )
          .join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      "Desembolsado" = facturas en estado financiada o cobrada (neto efectivamente girado). La evolución mensual
      agrupa por mes de emisión de la factura — no hay todavía un campo de fecha de desembolso real en el modelo.
      Este monitoreo mira el histórico acumulado; "Cartera activa" muestra solo lo vigente hoy.
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Fondos S.A.",
    activeHref: "/banco/monitoreo",
    pageTitle: "Monitoreo de fondeo",
    content,
  });
}
