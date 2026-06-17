"use client";

import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { updateProfileAction, type AuthState } from "@/lib/customer/actions";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/button";

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

function Field({
  label,
  name,
  defaultValue,
  ...rest
}: {
  label: string;
  name: string;
  defaultValue?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input name={name} defaultValue={defaultValue} className={inputCls} {...rest} />
    </label>
  );
}

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, formAction, pending] = useActionState<
    AuthState | undefined,
    FormData
  >(updateProfileAction, undefined);

  const saved = state !== undefined && !state.error;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="fullName" defaultValue={customer.fullName} required />
        <Field label="Phone" name="phone" defaultValue={customer.phone} placeholder="10-digit mobile" />
      </div>
      <Field label="Address" name="address" defaultValue={customer.address} placeholder="House no., street, area" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" name="city" defaultValue={customer.city} />
        <Field label="State" name="state" defaultValue={customer.state} />
        <Field label="Pincode" name="pincode" defaultValue={customer.pincode} inputMode="numeric" />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          Save changes
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check size={16} /> Saved
          </span>
        ) : null}
        {state?.error ? (
          <span className="text-sm text-danger" role="alert">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
