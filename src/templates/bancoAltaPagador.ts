import type { User } from "../lib/types.js";
import { dashboardShell } from "./layout.js";

export function bancoAltaPagadorPage(opts: { user: User }): string {
  const content = `
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>Alta de pagador ancla</h2>
          <p>Los datos y condiciones quedan sujetos a control de doble aprobación (4-eyes) antes de activarse.</p>
        </div>
      </div>
      <form method="post" action="/banco/pagadores/nuevo">
        <div class="form-grid">
          <div>
            <label for="nombre">Razón social</label>
            <input class="text-input" id="nombre" name="nombre" required placeholder="Ej. Litoral Gas S.A." />
          </div>
          <div>
            <label for="cuit">CUIT</label>
            <input class="text-input" id="cuit" name="cuit" required placeholder="30-XXXXXXXX-X" />
          </div>
          <div>
            <label for="sector">Sector</label>
            <input class="text-input" id="sector" name="sector" required placeholder="Ej. Energía" />
          </div>
          <div>
            <label for="ejecutivo">Ejecutivo asignado</label>
            <input class="text-input" id="ejecutivo" name="ejecutivo" required placeholder="Nombre del ejecutivo comercial" />
          </div>
          <div class="full">
            <label for="limite">Límite de exposición inicial (ARS)</label>
            <input class="text-input" id="limite" name="limite" type="number" min="1000000" step="500000" required value="10000000" />
          </div>
        </div>
        <div class="form-actions">
          <button class="mini-btn" type="submit" name="modo" value="borrador">Guardar borrador</button>
          <button class="mini-btn primary" type="submit" name="modo" value="4ojos">Guardar y proponer a 4-eyes</button>
          <a class="mini-btn" href="/banco/pagadores">Cancelar</a>
        </div>
      </form>
    </div>

    <p class="footnote">
      "Guardar borrador" persiste el avance sin proponerlo para aprobación. "Guardar y proponer a 4-eyes" deja
      el alta pendiente hasta que un segundo administrador la apruebe desde el listado de pagadores.
    </p>
  `;

  return dashboardShell({
    role: "banco",
    user: opts.user,
    empresaNombre: "Banco Piano",
    activeHref: "/banco/pagadores",
    pageTitle: "Alta de pagador ancla",
    content,
  });
}
