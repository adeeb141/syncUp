"use client";
import { api } from "@/lib/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { User } from "@/types";
import Link from "next/link";

export default function LoginPage() {
  const [emailField, setEmail] = useState("");
  const [passwordField, setPassword] = useState("");
  const [loginFail, setLoginFail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { setAuth } = useAuthStore();

  const submitHandler = () => {
    const email = emailField;
    const password = passwordField;

    const login = async () => {
      setIsSubmitting(true);
      try {
        const result = await api.post<{ message: string; userInfo: User }>("/api/auth/login", { email, password });
        setLoginFail(false);
        setAuth(result.userInfo);
        router.push("/workspaces");
      } catch {
        setLoginFail(true);
      } finally {
        setIsSubmitting(false);
      }
    };
    login();
  };

  return (
    <div className="sync-auth-bg min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-[color:var(--surface-border)] sync-surface md:grid-cols-2 md:rounded-[2rem]">
        <section className="relative flex flex-col justify-between gap-8 overflow-hidden border-b border-[color:var(--surface-border)] px-6 py-8 md:border-b-0 md:border-r md:px-10 md:py-12">
          <div className="pointer-events-none absolute -left-14 top-10 h-52 w-52 rounded-full bg-[rgba(90,112,176,0.22)] blur-3xl animate-[float_7s_ease-in-out_infinite]" />
          <div className="pointer-events-none absolute -right-12 bottom-8 h-44 w-44 rounded-full bg-[rgba(73,137,158,0.22)] blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-gradient)] font-[var(--font-heading)] text-lg font-bold text-[color:var(--primary-foreground)] shadow-[0_8px_18px_rgba(66,96,157,0.34)]">
              S
            </div>
            <span className="sync-title text-2xl">SyncUp</span>
          </div>
          <div className="relative z-10 max-w-sm space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Team Workspace Platform
            </p>
            <h1 className="sync-title text-3xl leading-tight sm:text-4xl">
              Collaborate. Track. Deliver.
            </h1>
            <p className="text-sm leading-relaxed text-[color:var(--text-secondary)] sm:text-[0.95rem]">
              Build reliable momentum across projects, align everyone in one place, and ship work with calm clarity.
            </p>
          </div>
          <div className="relative z-10 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-2)]/70 p-4 backdrop-blur">
            <p className="text-sm text-[color:var(--text-secondary)]">
              Trusted by teams that value clean planning, focused execution, and clear delivery.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-8 md:px-10">
          <div className="w-full max-w-md rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)]/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur md:p-8 animate-[scaleIn_0.45s_ease-out_both]">
            <div className="mb-8">
              <h2 className="sync-title mb-2 text-[1.75rem]">Welcome back</h2>
              <p className="text-sm text-[color:var(--text-muted)]">
                Please enter your details to sign in.
              </p>
            </div>

            {loginFail && (
              <div className="sync-danger mb-6 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium animate-[shake_0.35s_ease]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Invalid email or password.
              </div>
            )}

            <div className="mb-5">
              <label className="sync-label">Email address</label>
              <input
                type="email"
                placeholder="name@company.com"
                onChange={(e) => setEmail(e.target.value)}
                value={emailField}
                className="sync-input"
              />
            </div>

            <div className="mb-7">
              <div className="mb-2 flex items-center justify-between">
                <label className="sync-label mb-0">Password</label>
                <Link href="#" className="sync-link text-xs font-semibold">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="********"
                onChange={(e) => setPassword(e.target.value)}
                value={passwordField}
                className="sync-input"
              />
            </div>

            <button
              className="sync-btn-primary w-full rounded-xl py-3.5 font-[var(--font-heading)] text-[0.95rem] font-semibold disabled:pointer-events-none disabled:opacity-70"
              onClick={submitHandler}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2.5">
                  <span className="h-4 w-4 rounded-full border-[2px] border-[rgba(236,241,255,0.35)] border-t-[color:var(--primary-foreground)] animate-[spin_0.8s_linear_infinite]" />
                  Signing in...
                </span>
              ) : (
                "Sign in to SyncUp"
              )}
            </button>

            <p className="mt-7 text-center text-sm text-[color:var(--text-muted)]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="sync-link font-semibold">
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
