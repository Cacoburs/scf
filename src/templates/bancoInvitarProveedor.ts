import type { User } from "../lib/types.js";
import { dashboardShell } from "./layout.js";
import { pagadores } from "../lib/data.js";

export function bancoInvitarProveedorPage(opts: { user: User }): string {
  const opcionesPagador = pagadores()
    .map((p) => `<option value="${p.id}">${p.nombre}</option>`)
    .join("");

  const content = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Invitar proveedor</h2>
          <p>El proveedor recibe una invitación para completar su onboarding (KYB) y empezar a operar dentro de la cadena del pagador elegido.</p>
        </div>
      </div>
      <form method="post" action="/banco/proveedores/invitar">
        <div class="form-grid">
          <div>
            <label for="nombre">Razón social</label>
            <input class="text-input" id="nombre" name="nombre" required placeholder="Ej. Repuestos Norte SRL" />
          </div>
          <div>
            <label for="cuit">CUIT</label>
            <input class="text-input" id="cuit" name="cuit" required placeholder="30-XXXXXXXX-X" />
          </div>
          <div>
            <label for="sector">Sector</label>
            <input class="text-input" id="sector" name="sector" required placeholder="Ej. Autopartes" />
          </div>
          <div>
            <label for="pagadorId">Pagador que lo habilita</label>
            <select class="select-input" id="pagadorId" name="pagadorId" style="width:100%;">${opcionesPagador}</select>
          </div>
        </div>
        <div class="form-actions">
          <button class="mini-btn primary" type="submit">Guardar e invitar al proveedor</button>
          <a class="mini-btn" href="/banco/proveedores">Cancelar</a>
        </div>
      </form>
    </div>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Banco Piano",
    activeHref: "/banco/proveedores",
    pageTitle: "Invitar proveedor",
    content,
  });
}
