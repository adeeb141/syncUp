"use client";
import { api } from "@/lib/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import Link from "next/link";

export default function RegisterPage() {
  const [nameField, setName] = useState("");
  const [emailField, setEmail] = useState("");
  const [passwordField, setPassword] = useState("");
  const [registerFail, setRegFail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const submitHandler = () => {
    const name = nameField;
    const email = emailField;
    const password = passwordField;

    const signup = async () => {
      setIsSubmitting(true);
      try {
        await api.post<{ message: string; userInfo: User }>("/api/auth/signup", { name, email, password });
        setRegFail(false);
        router.push("/login");
      } catch {
        setRegFail(true);
      } finally {
        setIsSubmitting(false);
      }
    };
    signup();
  };

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
      {/* Background Decorative Blurs */}
      <div className="pointer-events-none absolute -left-14 top-10 h-52 w-52 rounded-full bg-primary-container/40 blur-3xl animate-[float_7s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -right-12 bottom-8 h-44 w-44 rounded-full bg-tertiary-container/20 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-[0_12px_40px_rgba(44,52,55,0.08)] md:grid-cols-2 md:rounded-[2rem]">
        {/* Left Panel — Branding */}
        <section className="relative flex flex-col justify-between gap-8 overflow-hidden border-b border-outline-variant/10 px-6 py-8 md:border-b-0 md:border-r md:px-10 md:py-12 bg-surface-container-low">
          <div className="pointer-events-none absolute -left-14 top-10 h-52 w-52 rounded-full bg-primary-container/30 blur-3xl animate-[float_7s_ease-in-out_infinite]" />
          <div className="pointer-events-none absolute -right-12 bottom-8 h-44 w-44 rounded-full bg-secondary-container/20 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-gradient text-lg font-bold text-on-primary shadow-lg font-headline">
              S
            </div>
            <span className="font-headline text-2xl font-bold text-on-surface tracking-tight">SyncUp</span>
          </div>
          <div className="relative z-10 max-w-sm space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              Team Workspace Platform
            </p>
            <h1 className="font-headline text-3xl font-extrabold leading-tight text-on-surface tracking-tight sm:text-4xl">
              Collaborate. Track. Deliver.
            </h1>
            <p className="text-sm leading-relaxed text-on-surface-variant sm:text-[0.95rem]">
              Create a focused workspace where your team can plan clearly, track work continuously, and deliver without friction.
            </p>
          </div>
          <div className="relative z-10 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/70 p-4 backdrop-blur">
            <p className="text-sm text-on-surface-variant">
              Simple setup, dependable structure, and a UI designed for serious collaboration.
            </p>
          </div>
        </section>

        {/* Right Panel — Register Form */}
        <section className="flex items-center justify-center px-4 py-8 sm:px-8 md:px-10">
          <div className="w-full max-w-md rounded-3xl border border-outline-variant/15 bg-surface-container-low/95 p-6 shadow-[0_12px_34px_rgba(44,52,55,0.06)] backdrop-blur md:p-8 animate-[scaleIn_0.45s_ease-out_both]">
            <div className="mb-8">
              <h2 className="font-headline text-[1.75rem] font-extrabold text-on-surface tracking-tight mb-2">Create account</h2>
              <p className="text-sm text-on-surface-variant">
                Get started with SyncUp for free.
              </p>
            </div>

            {registerFail && (
              <div className="mb-6 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium bg-error-container/20 border border-error/20 text-error animate-[shake_0.35s_ease]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Something went wrong. Please try again.
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); submitHandler(); }}>
              <div className="mb-5">
                <label className="block mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Full name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  onChange={(e) => setName(e.target.value)}
                  value={nameField}
                  className="w-full rounded-xl border-none bg-surface-container-highest/60 px-4 py-3 text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                />
              </div>

              <div className="mb-5">
                <label className="block mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Email address</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  onChange={(e) => setEmail(e.target.value)}
                  value={emailField}
                  className="w-full rounded-xl border-none bg-surface-container-highest/60 px-4 py-3 text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                />
              </div>

              <div className="mb-7">
                <label className="block mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  value={passwordField}
                  className="w-full rounded-xl border-none bg-surface-container-highest/60 px-4 py-3 text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                />
              </div>

              <button
                className="w-full rounded-xl py-3.5 font-headline text-[0.95rem] font-semibold bg-gradient-to-br from-primary to-primary-dim text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:pointer-events-none disabled:opacity-70"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <span className="material-symbols-outlined text-sm animate-[spin_0.8s_linear_infinite]">progress_activity</span>
                    Creating account...
                  </span>
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:text-primary-dim transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
