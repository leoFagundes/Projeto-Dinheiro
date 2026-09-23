import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "./_components/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-semibold">Admin</h1>
        <LoginForm />
        <Link
          href="/"
          className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm text-ink-muted hover:underline"
        >
          <ArrowLeft size={14} />
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}
