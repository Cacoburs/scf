# Integraciones externas — qué está listo y qué falta pedir

Este documento explica, sin código, los seis puntos donde la plataforma va a
necesitar conectarse con un servicio de un tercero para dejar de ser una demo
y pasar a mover información y plata real. Para cada uno: qué hace hoy (en
modo simulado), qué haría en producción, y qué hay que conseguir antes de
poder activarlo.

En el código, cada uno de estos puntos vive en `src/lib/integraciones/` como
un archivo separado. Hoy todos están en su versión "Simulada" — hacen como
que funcionan (para que la demo se sienta completa) pero no se conectan a
ningún sistema externo. El día que se firme un contrato con un proveedor
real, un desarrollador escribe una segunda versión de ese mismo archivo que
sí llama a la API de verdad, y el resto de la plataforma no se entera del
cambio — sigue funcionando igual.

---

## 1. Pagos (Banco / PSP) — `src/lib/integraciones/pagos.ts`

**Qué hace hoy:** cuando Fondos S.A. aprueba un fondeo, esta pieza "desembolsa"
al instante y siempre con éxito. No se mueve plata real.

**Qué haría en producción:** llamar a la API de un banco o de un procesador
de pagos (PSP) para transferir la plata a la cuenta del proveedor, y avisar
cuando esa transferencia efectivamente se acredite (no es instantáneo).

**Qué hay que conseguir antes de activarlo:**
- Un banco o PSP con API de transferencias a CBU/CVU (ejemplos de PSP en
  Argentina: Prisma, dLocal, o directamente la API de un banco).
- Credenciales de API de prueba (sandbox) y de producción.
- Definir de qué cuenta sale la plata (la cuenta operativa de Fondos S.A.).
- Definir cómo nos enteramos de que un pago se acreditó de verdad (un
  webhook que el banco nos llame, o un archivo de conciliación).

---

## 2. Firma digital — `src/lib/integraciones/firmaDigital.ts`

**Qué hace hoy:** cuando un proveedor pide el anticipo, esta pieza "firma" la
cesión al instante. No hay ningún documento legal firmado de verdad.

**Qué haría en producción:** generar y firmar digitalmente el documento de
cesión de la factura, con validez legal, usando la identidad del proveedor.

**Qué hay que conseguir antes de activarlo — hay dos caminos posibles:**
- **Camino AFIP:** usar el certificado y clave fiscal que cada proveedor ya
  tiene con AFIP. Requiere que cada proveedor habilite ese servicio en su
  cuenta AFIP, y que nosotros nos conectemos a los servicios web de AFIP.
- **Camino proveedor externo:** contratar un servicio de firma electrónica
  (DocuSign, Yousign, o similar) y darle de alta a cada proveedor ahí.
  Más simple de integrar, pero el documento firmado tiene menos peso legal
  "oficial" que uno firmado con AFIP.

---

## 3. Verificación de identidad — KYC/KYB — `src/lib/integraciones/kyc.ts`

**Qué hace hoy:** cuando alguien pide subir el nivel de verificación de un
proveedor (botón "Pedir upgrade KYB"), esta pieza aprueba el upgrade al
instante, sin chequear nada de verdad.

**Qué haría en producción:** verificar la identidad de la empresa y de sus
beneficiarios finales (quiénes son los dueños reales), chequear que no estén
en listas de sanciones internacionales, y detectar si alguno es una Persona
Expuesta Políticamente (PEP) — esto es un requisito regulatorio, no solo
prolijidad.

**Qué hay que conseguir antes de activarlo:**
- Elegir un proveedor de KYC/KYB (opciones internacionales: Sumsub, Veriff,
  Onfido; también hay proveedores locales argentinos).
- Firmar un contrato comercial con ese proveedor y conseguir su API key.
- Definir junto con Legal/Compliance qué corresponde exactamente a cada
  nivel interno (L1, L2, L3): qué documentación pide cada uno.

---

## 4. Factura electrónica (ARCA, ex AFIP) — `src/lib/integraciones/facturacionElectronica.ts`

**Qué hace hoy:** ya está conectada al botón "Buscar en ARCA" de la pantalla
"Cargar factura" del pagador. Cuando se busca un CUIT, devuelve una lista de
comprobantes **inventados pero estables** (el mismo CUIT siempre trae los
mismos comprobantes) — no hay ninguna consulta real a ARCA todavía.

