"use client";

import * as React from "react";
import { stripEmoji } from "@/lib/sanitize";

// Update a React-controlled input/textarea so the framework sees the change.
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Site-wide guard that blocks emoji from being typed or pasted into any input or
 * textarea (storefront and admin). It intercepts `beforeinput`, strips emoji
 * from the incoming text, and inserts only the clean remainder — keeping React
 * controlled inputs in sync. Mounted once in the root layout. The server still
 * strips emoji on save, so this is the UX layer over an authoritative backstop.
 */
export function EmojiGuard() {
  React.useEffect(() => {
    function onBeforeInput(e: Event) {
      const ev = e as InputEvent;
      const el = ev.target as HTMLElement | null;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        return;
      }
      const data = ev.data;
      if (!data) return; // deletions, IME composition, etc.
      const clean = stripEmoji(data);
      if (clean === data) return; // nothing emoji to block

      ev.preventDefault();
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? start;
      setNativeValue(el, el.value.slice(0, start) + clean + el.value.slice(end));
      const pos = start + clean.length;
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        /* some input types don't support selection */
      }
    }

    document.addEventListener("beforeinput", onBeforeInput, true);
    return () => document.removeEventListener("beforeinput", onBeforeInput, true);
  }, []);

  return null;
}
