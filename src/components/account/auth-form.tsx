"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import {
  loginAction,
  signupAction,
  type AuthState,
} from "@/lib/customer/actions";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-12 w-full rounded-lg border border-border bg-background px-4 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<
    AuthState | undefined,
    FormData
  >(action, undefined);

  const isSignup = mode === "signup";

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <Link
          href="/"
          className="flex items-center gap-1.5 lg:hidden"
          aria-label="GIZMORAC home"
        >
          <Image src="/logo.png" alt="" width={523} height={586} className="h-12 w-auto" />
          <span className="font-display text-xl font-bold tracking-tight">
            GIZMO<span className="text-accent">RAC</span>
          </span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight lg:mt-0">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {isSignup
            ? "Track orders, save addresses and check out faster."
            : "Log in to view your orders and account."}
        </p>
      </div>

      <form
        action={formAction}
        className="mt-8 space-y-4 rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0"
      >
        {isSignup ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Full name</span>
            <input name="fullName" required autoComplete="name" className={inputCls} placeholder="Aarav Sharma" />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Email address</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputCls}
            placeholder="you@example.com"
          />
        </label>

        {isSignup ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Phone <span className="font-normal text-faint">(optional)</span>
            </span>
            <input name="phone" type="tel" autoComplete="tel" className={inputCls} placeholder="10-digit mobile" />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={inputCls}
            placeholder={isSignup ? "At least 8 characters" : "Your password"}
          />
        </label>

        {isSignup ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Confirm password</span>
            <input
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              className={inputCls}
              placeholder="Re-enter password"
            />
          </label>
        ) : null}

        {state?.error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {isSignup ? "Create account" : "Log in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent-bright hover:text-accent">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to GIZMORAC?{" "}
            <Link href="/signup" className="font-medium text-accent-bright hover:text-accent">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
