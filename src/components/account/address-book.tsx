"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  Star,
  AlertTriangle,
} from "lucide-react";
import { INDIAN_STATES } from "@/lib/india";
import {
  saveAddress,
  deleteAddress,
  setDefaultAddress,
  type AddressInput,
} from "@/lib/customer/actions";
import type { Address } from "@/lib/types";

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";
const labelCls = "mb-1 block text-xs font-medium text-muted";

type FormState = {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

const EMPTY: FormState = {
  label: "",
  fullName: "",
  phone: "",
  line1: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

/** Collapsible address book: add / edit / delete multiple delivery addresses. */
export function AddressBook({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDel, setConfirmDel] = React.useState<string | null>(null);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function openNew() {
    setError(null);
    setForm({ ...EMPTY, isDefault: addresses.length === 0 });
    setEditing("new");
  }
  function openEdit(a: Address) {
    setError(null);
    setForm({ ...a });
    setEditing(a.id);
  }
  function cancel() {
    setEditing(null);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveAddress(form as AddressInput);
      if (!res.ok) {
        setError(res.error ?? "Couldn't save the address.");
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }
  function remove(id: string) {
    start(async () => {
      const res = await deleteAddress(id);
      setConfirmDel(null);
      if (res.ok) router.refresh();
    });
  }
  function makeDefault(id: string) {
    start(async () => {
      const res = await setDefaultAddress(id);
      if (res.ok) router.refresh();
    });
  }

  const renderForm = () => (
    <form onSubmit={submit} className="rounded-xl border border-accent/40 bg-surface p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Label (optional)</label>
          <input
            value={form.label}
            onChange={set("label")}
            placeholder="Home, Office…"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Full name</label>
          <input required value={form.fullName} onChange={set("fullName")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input
            required
            value={form.phone}
            onChange={set("phone")}
            inputMode="numeric"
            maxLength={10}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Address</label>
          <input
            required
            value={form.line1}
            onChange={set("line1")}
            placeholder="House no., street, area"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input required value={form.city} onChange={set("city")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Pincode</label>
          <input
            required
            value={form.pincode}
            onChange={set("pincode")}
            inputMode="numeric"
            maxLength={6}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>State</label>
          <select required value={form.state} onChange={set("state")} className={inputCls}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={form.isDefault}
          disabled={addresses.length === 0}
          onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
          className="size-4 accent-[var(--accent,#f59e0b)]"
        />
        Set as default delivery address
      </label>

      {error ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-danger" role="alert">
          <AlertTriangle size={14} /> {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : null}
          {form.id ? "Save address" : "Add address"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Saved addresses</h2>
          <span className="text-sm text-muted">({addresses.length})</span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <p className="mt-1 text-sm text-muted">Ship to home, office or anywhere else.</p>

      {open ? (
        <div className="mt-4 space-y-3">
          {addresses.map((a) =>
            editing === a.id ? (
              <div key={a.id}>{renderForm()}</div>
            ) : (
              <div key={a.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPin size={15} className="shrink-0 text-accent" />
                      <span className="text-sm font-semibold">{a.fullName}</span>
                      {a.label ? (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                          {a.label}
                        </span>
                      ) : null}
                      {a.isDefault ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                          <Star size={11} /> Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm text-muted">
                      {a.line1}, {a.city}, {a.state} — {a.pincode}
                    </p>
                    <p className="text-xs text-faint">{a.phone}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  {!a.isDefault ? (
                    <button
                      type="button"
                      onClick={() => makeDefault(a.id)}
                      disabled={pending}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                    >
                      <Star size={13} /> Set as default
                    </button>
                  ) : null}
                  {confirmDel === a.id ? (
                    <span className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => remove(a.id)}
                        disabled={pending}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {pending ? <Loader2 size={13} className="animate-spin" /> : null}
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDel(null)}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:text-foreground"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDel(a.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:border-danger hover:bg-danger/5"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ),
          )}

          {editing === "new" ? (
            renderForm()
          ) : (
            <button
              type="button"
              onClick={openNew}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Plus size={16} /> Add new address
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
