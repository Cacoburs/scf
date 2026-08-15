// Smoke test end-to-end: login en los 3 portales + flujo cruzado completo
// (pagador conforma -> proveedor pide anticipo -> banco aprueba).
//
// Requiere el server corriendo en localhost:3000 (`npm run dev` en otra terminal)
// y Playwright instalado: `npm install -D playwright && npx playwright install chromium`.
//
// Uso: node scripts/e2e.mjs

import { chromium } from "playwright";

const browser = await chromium.launch();
const base = "http://localhost:3000";

async function newRolePage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  return context.newPage();
}

async function loginFlow(page, role, email, password) {
  await page.goto(`${base}/${role}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([page.waitForNavigation(), page.click("button[type=submit]")]);
  return page.url();
}

const pBanco = await newRolePage();
console.log("banco:", await loginFlow(pBanco, "banco", "mesa@bancopiano.com.ar", "demo1234"));

const pPagador = await newRolePage();
console.log("pagador:", await loginFlow(pPagador, "pagador", "finanzas@agroexportpampa.com.ar", "demo1234"));

const pProveedor = await newRolePage();
console.log("proveedor:", await loginFlow(pProveedor, "proveedor", "pagos@metalurgicasur.com.ar", "demo1234"));

// Pagador conforma una factura pendiente
await pPagador.click('form[action="/pagador/facturas/fac-0004/conformar"] button');
await pPagador.waitForLoadState("networkidle");

// Proveedor pide el anticipo de una factura elegible
await pProveedor.reload({ waitUntil: "networkidle" });
await pProveedor.click('form[action="/proveedor/facturas/fac-0002/adelantar"] button');
await pProveedor.waitForLoadState("networkidle");

// Banco aprueba el fondeo
await pBanco.reload({ waitUntil: "networkidle" });
await pBanco.click('form[action="/banco/facturas/fac-0002/aprobar"] button');
await pBanco.waitForLoadState("networkidle");

await browser.close();
console.log("OK — flujo cruzado completo sin errores.");
