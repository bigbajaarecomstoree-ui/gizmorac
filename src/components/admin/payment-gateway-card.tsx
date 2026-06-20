"use client";

import * as React from "react";
import {
  Check,
  Loader2,
  ShieldCheck,
  Plug,
  PlugZap,
  AlertTriangle,
} from "lucide-react";
import {
  connectPaymentGateway,
  disconnectPaymentGateway,
} from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputCls =
  "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-faint focus:border-accent focus:outline-none";

type Env = "sandbox" | "production";

export function PaymentGatewayCard({
  clientId,
  clientVersion,
  env,
  connected,
  hasSecret,
}: {
  clientId: string;
  clientVersion: string;
  env: Env;
  connected: boolean;
  hasSecret: boolean;
}) {
  const [cid, setCid] = React.useState(clientId);
  const [cver, setCver] = React.useState(clientVersion || "1");
  const [secret, setSecret] = React.useState("");
  const [cenv, setCenv] = React.useState<Env>(env);
  const [isConnected, setIsConnected] = React.useState(connected);
  const [liveEnv, setLiveEnv] = React.useState<Env>(env);
  const [secretStored, setSecretStored] = React.useState(hasSecret);
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  function connect() {
    const warning =
      `This will save and verify your PhonePe keys, then switch the gateway to ` +
      `${cenv.toUpperCase()} and turn ON online payments on your website.\n\nContinue?`;
    if (!window.confirm(warning)) return;
    setMsg(null);
    start(async () => {
      const res = await connectPaymentGateway({
        clientId: cid.trim(),
        clientVersion: cver.trim() || "1",
        clientSecret: secret.trim(),
        env: cenv,
      });
      if (res.ok) {
        setIsConnected(true);
        setLiveEnv(res.env ?? cenv);
        setSecretStored(true);
        setSecret(""); // never keep the secret in the field
        setMsg({
          type: "ok",
          text: `Connected — keys verified. Online payments are live on ${(
            res.env ?? cenv
          ).toUpperCase()}.`,
        });
      } else {
        setMsg({ type: "err", text: res.error ?? "Could not connect." });
      }
    });
  }

  function disconnect() {
    if (
      !window.confirm(
        "Disconnect will stop payment getway from website.\n\nCustomers will only see Cash on Delivery until you connect again. Continue?",
      )
    )
      return;
    setMsg(null);
    start(async () => {
      const res = await disconnectPaymentGateway();
      if (res.ok) {
        setIsConnected(false);
        setMsg({ type: "ok", text: "Disconnected — online payments are now off." });
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
            <ShieldCheck size={18} className="text-accent" />
            Payment gateway
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            PhonePe online payments (UPI, cards &amp; more). Enter your keys and
            Connect to verify and go live.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            isConnected
              ? "bg-success/15 text-success"
              : "bg-border-bright/40 text-muted",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isConnected ? "bg-success" : "bg-muted",
            )}
          />
          {isConnected ? `Connected · ${liveEnv === "production" ? "Production" : "Sandbox"}` : "Disconnected"}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Client ID</span>
          <input
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            className={inputCls}
            placeholder="M23ZH2BNW6QXY_2511080834"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Client Version</span>
            <input
              value={cver}
              onChange={(e) => setCver(e.target.value)}
              className={inputCls}
              placeholder="1"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Environment</span>
            <select
              value={cenv}
              onChange={(e) => setCenv(e.target.value as Env)}
              className={inputCls}
            >
              <option value="sandbox">Sandbox (testing)</option>
              <option value="production">Production (live)</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Client Secret</span>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className={inputCls}
            placeholder={secretStored ? "•••••••• (leave blank to keep current)" : "Paste your client secret"}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="mt-1 block text-xs text-faint">
            Stored securely on the server — never shown again after saving.
          </span>
        </label>

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
            {pending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plug size={16} />
            )}
            {isConnected ? "Reconnect / update keys" : "Connect"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={disconnect}
            disabled={pending || !isConnected}
          >
            <PlugZap size={16} />
            Disconnect
          </Button>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-faint">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          Connecting switches the gateway to the selected environment. Disconnect
          stops online payments on the website — customers will only see Cash on
          Delivery.
        </p>
      </div>
    </section>
  );
}
