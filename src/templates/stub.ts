import type { Role, User } from "../lib/types.js";
import { dashboardShell } from "./layout.js";

export function stubPage(opts: {
  role: Role;
  user: User;
  empresaNombre: string;
  activeHref: string;
  pageTitle: string;
}): string {
  const content = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>${opts.pageTitle}</h2>
          <p>Esta sección se construye en la siguiente iteración del MVP.</p>
        </div>
      </div>
      <div class="empty-note">
        La demo de esta semana se enfocó en el flujo core: login por portal y el ciclo
        conformidad → elegibilidad → solicitud → aprobación de fondeo.<br/>
        <a href="/${opts.role}" style="color:var(--teal-600);font-weight:600;">← Volver a la vista general</a>
      </div>
    </div>
  `;
  return dashboardShell({
    role: opts.role,
    user: opts.user,
    empresaNombre: opts.empresaNombre,
    activeHref: opts.activeHref,
    pageTitle: opts.pageTitle,
    content,
  });
}
