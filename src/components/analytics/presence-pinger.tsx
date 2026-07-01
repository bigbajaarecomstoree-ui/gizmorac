"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

const PING_MS = 20_000;
const KEY = "gzr_vid";

/** Get or create a random per-tab visitor token. Anonymous, no cookie, no PII. */
function visitorId(): string {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * Sends an anonymous presence heartbeat while the storefront tab is open and
 * visible, powering the admin "online now" count. Renders nothing. The path is
 * read through a ref so route changes don't restart the interval.
 */
export function PresencePinger() {
  const pathname = usePathname();
  const pathRef = React.useRef(pathname);
  pathRef.current = pathname;

  React.useEffect(() => {
    const id = visitorId();
    if (!id) return;

    const ping = () => {
      if (document.visibilityState !== "visible") return;
      const body = JSON.stringify({ id, path: pathRef.current });
      // sendBeacon survives page unload; fall back to fetch keepalive.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/presence",
          new Blob([body], { type: "application/json" }),
        );
      } else {
        fetch("/api/presence", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      }
    };

    ping();
    const timer = setInterval(ping, PING_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
