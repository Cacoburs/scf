# Fondos S.A. — MVP funcional (demo)

MVP navegable de la plataforma de Supply Chain Finance / factoring: **3 portales**
(banco/fondo, empresa ancla, proveedor) conectados por un mismo ciclo de vida de
factura. Pensado para mostrar la operatoria completa a stakeholders — incluido
Fondos S.A. — antes de construir integraciones reales.

## Qué incluye esta iteración

- Landing con los 3 portales.
- Login independiente por rol (`/banco/login`, `/pagador/login`, `/proveedor/login`),
  con sesión por cookie y redirección según rol — igual al criterio AUTH-01 del
  backlog de historias de usuario original.
- Dashboard funcional por rol, con datos que **se actualizan en vivo y cruzan entre
  portales** (no son pantallas estáticas):
  - **Fondos S.A.** — cola de aprobación de fondeo, cartera activa, aprobar/rechazar.
  - **YPF (empresa ancla)** — facturas pendientes de conformidad, ciclo en curso.
  - **Errázuriz S.A. (proveedor)** — cuánto puede cobrar hoy, pedir anticipo.
- Portal del Fondo (Fondos S.A.) ya completo para las historias P1/P2 de la épica E2:
  - **Explorador maestro de facturas** (`/banco/facturas`) — filtros, paginación, export CSV real
    y acciones de intervención manual (revisión L2, bloqueo anti-fraude, override aprobar/rechazar).
  - **Cartera activa** (`/banco/cartera`) — total vigente, concentración por pagador con gráfico
    de barra apilada, y acciones sobre la línea (ampliar, watch list, bloquear cesiones).
  - **Pagadores ancla** (`/banco/pagadores`) — CRM con lifecycle, ejecutivo, revenue, SLA y alta
    con control 4-eyes (`/banco/pagadores/nuevo`).
  - **Proveedores** (`/banco/proveedores`) — CRM con nivel KYB, pagadores asociados, alertas, e
    invitación de nuevos proveedores (`/banco/proveedores/invitar`).
  - **Scoring** (`/banco/scoring`) — distribución de scores, ranking por entidad y "Recalcular ahora".
  - El modelo de datos ahora tiene 4 pagadores y 6 proveedores (antes 1 y 1) para que estas vistas
    de cartera/CRM tengan volumen realista — el circuito de demo original (YPF ↔ Errázuriz S.A.)
    sigue intacto.
- El resto de los ítems del menú (`Límites`, `Equipo`, etc.) siguen como placeholder — quedan
  para la próxima iteración, no rompen la navegación.

## Cómo correrlo

Requiere Node.js 22.5+ (usa `node:sqlite`, incluido en el propio Node).

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000`. El servidor recarga solo al guardar cambios.

No hay build ni bundler: es TypeScript corriendo directo con `tsx`, sin
dependencias de producción. Los datos viven en `data/mills.sqlite` (se crea
solo la primera vez, con los datos de ejemplo) — **ya no se borran al
reiniciar el servidor**. Si en algún momento querés volver al estado inicial
de la demo, borrá ese archivo (`rm data/mills.sqlite`) y arrancá de nuevo.

La firma de las cookies de sesión usa `SESSION_SECRET` del entorno; si no la
definís, se genera una al azar en cada arranque (las sesiones no sobreviven
un reinicio, pero no hay ningún secreto fijo dando vueltas en el repo). Para
que las sesiones persistan entre reinicios, corré con una fija:

```bash
SESSION_SECRET="una-clave-larga-y-random" npm run dev
```

## Accesos de demostración

| Portal | Email | Contraseña |
|---|---|---|
| Fondos S.A. | `mesa@fondossa.com.ar` | `demo1234` |
| YPF (ancla) | `finanzas@ypf.com.ar` | `demo1234` |
| Errázuriz S.A. (proveedor) | `pagos@errazuriz.com.ar` | `demo1234` |

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
  son ficticios, aunque ya persisten en una base real (ver más abajo).
- No hay tokenización ni blockchain visible — esto es el MVP operativo de SCF/
  confirming (closed-loop), consistente con la recomendación del propio doc de
  arquitectura: "no priorizar blockchain visible al usuario" en esta fase.
- Autenticación simplificada para demo (sin 2FA, sin KYC/KYB real) — las
  contraseñas si están hasheadas (`scrypt`), pero no hay recuperación de
  contraseña, ni signup, ni rotación de credenciales.
- Sin CSRF tokens en los formularios (mitigado parcialmente por cookies
  `SameSite=Lax`, pero no es protección completa).
- Sin rate limiting en el login — nada impide reintentar contraseñas en bucle.

## Base de datos y seguridad (agregado en esta iteración)

- **Persistencia real**: SQLite vía `node:sqlite` (nativo de Node, sin
  dependencias nuevas). Ver `src/lib/db.ts` para el esquema y la siembra
  inicial, y `src/lib/data.ts` para cómo el resto del código lee/escribe.
- **Contraseñas hasheadas**: `scrypt` + salt por usuario (`src/lib/crypto.ts`),
  nunca texto plano. El tipo `User` ya ni siquiera tiene un campo `password`.
- **Sin secretos hardcodeados**: `SESSION_SECRET` sale del entorno, nunca del
  código.
- **Sin XSS almacenado**: todo texto que puede haber escrito un usuario
  (razón social, sector, ejecutivo, mensajes de confirmación) se escapa antes
  de insertarse en el HTML (`esc()` en `src/templates/layout.ts`). Probado
  con un payload real (`<img src=x onerror="alert(...)">`) en los formularios
  de alta de pagador e invitación de proveedor.
- **Validación server-side**: el alta de pagador rechaza con un 400 y un
  mensaje claro si falta algún campo o el límite de exposición no es un
  número válido — no alcanza con la validación del navegador.

## Integraciones externas (agregado en esta iteración)

`src/lib/integraciones/` tiene un "enchufe" por cada servicio externo que la
plataforma va a necesitar antes de mover datos y plata reales: Pagos (banco/
PSP), Firma digital, Verificación de identidad (KYC/KYB), Factura electrónica
(ARCA) y Notificaciones. Hoy los cinco están en su versión simulada — se
comportan como si funcionaran, pero no llaman a ningún sistema externo. Tres
de los cinco ya están conectados a botones reales de la app (aprobar fondeo,
adelantar, pedir upgrade KYB) para probar el mecanismo sin cambiar lo que se
ve en pantalla. Ver **[docs/INTEGRACIONES.md](docs/INTEGRACIONES.md)** para
una explicación de cada uno en lenguaje no técnico, y `.env.example` para las
variables de entorno que van a hacer falta cuando se conecten de verdad.

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
- CSRF tokens reales en los formularios (hoy solo mitigado por `SameSite=Lax`).
- Rate limiting en el login para frenar fuerza bruta.
- Migrar de SQLite a Postgres cuando haga falta multi-tenant real o más de un
  proceso corriendo en paralelo (SQLite es un solo archivo, un solo escritor).
