import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-session";
import { UsersTable, type AdminUser } from "./_components/UsersTable";
import { FeedbackTable, type AdminFeedback } from "./_components/FeedbackTable";
import { adminLogout } from "./actions";

export default async function AdminPage() {
  // O Proxy já faz essa checagem antes de chegar aqui, mas a página confirma de novo —
  // "sempre verifique dentro de cada Server Function/página, nunca só no Proxy".
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminSessionToken(token))) {
    redirect("/admin/login");
  }

  let authUsers;
  let db;
  let feedbackDocs;
  try {
    authUsers = (await getAdminAuth().listUsers(1000)).users;
    db = getAdminFirestore();
    feedbackDocs = (await db.collection("feedback").orderBy("criadoEm", "desc").get()).docs;
  } catch (error) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-5 py-8">
        <h1 className="text-lg font-semibold">Usuários</h1>
        <p className="rounded-card bg-negative-soft p-4 text-sm text-negative">
          Não foi possível conectar ao Firebase Admin. Confira{" "}
          <code>FIREBASE_ADMIN_CLIENT_EMAIL</code> e <code>FIREBASE_ADMIN_PRIVATE_KEY</code> nas
          variáveis de ambiente — e, se acabou de configurá-las, lembre de fazer um novo deploy
          (variáveis novas só valem a partir do próximo deploy).
          <br />
          <span className="text-xs text-ink-muted">
            {error instanceof Error ? error.message : String(error)}
          </span>
        </p>
        <form action={adminLogout}>
          <button type="submit" className="text-sm text-ink-muted hover:text-negative">
            Sair
          </button>
        </form>
      </main>
    );
  }

  // Resumo de uso a partir das transações — não usa orderBy pra não depender
  // de um índice composto que este projeto nunca precisou até aqui.
  const usage = await Promise.all(
    authUsers.map(async (user) => {
      const snap = await db
        .collection("transactions")
        .where("userId", "==", user.uid)
        .select("criadoEm")
        .get();
      let ultimaAtividade: number | null = null;
      for (const doc of snap.docs) {
        const criadoEm = doc.data().criadoEm as number | undefined;
        if (criadoEm != null && (ultimaAtividade === null || criadoEm > ultimaAtividade)) {
          ultimaAtividade = criadoEm;
        }
      }
      return { uid: user.uid, totalTransacoes: snap.size, ultimaAtividade };
    }),
  );
  const usageByUid = new Map(usage.map((u) => [u.uid, u]));

  const users: AdminUser[] = authUsers
    .map((user) => ({
      uid: user.uid,
      email: user.email ?? "(sem e-mail)",
      displayName: user.displayName ?? null,
      disabled: user.disabled,
      createdAt: user.metadata.creationTime,
      lastSignInAt: user.metadata.lastSignInTime ?? null,
      providers: user.providerData.map((p) => p.providerId),
      totalTransacoes: usageByUid.get(user.uid)?.totalTransacoes ?? 0,
      ultimaAtividade: usageByUid.get(user.uid)?.ultimaAtividade ?? null,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const feedbackList: AdminFeedback[] = feedbackDocs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userEmail: (data.userEmail as string | undefined) ?? "",
      tipo: data.tipo,
      mensagem: data.mensagem,
      status: data.status,
      criadoEm: data.criadoEm,
    };
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Admin</h1>
        <form action={adminLogout}>
          <button
            type="submit"
            className="text-sm text-ink-muted transition-transform active:scale-95 hover:text-negative"
          >
            Sair
          </button>
        </form>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">Usuários ({users.length})</h2>
        <UsersTable users={users} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">Feedback ({feedbackList.length})</h2>
        <FeedbackTable items={feedbackList} />
      </section>
    </main>
  );
}
