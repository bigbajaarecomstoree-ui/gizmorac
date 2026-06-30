"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Eye, EyeOff, ArrowRight, Lock } from "lucide-react";
import {
  loginAction,
  signupAction,
  type AuthState,
} from "@/lib/customer/actions";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-12 w-full rounded-lg border border-border bg-background px-4 text-sm transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none";

/** Password input with a show/hide eye toggle. */
function PasswordField({
  name,
  autoComplete,
  placeholder,
}: {
  name: string;
  autoComplete: string;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        required
        autoComplete={autoComplete}
        className={`${inputCls} pr-11`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-foreground cursor-pointer"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function AuthForm({
  mode,
  next = "",
}: {
  mode: "login" | "signup";
  next?: string;
}) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<
    AuthState | undefined,
    FormData
  >(action, undefined);

  const isSignup = mode === "signup";
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

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
            : "Sign in to track orders, manage warranties and check out faster."}
        </p>
      </div>

      <form
        action={formAction}
        className="mt-8 space-y-4 rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0"
      >
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {isSignup ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Full name</span>
            <input
              name="fullName"
              required
              autoComplete="name"
              autoFocus
              className={inputCls}
              placeholder="Aarav Sharma"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Email address</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus={!isSignup}
            defaultValue={state?.email ?? ""}
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
          <PasswordField
            name="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "At least 8 characters" : "Your password"}
          />
        </label>

        {isSignup ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Confirm password</span>
            <PasswordField name="confirm" autoComplete="new-password" placeholder="Re-enter password" />
          </label>
        ) : null}

        {state?.error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="group w-full transition-transform hover:-translate-y-0.5"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {isSignup ? "Creating account…" : "Signing in…"}
            </>
          ) : (
            <>
              {isSignup ? "Create your free account" : "Secure Login"}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-faint">
          <Lock size={12} /> Your information is encrypted and secure.
        </p>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href={`/login${nextQuery}`} className="font-medium text-accent-bright hover:text-accent">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to GIZMORAC?{" "}
            <Link href={`/signup${nextQuery}`} className="font-medium text-accent-bright hover:text-accent">
              Create your free account →
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
