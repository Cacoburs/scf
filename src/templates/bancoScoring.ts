import type { User } from "../lib/types.js";
import { dashboardShell, formatDate, scoreBar } from "./layout.js";
import { facturas, getEmpresa, pagadores, proveedores, scorePromedioPagador, ultimoRecalculoScoring } from "../lib/data.js";

const BUCKETS: [number, number][] = [
  [0, 59],
  [60, 69],
  [70, 79],
  [80, 89],
  [90, 100],
];

function tendenciaSimulada(id: string): "up" | "down" | "flat" {
  const sum = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const r = sum % 3;
  return r === 0 ? "up" : r === 1 ? "down" : "flat";
}

const TENDENCIA_ICON: Record<string, string> = { up: "▲", down: "▼", flat: "—" };
const TENDENCIA_COLOR: Record<string, string> = { up: "var(--green-600)", down: "var(--red-600)", flat: "var(--ink-400)" };

export function bancoScoringPage(opts: { user: User; toast?: string }): string {
  const scores = facturas.map((f) => f.scoreRiesgo);
  const promedio = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const minimo = scores.length ? Math.min(...scores) : 0;
  const bajoUmbral = facturas.filter((f) => f.scoreRiesgo < 70);

  const maxBucketCount = Math.max(
    1,
    ...BUCKETS.map(([lo, hi]) => facturas.filter((f) => f.scoreRiesgo >= lo && f.scoreRiesgo <= hi).length)
  );

  const entidades = [
    ...pagadores().map((p) => ({ empresa: p, tipo: "Pagador" as const })),
    ...proveedores().map((p) => ({ empresa: p, tipo: "Proveedor" as const })),
  ]
    .map((e) => ({ ...e, score: scorePromedioPagador(e.empresa.id) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score);

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${opts.toast}</div>` : ""}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Score promedio de cartera</div>
        <div class="value">${promedio}</div>
        <div class="delta delta-flat">sobre ${facturas.length} facturas</div>
      </div>
      <div class="kpi-card">
        <div class="label">Score mínimo vigente</div>
        <div class="value">${minimo}</div>
        <div class="delta delta-flat">${bajoUmbral.length} facturas debajo de 70</div>
      </div>
      <div class="kpi-card">
        <div class="label">Último recálculo</div>
        <div class="value" style="font-size:16px;">${ultimoRecalculoScoring ? formatDate(ultimoRecalculoScoring.slice(0, 10)) : "Sin recalcular aún"}</div>
        <div class="delta delta-flat">${ultimoRecalculoScoring ? new Date(ultimoRecalculoScoring).toLocaleTimeString("es-AR") : "—"}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Distribución de scores</h2>
          <p>Histórico agregado del motor de riesgo sobre la cartera visible.</p>
        </div>
        <form method="post" action="/banco/scoring/recalcular">
          <button class="mini-btn primary" type="submit">Recalcular ahora</button>
        </form>
      </div>
      <div style="padding:20px 20px 8px;">
        ${BUCKETS.map(([lo, hi]) => {
          const count = facturas.filter((f) => f.scoreRiesgo >= lo && f.scoreRiesgo <= hi).length;
          const pct = (count / maxBucketCount) * 100;
          return `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
              <span style="width:64px;font-size:12px;color:var(--ink-500);">${lo}–${hi}</span>
              <div style="flex:1;background:var(--line);border-radius:999px;height:14px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, var(--gold-500), var(--teal-500));"></div>
              </div>
              <span style="width:28px;text-align:right;font-size:12px;color:var(--ink-700);font-weight:600;">${count}</span>
            </div>`;
        }).join("")}
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Ranking por score promedio</h2>
          <p>Pagadores y proveedores ordenados por su score promedio, con tendencia reciente.</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Entidad</th><th>Tipo</th><th>Score</th><th>Tendencia</th></tr></thead>
        <tbody>
          ${entidades
            .map((e) => {
              const t = tendenciaSimulada(e.empresa.id);
              return `<tr>
                <td>${e.empresa.nombre}</td>
                <td>${e.tipo}</td>
                <td>${scoreBar(e.score)}</td>
                <td style="color:${TENDENCIA_COLOR[t]};font-weight:700;">${TENDENCIA_ICON[t]}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Alertas de score bajo</h2>
          <p>Facturas con score por debajo de 70 — candidatas a revisión manual.</p>
        </div>
        <a class="mini-btn" href="/banco/facturas">Revisar en el explorador</a>
      </div>
      ${
        bajoUmbral.length === 0
          ? `<div class="empty-note">No hay facturas por debajo del umbral en este momento.</div>`
          : `<table>
        <thead><tr><th>Factura</th><th>Pagador</th><th>Proveedor</th><th>Score</th></tr></thead>
        <tbody>${bajoUmbral
          .map(
            (f) => `<tr>
              <td class="mono">${f.numero}</td>
              <td>${getEmpresa(f.pagadorId)?.nombre ?? "—"}</td>
              <td>${getEmpresa(f.proveedorId)?.nombre ?? "—"}</td>
              <td>${scoreBar(f.scoreRiesgo)}</td>
            </tr>`
          )
          .join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      El recálculo de esta demo aplica un jitter aleatorio (±3 puntos) sobre los scores existentes para simular
      la salida de un motor de riesgo real. La tendencia por entidad es un valor simulado, no histórico real.
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Fondos S.A.",
    activeHref: "/banco/scoring",
    pageTitle: "Scoring",
    content,
  });
}
