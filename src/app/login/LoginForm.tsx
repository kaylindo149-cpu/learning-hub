"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KaylinLogo } from "@/components/KaylinLogo";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = useMemo(() => {
    const next = searchParams.get("next");

    return next && next.startsWith("/") ? next : "/";
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        setMessage("Password is not right.");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setMessage("Could not check the password. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-md border border-ink/10 bg-white/55 p-6 shadow-soft sm:p-8">
      <div className="flex justify-center">
        <KaylinLogo />
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-sage">
          Private archive
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">
          Enter password
        </h1>
      </div>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="sr-only">Password</span>
          <input
            autoComplete="current-password"
            autoFocus
            className="w-full border border-ink/15 bg-paper px-4 py-3 text-base font-semibold outline-none transition placeholder:text-ink/35 focus:border-sage"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            value={password}
          />
        </label>

        <button
          className="w-full border border-ink bg-ink px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-paper transition hover:border-sage hover:bg-sage disabled:cursor-not-allowed disabled:border-ink/20 disabled:bg-ink/20"
          disabled={isSubmitting || !password}
          type="submit"
        >
          {isSubmitting ? "Checking..." : "Unlock"}
        </button>
      </form>

      {message ? (
        <p className="mt-4 text-center text-sm font-semibold text-clay">
          {message}
        </p>
      ) : null}
    </section>
  );
}
