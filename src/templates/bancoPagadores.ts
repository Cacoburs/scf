import type { Empresa, User } from "../lib/types.js";
import { dashboardShell, money } from "./layout.js";
import { pagadores, volumenFinanciadoPagador, proveedoresDePagador } from "../lib/data.js";

function slaSimulado(id: string): number {
  const sum = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 88 + (sum % 11); // 88–98%, determinístico por id
}

const LIFECYCLE_LABEL: Record<string, string> = {
  activo: "Activo",
  onboarding: "Onboarding",
  pendiente_4ojos: "Pend. 4-eyes",
  pausado: "Pausado",
  suspendido: "Suspendido",
};

export function bancoPagadoresPage(opts: { user: User; toast?: string }): string {
  const lista = [...pagadores()].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const fila = (p: Empresa) => {
    const revenue = Math.round(volumenFinanciadoPagador(p.id) * 0.01);
    const sla = slaSimulado(p.id);
    const suspendido = p.lifecyclePagador === "suspendido";
    const pendiente4ojos = p.lifecyclePagador === "pendiente_4ojos";
    return `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--ink-900);">${p.nombre}</div>
          <div style="font-size:11.5px;color:var(--ink-500);">${p.sector ?? "—"} · ${p.cuit}</div>
        </td>
        <td><span class="badge-lifecycle badge-${p.lifecyclePagador ?? "activo"}">${LIFECYCLE_LABEL[p.lifecyclePagador ?? "activo"]}</span></td>
        <td>${p.ejecutivo ?? "—"}</td>
        <td class="num">${money(revenue)}</td>
        <td class="num">${sla}%</td>
        <td class="num">${proveedoresDePagador(p.id).length}</td>
        <td>
          <div class="row-actions">
            <form method="post" action="/banco/pagadores/${p.id}/qbr">
              <button class="mini-btn" type="submit">Programar review</button>
            </form>
            <form method="post" action="/banco/pagadores/${p.id}/ejecutivo" class="inline-reassign">
              <input class="text-input" name="ejecutivo" value="${p.ejecutivo ?? ""}" />
              <button class="mini-btn" type="submit">Reasignar</button>
            </form>
            <a class="mini-btn" href="/banco/limites">Política de aprobación</a>
            <a class="mini-btn" href="mailto:contacto@${p.id}.com.ar">Contactar</a>
            ${
              pendiente4ojos
                ? `<form method="post" action="/banco/pagadores/${p.id}/aprobar-alta"><button class="mini-btn primary" type="submit">Aprobar alta (4-eyes)</button></form>`
                : `<form method="post" action="/banco/pagadores/${p.id}/suspender" onsubmit="return confirm('¿Seguro que querés ${suspendido ? "reactivar" : "suspender"} a ${p.nombre.replace(/'/g, "")}? ${suspendido ? "" : "Esto detiene nuevas originaciones de este pagador."}');">
                    <button class="mini-btn danger" type="submit">${suspendido ? "Reactivar" : "Suspender"}</button>
                  </form>`
            }
          </div>
        </td>
      </tr>`;
  };

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${opts.toast}</div>` : ""}

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Pagadores ancla</h2>
          <p>Relación comercial con cada empresa pagadora — lifecycle, ejecutivo asignado y performance del programa.</p>
        </div>
        <a class="mini-btn primary" href="/banco/pagadores/nuevo">+ Alta de pagador</a>
      </div>
      <table>
        <thead><tr>
          <th>Pagador</th><th>Estado</th><th>Ejecutivo</th><th class="num">Revenue YTD</th>
          <th class="num">SLA aprobación</th><th class="num">Proveedores</th><th>Acción</th>
        </tr></thead>
        <tbody>${lista.map(fila).join("")}</tbody>
      </table>
    </div>

    <p class="footnote">
      Revenue YTD estimado como 1% del volumen financiado histórico (fee de originación simulado). SLA de
      aprobación es un valor simulado por pagador. Suspender detiene nuevas originaciones — requiere confirmación.
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Banco Piano",
    activeHref: "/banco/pagadores",
    pageTitle: "Pagadores ancla",
    content,
  });
}
