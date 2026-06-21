"use client";

import * as React from "react";
import { Check, Loader2, Truck, Plug, PlugZap, AlertTriangle } from "lucide-react";
import { connectShiprocket, disconnectShiprocket } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";
// Masked (dots) without type=password, so password managers don't autofill it.
const maskCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none key-mask";

export function ShiprocketCard({
  email,
  hasPassword,
  pickup,
  weight,
  length,
  breadth,
  height,
  connected,
}: {
  email: string;
  hasPassword: boolean;
  pickup: string;
  weight: number;
  length: number;
  breadth: number;
  height: number;
  connected: boolean;
}) {
  const [em, setEm] = React.useState(email);
  const [pass, setPass] = React.useState("");
  const [pk, setPk] = React.useState(pickup);
  const [wt, setWt] = React.useState(String(weight));
  const [l, setL] = React.useState(String(length));
  const [b, setB] = React.useState(String(breadth));
  const [h, setH] = React.useState(String(height));
  const [isConnected, setIsConnected] = React.useState(connected);
  const [passStored, setPassStored] = React.useState(hasPassword);
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(null);

  function connect() {
    if (!window.confirm("Verify and connect Shiprocket? Orders can then be shipped through it.")) return;
    setMsg(null);
    start(async () => {
      const res = await connectShiprocket({
        email: em.trim(),
        password: pass.trim(),
        pickup: pk.trim(),
        weight: Number(wt) || 0.5,
        length: Number(l) || 15,
        breadth: Number(b) || 12,
        height: Number(h) || 5,
      });
      if (res.ok) {
        setIsConnected(true);
        setPassStored(true);
        setPass("");
        setMsg({ type: "ok", text: "Connected — Shiprocket is verified and ready." });
      } else {
        setMsg({ type: "err", text: res.error ?? "Could not connect." });
      }
    });
  }

  function disconnect() {
    if (!window.confirm("Disconnect Shiprocket? You won't be able to push orders to it until you reconnect.")) return;
    setMsg(null);
    start(async () => {
      const res = await disconnectShiprocket();
      if (res.ok) {
        setIsConnected(false);
        setMsg({ type: "ok", text: "Disconnected." });
      } else {
        setMsg({ type: "err", text: res.error ?? "Could not disconnect." });
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Truck size={18} className="text-accent" />
            Shiprocket
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Ship orders, assign couriers &amp; track shipments. Use a dedicated API
            user (Shiprocket → Settings → API → Create an API User).
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            isConnected ? "bg-success/15 text-success" : "bg-border-bright/40 text-muted",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-success" : "bg-muted")} />
          {isConnected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">API user email</span>
          <input
            value={em}
            onChange={(e) => setEm(e.target.value)}
            className={inputCls}
            placeholder="api-user@yourstore.com"
            autoComplete="off"
            spellCheck={false}
            data-1p-ignore
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">API user password</span>
          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className={maskCls}
            placeholder={passStored ? "•••••••• (leave blank to keep current)" : "Shiprocket API password"}
            autoComplete="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
          />
          <span className="mt-1 block text-xs text-faint">
            Stored securely on the server — never shown again.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Pickup location</span>
          <input
            value={pk}
            onChange={(e) => setPk(e.target.value)}
            className={inputCls}
            placeholder="Nickname from Shiprocket → Pickup Addresses"
            autoComplete="off"
          />
        </label>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Weight (kg)</span>
            <input value={wt} onChange={(e) => setWt(e.target.value)} className={inputCls} inputMode="decimal" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Length (cm)</span>
            <input value={l} onChange={(e) => setL(e.target.value)} className={inputCls} inputMode="numeric" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Breadth (cm)</span>
            <input value={b} onChange={(e) => setB(e.target.value)} className={inputCls} inputMode="numeric" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Height (cm)</span>
            <input value={h} onChange={(e) => setH(e.target.value)} className={inputCls} inputMode="numeric" />
          </label>
        </div>

        {msg ? (
          <p
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm",
              msg.type === "ok"
                ? "border-success/30 bg-success/5 text-success"
                : "border-danger/30 bg-danger/5 text-danger",
            )}
            role={msg.type === "err" ? "alert" : "status"}
          >
            {msg.type === "ok" ? (
              <Check size={15} className="shrink-0" />
            ) : (
              <AlertTriangle size={15} className="shrink-0" />
            )}
            {msg.text}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="button" onClick={connect} disabled={pending}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
            {isConnected ? "Reconnect / update" : "Connect"}
          </Button>
          <Button type="button" variant="outline" onClick={disconnect} disabled={pending || !isConnected}>
            <PlugZap size={16} />
            Disconnect
          </Button>
        </div>
      </div>
    </section>
  );
}
