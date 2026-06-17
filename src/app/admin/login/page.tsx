"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Lock, Loader2 } from "lucide-react";
import { loginAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-5 pt-14 pb-12 sm:pt-20">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="GIZMORAC" width={523} height={586} className="h-24 w-auto" />
          <span className="mt-3 font-display text-3xl font-bold tracking-tight">
            GIZMO<span className="text-accent">RAC</span>
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">Admin Login</h1>
          <p className="mt-1.5 text-[0.95rem] text-muted">Sign in to manage your store</p>
        </div>

        <form
          action={formAction}
          className="rounded-2xl border border-border bg-surface p-8 shadow-sm"
        >
          <label htmlFor="password" className="mb-2.5 block text-sm font-medium">
            Admin password
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              placeholder="Enter password"
              className="h-[52px] w-full rounded-xl border border-border bg-background pl-11 pr-3.5 text-base placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </div>

          {state?.error ? (
            <p className="mt-3 text-sm text-danger">{state.error}</p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="mt-6 h-[52px] w-full rounded-xl text-base"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-7 text-center text-xs text-faint">
          Authorized access only · GIZMORAC
        </p>
      </div>
    </div>
  );
}
