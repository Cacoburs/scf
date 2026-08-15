import { htmlDoc } from "./layout.js";

export function landingPage(): string {
  const body = `
  <div class="landing">
    <div class="landing-nav">
      <div class="brand">
        <div class="brand-mark">MC</div>
        <span>Mills Capital</span>
      </div>
      <span style="font-size:12.5px;color:#94a3b8;">Demo funcional · Supply Chain Finance</span>
    </div>

    <div class="landing-hero">
      <div class="eyebrow">Factoring digital para cadenas de valor</div>
      <h1>Facturas aprobadas hoy,<br/>liquidez para el proveedor mañana.</h1>
      <p class="sub">
        Una plataforma, tres roles: la empresa ancla aprueba sus facturas, el proveedor
        elige cuáles descontar, y el banco o fondo libera los fondos con trazabilidad
        completa de punta a punta. Elegí un portal para entrar a la demo.
      </p>

      <div class="portal-grid">
        <a class="portal-card" href="/banco/login">
          <span class="tag tag-banco">Banco / Fondo</span>
          <h3>Mesa de fondeo</h3>
          <p>Revisá facturas elegibles, aprobá el desembolso y monitoreá la cartera activa.</p>
          <span class="enter">Entrar como Banco Piano →</span>
        </a>
        <a class="portal-card" href="/pagador/login">
          <span class="tag tag-pagador">Empresa Ancla</span>
          <h3>Portal del pagador</h3>
          <p>Cargá y validá facturas, gestioná tu cadena de proveedores habilitados.</p>
          <span class="enter">Entrar como AgroExport Pampa →</span>
        </a>
        <a class="portal-card" href="/proveedor/login">
          <span class="tag tag-proveedor">Proveedor</span>
          <h3>Portal del proveedor</h3>
          <p>Mirá cuánto podés cobrar hoy y pedí el anticipo sobre tus facturas elegibles.</p>
          <span class="enter">Entrar como Metalúrgica Sur →</span>
        </a>
      </div>
    </div>

    <div class="landing-footer">
      Mills Capital — demo interna. Datos ficticios, sin integración regulatoria ni de producción.
    </div>
  </div>
  `;
  return htmlDoc("Mills Capital · Factoring digital", body);
}
