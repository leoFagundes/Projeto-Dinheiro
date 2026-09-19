import { LoginForm } from "./_components/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-semibold">Admin</h1>
        <LoginForm />
      </div>
    </main>
  );
}
