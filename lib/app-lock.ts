"use client";

// Bloqueio local do app (não é segurança de conta — é uma trava rápida de
// tela, tipo apps de notas com PIN). Tudo fica só neste aparelho
// (localStorage), nunca sincroniza pelo Firestore: o PIN não é guardado em
// texto puro, só o hash (SHA-256 + salt aleatório); a biometria usa WebAuthn
// com o autenticador da própria plataforma (Face/Touch ID, impressão digital
// do Android), também sem depender de servidor — só verifica que o
// autenticador local aprova, sem validar assinatura contra nada remoto.

const PIN_HASH_KEY = "bloqueio:pinHash";
const PIN_SALT_KEY = "bloqueio:salt";
const ENABLED_KEY = "bloqueio:ativo";
const BIOMETRIC_CREDENTIAL_KEY = "bloqueio:credencialBiometrica";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function isAppLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ENABLED_KEY) === "1" && Boolean(localStorage.getItem(PIN_HASH_KEY));
  } catch {
    return false;
  }
}

export function hasBiometricCredential(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY));
  } catch {
    return false;
  }
}

export function supportsBiometric(): boolean {
  return typeof window !== "undefined" && "PublicKeyCredential" in window;
}

export async function setAppLockPin(pin: string): Promise<void> {
  const salt = randomHex(16);
  const hash = await sha256Hex(salt + pin);
  localStorage.setItem(PIN_SALT_KEY, salt);
  localStorage.setItem(PIN_HASH_KEY, hash);
  localStorage.setItem(ENABLED_KEY, "1");
}

export function disableAppLock(): void {
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  localStorage.removeItem(ENABLED_KEY);
  localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
}

export async function verifyAppLockPin(pin: string): Promise<boolean> {
  try {
    const salt = localStorage.getItem(PIN_SALT_KEY);
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    if (!salt || !storedHash) return false;
    const hash = await sha256Hex(salt + pin);
    return hash === storedHash;
  } catch {
    return false;
  }
}

/** Registra um autenticador biométrico da plataforma pra este app, neste aparelho. */
export async function registerBiometric(uid: string, label: string): Promise<boolean> {
  if (!supportsBiometric()) return false;
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Projeto Dinheiro" },
        user: {
          id: new TextEncoder().encode(uid),
          name: label,
          displayName: label,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
    if (!credential) return false;
    localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, bufferToBase64Url(credential.rawId));
    return true;
  } catch {
    return false;
  }
}

/** Pede a biometria da plataforma; true só se o autenticador confirmar a identidade local. */
export async function verifyBiometric(): Promise<boolean> {
  if (!supportsBiometric()) return false;
  const credentialIdB64 = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
  if (!credentialIdB64) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: base64UrlToBuffer(credentialIdB64), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}