**Qué haría en producción:** consultar contra ARCA los comprobantes que un
CUIT emitió de verdad (servicio de "Comprobantes en línea" o WSFE), y por
separado, antes de aceptar una factura al circuito de descuento, chequear que
el CAE (Código de Autorización Electrónico) esté vigente y que los datos
coincidan. Esto es clave para evitar el fraude de facturas truchas o
duplicadas.

**Qué hay que conseguir antes de activarlo:**
- Acceso a los servicios web de ARCA para facturación electrónica.
- El certificado y la clave fiscal de cada pagador que va a consultar
  comprobantes (cada empresa tiene que autorizar esto en su propia cuenta
  ARCA — esto lo tramita el pagador, no es algo que resolvamos con código).

---

## 5. Extracción de datos de archivos — `src/lib/integraciones/extraccionDocumentos.ts`

**Qué hace hoy:** conectada al botón "Extraer datos del archivo" de "Cargar
factura". Cuando se sube un PDF o una foto, "lee" el archivo y completa
número, fechas, monto y CAE — pero es una simulación: no hay ningún OCR ni
modelo leyendo el documento de verdad, los valores salen de una fórmula
determinística a partir del contenido del archivo (el mismo archivo siempre
da los mismos datos, para que la demo se sienta consistente).

**Qué haría en producción:** leer el archivo de verdad con un servicio de OCR
o de "document AI" y devolver los campos que efectivamente encuentre —
incluyendo la posibilidad de que no encuentre todo, o se equivoque, cosa que
la demo no contempla.

**Qué hay que conseguir antes de activarlo:**
- Un proveedor de OCR/document AI (puede ser un modelo con visión de
  propósito general, o uno especializado en comprobantes argentinos).
- Contrato comercial + API key de ese proveedor.
- Definir qué hacer cuando la extracción viene incompleta o dudosa — hoy no
  hay ningún manejo de ese caso porque la simulación nunca falla a medias.

---

## 6. Notificaciones (email / SMS) — `src/lib/integraciones/notificaciones.ts`

**Qué hace hoy:** cuando pasa algo relevante (se aprueba un fondeo, un
proveedor pide un anticipo), esta pieza solo escribe un mensaje en los logs
del servidor — nadie recibe un email ni un SMS de verdad. Adentro de la app
sigue funcionando el mensaje en pantalla (el cartel verde que aparece
arriba), pero eso solo lo ve alguien que esté mirando la pantalla en ese
momento.

**Qué haría en producción:** mandar un email (o SMS) de verdad cada vez que
a alguien le conviene enterarse de algo sin tener que estar con la
plataforma abierta — por ejemplo, avisarle a un proveedor que le aprobaron
el fondeo, o avisarle al Fondo que llegó una solicitud nueva.

**Qué hay que conseguir antes de activarlo:**
- Una cuenta en un servicio de envío de emails (Resend, SendGrid, Amazon SES
  son las opciones más comunes) y/o de SMS (Twilio).
- Un dominio propio verificado para que los emails no caigan en spam
  (ej. `notificaciones@fondossa.com.ar`).

---

## Resumen para llevar a una conversación comercial

| Integración | Con quién hablar | Lo mínimo que necesitamos que nos den |
|---|---|---|
| Pagos | Un banco o un PSP | API de transferencias + credenciales sandbox |
| Firma digital | AFIP o un proveedor de firma electrónica | Acceso a servicios web / cuenta + API key |
| KYC/KYB | Un proveedor de verificación de identidad | Contrato + API key |
| Factura electrónica | ARCA (directo, es un organismo público) | Acceso a servicios web de facturación electrónica |
| Extracción de archivos | Un proveedor de OCR/document AI | Contrato + API key |
| Notificaciones | Un proveedor de email/SMS | Cuenta + API key + dominio verificado |

Ninguna de estas conexiones está activada todavía — la plataforma sigue
siendo 100% una demo con datos ficticios. Lo que sí está listo es el lugar
exacto en el código donde cada una se va a enchufar, para que conectar una
de estas no implique reescribir la plataforma.
