import type { Empresa, User } from "../lib/types.js";
import { dashboardShell, money } from "./layout.js";
import {
  pagadores,
  exposicionPorPagador,
  scorePromedioPagador,
  dsoPagador,
  volumenFinanciadoPagador,
  facturasEnCarteraVigente,
} from "../lib/data.js";

const PALETTE = ["#0d9488", "#ca8a04", "#1f3358", "#0e7490", "#ea580c", "#7c3aed", "#64748b"];

export function bancoCarteraPage(opts: { user: User; toast?: string }): string {
  const totalCartera = facturasEnCarteraVigente().reduce((acc, f) => acc + f.montoNeto, 0);

  const posiciones = pagadores()
    .map((p) => ({
      pagador: p,
      exposicion: exposicionPorPagador(p.id),
      score: scorePromedioPagador(p.id),
      dso: dsoPagador(p.id),
      fondeo: volumenFinanciadoPagador(p.id),
    }))
    .filter((p) => p.exposicion > 0 || p.fondeo > 0)
    .sort((a, b) => b.exposicion - a.exposicion)
    .slice(0, 7);

  const barSegments = posiciones
    .filter((p) => p.exposicion > 0)
    .map((p, i) => {
      const pct = totalCartera > 0 ? (p.exposicion / totalCartera) * 100 : 0;
      return { ...p, pct, color: PALETTE[i % PALETTE.length] };
    });

  const lifecycleBadge = (p: Empresa) => {
    const l = p.lifecyclePagador ?? "activo";
    return `<span class="badge-lifecycle badge-${l}">${l.replace("_", " ")}</span>`;
  };

  const fila = (row: (typeof posiciones)[number]) => {
    const pct = totalCartera > 0 ? ((row.exposicion / totalCartera) * 100).toFixed(1) : "0.0";
    return `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--ink-900);">${row.pagador.nombre}</div>
          <div style="font-size:11.5px;color:var(--ink-500);">${row.pagador.sector ?? "—"} · ${lifecycleBadge(row.pagador)}${row.pagador.watchlist ? ' <span class="badge-lifecycle badge-pausado">watch list</span>' : ""}${row.pagador.bloqueadoCesiones ? ' <span class="badge-lifecycle badge-bloqueado">cesiones bloqueadas</span>' : ""}</div>
        </td>
        <td>${row.score}</td>
        <td class="num">${money(row.exposicion)}</td>
        <td class="num">${pct}%</td>
        <td class="num">${row.dso} días</td>
        <td class="num">${money(row.fondeo)}</td>
        <td>
          <div class="row-actions">
            <form method="post" action="/banco/pagadores/${row.pagador.id}/ampliar-linea">
              <button class="mini-btn" type="submit">Ampliar línea</button>
            </form>
            <form method="post" action="/banco/pagadores/${row.pagador.id}/watchlist">
              <button class="mini-btn" type="submit">${row.pagador.watchlist ? "Sacar de watch list" : "Watch list"}</button>
            </form>
            <form method="post" action="/banco/pagadores/${row.pagador.id}/bloquear-cesiones">
              <button class="mini-btn danger" type="submit">${row.pagador.bloqueadoCesiones ? "Reactivar cesiones" : "Bloquear cesiones"}</button>
            </form>
            <a class="mini-btn" href="/banco/facturas?pagador=${row.pagador.id}">Ver facturas</a>
            <button class="mini-btn disabled" type="button" title="Disponible en una próxima fase">Vender tramo a inversor</button>
          </div>
        </td>
      </tr>`;
  };

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${opts.toast}</div>` : ""}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Cartera vigente total</div>
        <div class="value">${money(totalCartera)}</div>
        <div class="delta delta-flat">${facturasEnCarteraVigente().length} operaciones desembolsadas, a la espera de cobro</div>
      </div>
      <div class="kpi-card">
        <div class="label">Concentración top pagador</div>
        <div class="value">${barSegments[0] ? barSegments[0].pct.toFixed(1) : "0.0"}%</div>
        <div class="delta delta-flat">${barSegments[0]?.pagador.nombre ?? "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Pagadores con exposición</div>
        <div class="value">${barSegments.length}</div>
        <div class="delta delta-flat">de ${pagadores().length} pagadores ancla activos</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Concentración de cartera — top ${barSegments.length}</h2>
          <p>Distribución de la exposición vigente por pagador ancla.</p>
        </div>
      </div>
      <div style="padding:20px;">
        <div class="concentracion-bar">
          ${barSegments.map((s) => `<span style="width:${s.pct}%;background:${s.color};" title="${s.pagador.nombre} · ${s.pct.toFixed(1)}%"></span>`).join("")}
        </div>
        <div class="concentracion-legend">
          ${barSegments
            .map((s) => `<span><span class="swatch" style="background:${s.color};"></span>${s.pagador.nombre} · ${s.pct.toFixed(1)}%</span>`)
            .join("")}
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Posiciones vigentes por pagador</h2>
          <p>Exposición neta, score promedio y DSO por pagador ancla, con acciones de gestión de línea.</p>
        </div>
      </div>
      ${
        posiciones.length === 0
          ? `<div class="empty-note">Todavía no hay posiciones con exposición o fondeo histórico.</div>`
          : `<table>
        <thead><tr>
          <th>Pagador</th><th>Score</th><th class="num">Exposición</th><th class="num">% cartera</th>
          <th class="num">DSO</th><th class="num">Fondeo histórico</th><th>Acción</th>
        </tr></thead>
        <tbody>${posiciones.map(fila).join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      DSO calculado como el promedio de días de descuento de las facturas del pagador (proxy simulado).
      "Vender tramo a inversor" queda deshabilitado — es la acción prevista para la fase de mercado secundario.
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Fondos S.A.",
    activeHref: "/banco/cartera",
    pageTitle: "Cartera activa",
    content,
  });
}
