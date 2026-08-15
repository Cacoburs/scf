import { htmlDoc } from "./layout.js";
import type { Role } from "../lib/types.js";

interface LoginPageConfig {
  role: Role;
  title: string;
  heroTitle: string;
  heroText: string;
  stats: { value: string; label: string }[];
  accentClass: "btn-banco" | "btn-pagador" | "btn-proveedor";
  panelGradient: string;
  demoEmail: string;
  demoPassword: string;
  error?: string;
}

const CONFIG: Record<Role, LoginPageConfig> = {
  banco: {
    role: "banco",
    title: "Banco / Fondo",
    heroTitle: "La mesa de fondeo, con visibilidad total del riesgo antes de desembolsar.",
    heroText:
      "Cada factura que llega a tu cola ya pasó scoring, validación del pagador ancla y verificación de duplicados. Vos decidís sobre datos, no sobre promesas.",
    stats: [
      { value: "USD 5-10M", label: "Línea piloto sugerida" },
      { value: "T+0", label: "Confirmación de fondeo" },
      { value: "100%", label: "Trazabilidad por factura" },
    ],
    accentClass: "btn-banco",
    panelGradient: "linear-gradient(160deg, var(--navy-950), var(--navy-700))",
    demoEmail: "mesa@bancopiano.com.ar",
    demoPassword: "demo1234",
  },
  pagador: {
    role: "pagador",
    title: "Empresa Ancla",
    heroTitle: "Aprobá facturas una vez. Que tu cadena de proveedores cobre antes.",
    heroText:
      "Cargá tus facturas aprobadas, dejá que la plataforma haga la validación y habilitá a tus proveedores a anticipar sin que te cueste caja ni tiempo de tesorería.",
    stats: [
      { value: "24-72h", label: "De carga a elegible" },
      { value: "0", label: "Costo para el pagador" },
      { value: "N", label: "Proveedores habilitados" },
    ],
    accentClass: "btn-pagador",
    panelGradient: "linear-gradient(160deg, #0f2e2b, var(--teal-600))",
    demoEmail: "finanzas@agroexportpampa.com.ar",
    demoPassword: "demo1234",
  },
  proveedor: {
    role: "proveedor",
    title: "Proveedor",
    heroTitle: "Mirá cuánto podés cobrar hoy de lo que vence en 30, 60 o 90 días.",
    heroText:
      "Seleccioná tus facturas elegibles, revisá el costo y confirmá el anticipo. El dinero llega a tu cuenta sin esperar el vencimiento original.",
    stats: [
      { value: "70-90%", label: "Anticipo típico" },
      { value: "Minutos", label: "De selección a confirmación" },
      { value: "0", label: "Papeles físicos" },
    ],
    accentClass: "btn-proveedor",
    panelGradient: "linear-gradient(160deg, #3a1d0a, var(--orange-600))",
    demoEmail: "pagos@metalurgicasur.com.ar",
    demoPassword: "demo1234",
  },
};

export function loginPage(role: Role, error?: string): string {
  const c = CONFIG[role];

  const body = `
  <div class="login-page">
    <div class="login-brand-panel" style="background:${c.panelGradient};">
      <div>
        <a class="top-link" href="/">← Volver a Mills Capital</a>
      </div>
      <div>
        <h2>${c.heroTitle}</h2>
        <p>${c.heroText}</p>
        <div class="stats">
          ${c.stats
            .map((s) => `<div class="stat"><b>${s.value}</b><span>${s.label}</span></div>`)
            .join("")}
        </div>
      </div>
      <div class="fine">Mills Capital · Portal ${c.title} · Demo funcional</div>
    </div>

    <div class="login-form-panel">
      <div class="login-form-box">
        <span class="pill tag-${role}" style="background:none;border:1px solid var(--line);">Portal · ${c.title}</span>
        <h1>Iniciar sesión</h1>
        <p class="hint">Ingresá con tu cuenta para acceder al portal de ${c.title.toLowerCase()}.</p>

        ${error ? `<div class="error-box">${error}</div>` : ""}

        <form method="post" action="/${role}/login">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="username" value="${c.demoEmail}" required />
          </div>
          <div class="field">
            <label for="password">Contraseña</label>
            <input id="password" name="password" type="password" autocomplete="current-password" value="${c.demoPassword}" required />
          </div>
          <button class="btn ${c.accentClass}" type="submit">Entrar al portal</button>
        </form>

        <div class="demo-creds">
          <b>Acceso de demostración</b> — ya está precargado arriba.<br/>
          Usuario: <b>${c.demoEmail}</b> · Contraseña: <b>${c.demoPassword}</b>
        </div>
      </div>
    </div>
  </div>
  `;

  return htmlDoc(`Ingresar · ${c.title} · Mills Capital`, body);
}
