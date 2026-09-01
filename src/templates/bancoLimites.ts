import type { User } from "../lib/types.js";
import { dashboardShell, money, esc, teaDesde, scoreBar } from "./layout.js";
import { pagadores, exposicionPorPagador } from "../lib/data.js";

const LIFECYCLE_LABEL: Record<string, string> = {
  activo: "Activo",
  onboarding: "Onboarding",
  pendiente_4ojos: "Pend. 4-eyes",
  pausado: "Pausado",
  suspendido: "Suspendido",
};

export function bancoLimitesPage(opts: { user: User; toast?: string }): string {
  const lista = [...pagadores()].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const posiciones = lista.map((p) => ({
    pagador: p,
    exposicion: exposicionPorPagador(p.id),
  }));

  const limiteAsignado = posiciones.reduce((acc, p) => acc + (p.pagador.limiteExposicion ?? 0), 0);
  const totalExpuesto = posiciones.reduce((acc, p) => acc + p.exposicion, 0);
  const sinTasaBase = lista.filter((p) => p.tasaBase == null).length;

  const fila = (row: (typeof posiciones)[number]) => {
    const p = row.pagador;
    const limite = p.limiteExposicion ?? 0;
    const pctUtilizado = limite > 0 ? Math.min(100, Math.round((row.exposicion / limite) * 100)) : 0;
    const tea = p.tasaBase != null ? teaDesde(p.tasaBase) : null;
    return `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--ink-900);">${esc(p.nombre)}</div>
          <div style="font-size:11.5px;color:var(--ink-500);">${esc(p.sector) || "—"} · ${esc(p.cuit)} · <span class="badge-lifecycle badge-${p.lifecyclePagador ?? "activo"}">${LIFECYCLE_LABEL[p.lifecyclePagador ?? "activo"]}</span></div>
        </td>
        <td>
          <form method="post" action="/banco/pagadores/${p.id}/limite" class="inline-reassign">
            <input class="text-input" type="number" min="0" step="100000" name="limite" value="${limite || ""}" placeholder="Sin definir" style="width:140px;" />
            <button class="mini-btn" type="submit">Guardar</button>
          </form>
        </td>
        <td class="num">${money(row.exposicion)}</td>
        <td>${limite > 0 ? scoreBar(pctUtilizado) : `<span style="color:var(--ink-400);">—</span>`}</td>
        <td>
          <form method="post" action="/banco/pagadores/${p.id}/tasa-base" class="inline-reassign">
            <input class="text-input" type="number" min="1" max="100" step="0.1" name="tasaBase" value="${p.tasaBase ?? ""}" placeholder="Promedio hist." style="width:100px;" />
            <span style="color:var(--ink-500);font-size:12px;">% TNA</span>
            <button class="mini-btn" type="submit">Guardar</button>
          </form>
        </td>
        <td class="num">${tea != null ? `${tea.toFixed(1)}%` : "—"}</td>
        <td>
          <a class="mini-btn" href="/banco/facturas?pagador=${p.id}">Ver facturas</a>
        </td>
      </tr>`;
  };

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${esc(opts.toast)}</div>` : ""}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Límite total asignado</div>
        <div class="value">${money(limiteAsignado)}</div>
        <div class="delta delta-flat">suma de líneas de todos los pagadores</div>
      </div>
      <div class="kpi-card">
        <div class="label">Expuesto hoy</div>
        <div class="value">${money(totalExpuesto)}</div>
        <div class="delta delta-flat">${limiteAsignado > 0 ? `${Math.round((totalExpuesto / limiteAsignado) * 100)}% del límite total` : "sin límites definidos todavía"}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Pagadores sin tasa base fijada</div>
        <div class="value">${sinTasaBase}</div>
        <div class="delta delta-flat">usan el promedio histórico como default</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Límite de exposición y tasa por pagador</h2>
          <p>Cuánto puede tener el Fondo en la calle con cada pagador ancla, y a qué TNA se descuentan sus facturas nuevas.</p>
        </div>
      </div>
      ${
        lista.length === 0
          ? `<div class="empty-note">Todavía no hay pagadores ancla dados de alta.</div>`
          : `<table>
        <thead><tr>
          <th>Pagador</th><th>Límite de exposición</th><th class="num">Expuesto</th><th>% utilizado</th>
          <th>Tasa base</th><th class="num">TEA</th><th>Acción</th>
        </tr></thead>
        <tbody>${posiciones.map(fila).join("")}</tbody>
      </table>`
      }
    </div>

    <p class="footnote">
      <strong>TNA</strong> (Tasa Nominal Anual) es la tasa base que fija acá el Fondo y la que se usa para
      calcular el neto de cada factura nueva de ese pagador — si no se fija una, se sigue usando el promedio
      histórico de sus propias facturas. <strong>TEA</strong> (Tasa Efectiva Anual) es esa misma tasa
      capitalizada, informativa — es la que ve el proveedor como "costo real" al momento de adelantar.
      No se muestra <strong>CFT</strong> (Costo Financiero Total) todavía: hoy el único costo del descuento es
      el interés (no hay comisiones, seguros ni gastos adicionales cargados), así que sería igual a la TEA — el
      día que se sumen esos cargos, ahí sí va a hacer falta calcularlo aparte para no subestimar el costo real.
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Fondos S.A.",
    activeHref: "/banco/limites",
    pageTitle: "Límites y política",
    content,
  });
}
