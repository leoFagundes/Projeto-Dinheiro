"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminAuth } from "@/lib/firebase-admin";
import {
  ADMIN_COOKIE_MAX_AGE,
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

export type AdminLoginState = { error?: string } | undefined;

export async function adminLogin(
  _prevState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return {
      error:
        "Configuração do servidor incompleta: ADMIN_PASSWORD ou ADMIN_SESSION_SECRET não estão definidos nesse ambiente. Se acabou de configurar no Vercel, falta fazer um redeploy.",
    };
  }

  const password = formData.get("password");

  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    return { error: "Senha incorreta." };
  }

  const token = await createAdminSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  redirect("/admin");
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

/** Repete a checagem de sessão dentro da action — o Proxy sozinho não basta como defesa. */
async function requireAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const ok = await verifyAdminSessionToken(token);
  if (!ok) {
    redirect("/admin/login");
  }
}

export async function setUserDisabled(uid: string, disabled: boolean) {
  await requireAdminSession();
  await getAdminAuth().updateUser(uid, { disabled });
  revalidatePath("/admin");
}
