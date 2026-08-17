import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Role } from "./types.js";

// El secreto de firma de la sesión viene de una variable de entorno — nunca
// hardcodeado ni commiteado. Si no está seteada (typ. en desarrollo local),
// se genera una al azar en cada arranque: las sesiones no sobreviven un
// reinicio del servidor, pero tampoco hay ningún secreto fijo dando vueltas
// en el repo. Para producción: SESSION_SECRET fija en el entorno, rotación
// de claves, cookies httpOnly+secure detrás de HTTPS real, etc.
const SESSION_SECRET = process.env.SESSION_SECRET ?? crypto.randomBytes(32).toString("hex");
if (!process.env.SESSION_SECRET) {
  console.warn(
    "[auth] SESSION_SECRET no está definida — usando una generada al azar para esta corrida. " +
      "Definila en el entorno antes de desplegar a producción."
  );
}
const COOKIE_NAME = "mills_session";

export interface Session {
  userId: string;
  role: Role;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function createSessionCookie(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = sign(payload);
  const value = `${payload}.${signature}`;
  const maxAge = 60 * 60 * 8; // 8 horas
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

export function getSession(req: IncomingMessage): Session | null {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  if (sign(payload) !== signature) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

export function requireRole(
  req: IncomingMessage,
  res: ServerResponse,
  role: Role
): Session | null {
  const session = getSession(req);
  if (!session) {
    res.writeHead(302, { Location: `/${role}/login` });
    res.end();
    return null;
  }
  if (session.role !== role) {
    res.writeHead(302, { Location: `/${session.role}` });
    res.end();
    return null;
  }
  return session;
}
