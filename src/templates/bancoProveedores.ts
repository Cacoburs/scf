import type { Empresa, User } from "../lib/types.js";
import { dashboardShell, money, esc } from "./layout.js";
import { proveedores, volumenDescontadoProveedor, pagadoresDeProveedor } from "../lib/data.js";

const LIFECYCLE_LABEL: Record<string, string> = {
  activo: "Activo",
  invitado: "Invitado",
  kyb_pendiente: "KYB pendiente",
  dormant: "Dormant",
  bloqueado: "Bloqueado",
};

export function bancoProveedoresPage(opts: { user: User; toast?: string }): string {
  const lista = [...proveedores()].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const fila = (p: Empresa) => {
    const volumen = volumenDescontadoProveedor(p.id);
    const pagadoresAsoc = pagadoresDeProveedor(p.id);
    const dormant = p.lifecycleProveedor === "dormant";
    const bloqueado = p.lifecycleProveedor === "bloqueado";
    return `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--ink-900);">${esc(p.nombre)}</div>
          <div style="font-size:11.5px;color:var(--ink-500);">${esc(p.sector) || "—"} · ${esc(p.cuit)}</div>
          ${(p.alertas ?? []).map((a) => `<span class="alert-chip">${esc(a)}</span>`).join("")}
        </td>
        <td><span class="badge-lifecycle badge-${p.lifecycleProveedor ?? "activo"}">${LIFECYCLE_LABEL[p.lifecycleProveedor ?? "activo"]}</span></td>
        <td><span class="kyb-badge">${p.kyb ?? "L1"}</span></td>
        <td>${pagadoresAsoc.length === 0 ? "—" : pagadoresAsoc.map((pa) => esc(pa.nombre)).join(", ")}</td>
        <td class="num">${money(volumen)}</td>
        <td>
          <div class="row-actions">
            <form method="post" action="/banco/proveedores/${p.id}/kyb-upgrade">
              <button class="mini-btn" type="submit" ${p.kyb === "L3" ? "disabled" : ""}>Pedir upgrade KYB</button>
            </form>
            <form method="post" action="/banco/proveedores/${p.id}/dormant">
              <button class="mini-btn" type="submit">${dormant ? "Reactivar" : "Marcar dormant"}</button>
            </form>
            <a class="mini-btn" href="mailto:contacto@${p.id}.com.ar">Contactar</a>
            <a class="mini-btn" href="/banco/scoring">Ver en motor de riesgo</a>
            <form method="post" action="/banco/proveedores/${p.id}/bloquear-antifraude" onsubmit="return confirm('¿Seguro que querés ${bloqueado ? "desbloquear" : "bloquear por anti-fraude"} a ${esc(p.nombre.replace(/'/g, ""))}?');">
              <button class="mini-btn danger" type="submit">${bloqueado ? "Desbloquear" : "Bloquear AF"}</button>
            </form>
          </div>
        </td>
      </tr>`;
  };

  const content = `
    ${opts.toast ? `<div class="toast-banner show">${esc(opts.toast)}</div>` : ""}

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Proveedores cedentes</h2>
          <p>Nivel de KYB, pagadores habilitantes y uso del programa SCF por proveedor.</p>
        </div>
        <a class="mini-btn primary" href="/banco/proveedores/invitar">+ Invitar proveedor</a>
      </div>
      <table>
        <thead><tr>
          <th>Proveedor</th><th>Estado</th><th>KYB</th><th>Pagadores asociados</th>
          <th class="num">Volumen descontado</th><th>Acción</th>
        </tr></thead>
        <tbody>${lista.map(fila).join("")}</tbody>
      </table>
    </div>

    <p class="footnote">
      Volumen descontado = suma del bruto de facturas financiadas o cobradas de ese proveedor. Bloquear por
      anti-fraude requiere confirmación y detiene nuevas cesiones del proveedor.
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Fondos S.A.",
    activeHref: "/banco/proveedores",
    pageTitle: "Proveedores",
    content,
  });
}
