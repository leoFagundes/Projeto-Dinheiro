import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h em segundos

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET não configurado.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/**
 * Token simples assinado com HMAC (sem JWT/lib externa — evita puxar uma
 * dependência ESM-only pro mesmo bundle do firebase-admin, que já teve
 * conflito real com isso). Formato: "admin.<expiraEm>.<assinatura>".
 */
export async function createAdminSessionToken(): Promise<string> {
  const expiresAt = Date.now() + ADMIN_COOKIE_MAX_AGE * 1000;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Verifica o token da sessão admin. Nunca lança — retorna false pra qualquer token ausente/inválido/expirado. */
export async function verifyAdminSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot === -1) return false;

    const payload = token.slice(0, lastDot);
    const signature = token.slice(lastDot + 1);
    const expected = sign(payload);

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (signatureBuffer.length !== expectedBuffer.length) return false;
    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return false;

    const [marker, expiresAtRaw] = payload.split(".");
    if (marker !== "admin") return false;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

    return true;
  } catch {
    return false;
  }
}
