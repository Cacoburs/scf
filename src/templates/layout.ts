import type { Role, User } from "../lib/types.js";

// Escapa cualquier texto que haya podido escribir un usuario (nombre de
// empresa, ejecutivo, sector, etc.) antes de insertarlo en el HTML. Sin esto,
// alguien podría guardar <script> en un formulario y que se ejecute cada vez
// que se renderiza esa pantalla — usar SIEMPRE con texto que no sea un valor
// fijo del propio código (labels, estados, montos ya formateados).
export function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function htmlDoc(title: string, body: string, extraHead = ""): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css" />
  ${extraHead}
</head>
<body>
${body}
</body>
</html>`;
}

const NAV_BY_ROLE: Record<Role, { section: string; items: { href: string; label: string; icon: string }[] }[]> = {
  banco: [
    {
      section: "Mesa de fondeo",
      items: [
        { href: "/banco", label: "Vista global", icon: "◆" },
        { href: "/banco/facturas", label: "Facturas a fondear", icon: "▤" },
        { href: "/banco/cartera", label: "Cartera activa", icon: "▥" },
        { href: "/banco/monitoreo", label: "Monitoreo de fondeo", icon: "▦" },
      ],
    },
    {
      section: "Relaciones",
      items: [
        { href: "/banco/pagadores", label: "Pagadores ancla", icon: "◈" },
        { href: "/banco/proveedores", label: "Proveedores", icon: "◇" },
        { href: "/banco/scoring", label: "Scoring", icon: "▲" },
      ],
    },
    {
      section: "Configuración",
      items: [
        { href: "/banco/limites", label: "Límites y política", icon: "⚙" },
      ],
    },
  ],
  pagador: [
    {
      section: "YPF",
      items: [
        { href: "/pagador", label: "Vista general", icon: "◆" },
        { href: "/pagador/facturas", label: "Mis facturas", icon: "▤" },
        { href: "/pagador/proveedores", label: "Proveedores", icon: "◈" },
      ],
    },
    {
      section: "Configuración",
      items: [
        { href: "/pagador/equipo", label: "Equipo y reglas", icon: "⚙" },
      ],
    },
  ],
  proveedor: [
    {
      section: "Mi cuenta",
      items: [
        { href: "/proveedor", label: "Inicio — liquidez", icon: "◆" },
        { href: "/proveedor/facturas", label: "Facturas elegibles", icon: "▤" },
        { href: "/proveedor/historial", label: "Historial", icon: "▥" },
      ],
    },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  banco: "Banco / Fondo",
  pagador: "Empresa Ancla",
  proveedor: "Proveedor",
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  banco: "tag-banco",
  pagador: "tag-pagador",
  proveedor: "tag-proveedor",
};

// Identidad de marca por actor en el panel lateral — mismo nombre e iniciales
// que el resto de la vista, y la misma línea de color que ese actor tiene en
// su pantalla de login (tag-banco/pagador/proveedor, btn-banco/pagador/proveedor).
const ROLE_BRAND: Record<Role, { mark: string; name: string; cssClass: string }> = {
  banco: { mark: "FS", name: "Fondos S.A.", cssClass: "role-banco" },
  pagador: { mark: "YP", name: "YPF S.A.", cssClass: "role-pagador" },
  proveedor: { mark: "EZ", name: "Errázuriz S.A.", cssClass: "role-proveedor" },
};

export function dashboardShell(opts: {
  role: Role;
  user: User;
  empresaNombre: string;
  activeHref: string;
  pageTitle: string;
  content: string;
}): string {
  const nav = NAV_BY_ROLE[opts.role];
  const initials = opts.user.nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navHtml = nav
    .map(
      (section) => `
      <div class="section-title">${section.section}</div>
      ${section.items
        .map(
          (item) => `<a href="${item.href}" class="${item.href === opts.activeHref ? "active" : ""}">
            <span>${item.icon}</span><span>${item.label}</span>
          </a>`
        )
        .join("\n")}
    `
    )
    .join("\n");

  const brand = ROLE_BRAND[opts.role];

  const body = `
  <div class="app-shell">
    <aside class="sidebar ${brand.cssClass}">
      <div class="brand">
        <div class="brand-mark">${brand.mark}</div>
        <span>${brand.name}</span>
      </div>
      <nav>${navHtml}</nav>
      <div class="userbox">
        <div class="avatar">${initials}</div>
        <div class="who">
          <div class="name">${esc(opts.user.nombre)}</div>
          <div class="role">${esc(opts.user.cargo)}</div>
        </div>
        <form method="post" action="/logout">
          <button class="logout-btn" title="Cerrar sesión">Salir</button>
        </form>
      </div>
    </aside>
    <div class="main">
      <div class="topbar">
        <h1>${opts.pageTitle}</h1>
        <span class="pill ${ROLE_BADGE_CLASS[opts.role]}" style="background:none;">${opts.empresaNombre} · <b style="margin-left:4px;">${ROLE_LABEL[opts.role]}</b></span>
      </div>
      <div class="content">
        ${opts.content}
      </div>
    </div>
  </div>
  <script src="/client.js"></script>
  `;

  return htmlDoc(`${opts.pageTitle} · ${brand.name}`, body);
}

export function money(n: number, currency: "ARS" | "USD" = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso + "T00:00:00")
  );
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente_validacion: "Pend. validación",
  validada: "Validada",
  elegible: "Elegible",
  pendiente_fondeo: "Pend. fondeo",
  financiada: "Financiada",
  cobrada: "Cobrada",
  rechazada: "Rechazada",
};

export function estadoPill(estado: string): string {
  return `<span class="pill pill-${estado}"><span class="pill-dot"></span>${ESTADO_LABEL[estado] ?? estado}</span>`;
}

export function scoreBar(score: number): string {
  return `<span class="score"><span class="score-bar"><span style="width:${score}%"></span></span><span>${score}</span></span>`;
}
