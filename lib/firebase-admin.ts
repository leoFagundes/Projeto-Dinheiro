import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0]!;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Chaves privadas em .env costumam vir com \n escapado — precisa desescapar.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Credenciais do Firebase Admin ausentes. Configure FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY no .env.local.",
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

/** Lazy — só inicializa (e só exige as credenciais) quando realmente usado. */
export function getAdminAuth() {
  return getAuth(getAdminApp());
}

/** Lazy — o SDK Admin ignora as regras de segurança do Firestore (uso restrito ao /admin). */
export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
