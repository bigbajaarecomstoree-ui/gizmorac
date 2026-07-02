"use client";

import { useEffect } from "react";

/**
 * Casual content-download deterrent for the storefront. Blocks the easy ways to
 * grab images/video/text — right-click "Save image as", drag-to-desktop, the
 * Save-page / View-source shortcuts, and (with the matching CSS) long-press save
 * + text selection. NOT real protection: anything the browser renders has
 * already been downloaded, so DevTools / screenshots / screen-recording can
 * still capture it. Mounted only in the storefront layout, so the admin keeps
 * full right-click + selection.
 */
export function ContentGuard() {
  useEffect(() => {
    // Never interfere inside form fields — right-click paste/spellcheck in the
    // search box, newsletter and checkout inputs must keep working.
    const isEditable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el || !el.tagName) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      );
    };
    const blockContextMenu = (e: MouseEvent) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };
    const blockMediaDrag = (e: DragEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "IMG" || t.tagName === "VIDEO")) e.preventDefault();
    };
    const blockSaveKeys = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const k = e.key.toLowerCase();
      // Ctrl/Cmd+S (save page) and Ctrl/Cmd+U (view source).
      if ((e.ctrlKey || e.metaKey) && (k === "s" || k === "u")) e.preventDefault();
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("dragstart", blockMediaDrag);
    document.addEventListener("keydown", blockSaveKeys);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("dragstart", blockMediaDrag);
      document.removeEventListener("keydown", blockSaveKeys);
    };
  }, []);

  // Injected directly (not via globals.css) because Tailwind's CSS engine strips
  // these raw rules. Disables image/video drag, iOS long-press "Save Image", and
  // text selection — while keeping form fields selectable so checkout/search work.
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.content-guard{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.content-guard img,.content-guard video{-webkit-user-drag:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.content-guard input,.content-guard textarea,.content-guard select,.content-guard [contenteditable=true]{-webkit-user-select:text;user-select:text}
`,
      }}
    />
  );
}
