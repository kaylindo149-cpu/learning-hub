import { Suspense } from "react";
import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10 text-ink">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
