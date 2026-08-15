# Mills Capital — MVP funcional (demo)

MVP navegable de la plataforma de Supply Chain Finance / factoring: **3 portales**
(banco/fondo, empresa ancla, proveedor) conectados por un mismo ciclo de vida de
factura. Pensado para mostrar la operatoria completa a stakeholders — incluido
Banco Piano — antes de construir integraciones reales.

## Qué incluye esta iteración

- Landing con los 3 portales.
- Login independiente por rol (`/banco/login`, `/pagador/login`, `/proveedor/login`),
  con sesión por cookie y redirección según rol — igual al criterio AUTH-01 del
  backlog de historias de usuario original.
- Dashboard funcional por rol, con datos que **se actualizan en vivo y cruzan entre
  portales** (no son pantallas estáticas):
  - **Banco Piano** — cola de aprobación de fondeo, cartera activa, aprobar/rechazar.
  - **AgroExport Pampa (empresa ancla)** — facturas pendientes de conformidad, ciclo en curso.
  - **Metalúrgica Sur (proveedor)** — cuánto puede cobrar hoy, pedir anticipo.
- Portal del Fondo (Banco Piano) ya completo para las historias P1/P2 de la épica E2:
  - **Explorador maestro de facturas** (`/banco/facturas`) — filtros, paginación, export CSV real
    y acciones de intervención manual (revisión L2, bloqueo anti-fraude, override aprobar/rechazar).
  - **Cartera activa** (`/banco/cartera`) — total vigente, concentración por pagador con gráfico
    de barra apilada, y acciones sobre la línea (ampliar, watch list, bloquear cesiones).
  - **Pagadores ancla** (`/banco/pagadores`) — CRM con lifecycle, ejecutivo, revenue, SLA y alta
    con control 4-eyes (`/banco/pagadores/nuevo`).
  - **Proveedores** (`/banco/proveedores`) — CRM con nivel KYB, pagadores asociados, alertas, e
    invitación de nuevos proveedores (`/banco/proveedores/invitar`).
  - **Scoring** (`/banco/scoring`) — distribución de scores, ranking por entidad y "Recalcular ahora".
  - El modelo de datos ahora tiene 5 pagadores y 6 proveedores (antes 1 y 1) para que estas vistas
    de cartera/CRM tengan volumen realista — el circuito de demo original (AgroExport ↔ Metalúrgica
    Sur) sigue intacto.
- El resto de los ítems del menú (`Límites`, `Equipo`, etc.) siguen como placeholder — quedan
  para la próxima iteración, no rompen la navegación.

## Cómo correrlo

Requiere Node.js 18+.

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000`. El servidor recarga solo al guardar cambios.

No hay build ni bundler: es TypeScript corriendo directo con `tsx`, sin
dependencias de producción. Los "datos" viven en memoria (`src/lib/data.ts`) y
se reinician cada vez que reiniciás el servidor — ideal para repetir la demo
las veces que haga falta desde el mismo estado inicial.

## Accesos de demostración

| Portal | Email | Contraseña |
|---|---|---|
| Banco Piano | `mesa@bancopiano.com.ar` | `demo1234` |
| AgroExport Pampa (ancla) | `finanzas@agroexportpampa.com.ar` | `demo1234` |
| Metalúrgica Sur (proveedor) | `pagos@metalurgicasur.com.ar` | `demo1234` |

Los campos de login ya vienen precargados con estos datos para agilizar la demo.

## El circuito para mostrar en la reunión

1. Como **pagador**, entrá a una factura "pendiente de conformidad" y dale
   *Dar conformidad* → pasa a elegible.
2. Como **proveedor**, entrá y mirá que esa factura ahora aparece en
   "Facturas elegibles para anticipo" con el neto, costo y TEA calculados.
   Dale *Adelantar*.
3. Como **banco**, entrá y vas a verla en la "Cola de aprobación de fondeo".
   Dale *Aprobar fondeo* → pasa a cartera financiada.
4. Volvé al portal del proveedor y refrescá: ya figura como financiada.

Ese es el pitch completo: una factura real recorriendo los tres roles con
trazabilidad de punta a punta, sin planillas ni PDFs sueltos.

## Verificación automática

`scripts/e2e.mjs` corre ese mismo circuito con un navegador headless y confirma
que las tres pantallas responden. Requiere Playwright:

```bash
npm install -D playwright
npx playwright install chromium
npm run dev &          # en otra terminal si preferís
node scripts/e2e.mjs
```

## Qué NO es esta versión (para ser honestos en la reunión)

- No hay integración con ARCA, Caja de Valores, PSP ni core bancario — los datos
  son ficticios y viven en memoria del servidor.
- No hay tokenización ni blockchain visible — esto es el MVP operativo de SCF/
  confirming (closed-loop), consistente con la recomendación del propio doc de
  arquitectura de Mills: "no priorizar blockchain visible al usuario" en esta fase.
- Autenticación simplificada para demo (sin hash de contraseña, sin 2FA, sin
  KYC/KYB) — no usar esta base de auth tal cual en producción.
- Un solo pagador ancla y un solo proveedor cargados; el modelo de datos ya
  soporta N-a-N para cuando haya más de uno.

## Próximos pasos sugeridos

Mapeado contra el backlog de historias de usuario ya existente en el proyecto:

- AUTH-02/03: proteger rutas por rol con matriz de permisos completa y sidebar
  dinámica multi-nivel (ya hay una base, falta granularidad de mills_admin vs
  mills_ops si el banco necesita más de un tipo de usuario interno).
- E3 Motor de riesgo (RISK-01 a RISK-07): drill-down explicable, comparación de
  entidades, stress test, backtest — el `/banco/scoring` actual es una vista global
  simplificada, no el motor de riesgo completo.
- E5/E6/E7 portal del pagador: reglas de aprobación por bracket (PAG-03), carga/
  importación de facturas por CSV o ERP (PAG-06), cola de conformidades (PAG-09),
  aprobaciones (PAG-11) — hoy solo está el loop core de conformidad.
- E9 portal del proveedor: flujo de descuento completo en 3 pasos con firma digital
  simulada (PROV-05/06/07) — hoy solo está "pedir anticipo" en un paso.
- Persistencia real (hoy es in-memory) — base de datos + migraciones.
