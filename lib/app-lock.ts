"use client";

// Bloqueio local do app (não é segurança de conta — é uma trava rápida de
// tela, tipo apps de notas com PIN). Tudo fica só neste aparelho
// (localStorage), nunca sincroniza pelo Firestore: o PIN não é guardado em
// texto puro, só o hash (SHA-256 + salt aleatório); a biometria usa WebAuthn
// com o autenticador da própria plataforma (Face/Touch ID, impressão digital
// do Android), também sem depender de servidor — só verifica que o
// autenticador local aprova, sem validar assinatura contra nada remoto.
//
// Todas as chaves são escopadas por uid: o mesmo aparelho pode ter mais de
// uma conta logada em momentos diferentes, e sem o uid na chave o PIN/
// biometria de uma conta "vazava" pra outra (pedia a digital da conta
// errada depois de trocar de usuário).

function pinHashKey(uid: string) {
  return `bloqueio:${uid}:pinHash`;
}
function pinSaltKey(uid: string) {
  return `bloqueio:${uid}:salt`;
}
function enabledKey(uid: string) {
  return `bloqueio:${uid}:ativo`;
}
function biometricCredentialKey(uid: string) {
  return `bloqueio:${uid}:credencialBiometrica`;
}

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

export function isAppLockEnabled(uid: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(enabledKey(uid)) === "1" && Boolean(localStorage.getItem(pinHashKey(uid)));
  } catch {
    return false;
  }
}

export function hasBiometricCredential(uid: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(biometricCredentialKey(uid)));
  } catch {
    return false;
  }
}

export function supportsBiometric(): boolean {
  return typeof window !== "undefined" && "PublicKeyCredential" in window;
}

export async function setAppLockPin(uid: string, pin: string): Promise<void> {
  const salt = randomHex(16);
  const hash = await sha256Hex(salt + pin);
  localStorage.setItem(pinSaltKey(uid), salt);
  localStorage.setItem(pinHashKey(uid), hash);
  localStorage.setItem(enabledKey(uid), "1");
}

export function disableAppLock(uid: string): void {
  localStorage.removeItem(pinHashKey(uid));
  localStorage.removeItem(pinSaltKey(uid));
  localStorage.removeItem(enabledKey(uid));
  localStorage.removeItem(biometricCredentialKey(uid));
}

export async function verifyAppLockPin(uid: string, pin: string): Promise<boolean> {
  try {
    const salt = localStorage.getItem(pinSaltKey(uid));
    const storedHash = localStorage.getItem(pinHashKey(uid));
    if (!salt || !storedHash) return false;
    const hash = await sha256Hex(salt + pin);
    return hash === storedHash;
  } catch {
    return false;
  }
}

/** Registra um autenticador biométrico da plataforma pra este app, neste aparelho, vinculado a esta conta. */
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
    localStorage.setItem(biometricCredentialKey(uid), bufferToBase64Url(credential.rawId));
    return true;
  } catch {
    return false;
  }
}

/** Pede a biometria da plataforma pra esta conta; true só se o autenticador confirmar a identidade local. */
export async function verifyBiometric(uid: string): Promise<boolean> {
  if (!supportsBiometric()) return false;
  const credentialIdB64 = localStorage.getItem(biometricCredentialKey(uid));
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
