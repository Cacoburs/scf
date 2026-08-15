import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Role } from "./types.js";

// Secreto de sesión solo para la demo. En producción: variable de entorno,
// rotación de claves, cookies httpOnly+secure detrás de HTTPS real, etc.
const SESSION_SECRET = "mills-mvp-demo-secret-no-usar-en-produccion";
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
