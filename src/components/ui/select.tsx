"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  /** Controlled value. Omit to use `defaultValue` (uncontrolled / form mode). */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** When set, a hidden input carries the value for native form submission. */
  name?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Wrapper classes — control width here (e.g. "w-full"). */
  className?: string;
  /** Trigger button classes — control height/padding here. */
  triggerClassName?: string;
  /** Popup horizontal alignment. */
  align?: "start" | "end";
}

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  name,
  ariaLabel,
  id,
  disabled,
  placeholder = "Select…",
  className,
  triggerClassName,
  align = "start",
}: SelectProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const current = isControlled ? value : internal;

  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const baseId = React.useId();
  // Timestamp of the last selection. Selecting an option unmounts it mid-click,
  // which makes the browser fire a phantom click on the trigger — this guard
  // ignores that click so the menu doesn't immediately re-open.
  const closedAt = React.useRef(0);

  const selected = options.find((o) => o.value === current);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted option in view.
  React.useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`${baseId}-opt-${highlight}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlight, baseId]);

  function commit(v: string, refocus = false) {
    if (!isControlled) setInternal(v);
    onChange?.(v);
    setOpen(false);
    closedAt.current = Date.now();
    // Only pull focus back to the trigger for keyboard selection. Doing it on a
    // pointer click fights the native focus/click sequence and re-opens the menu.
    if (refocus) triggerRef.current?.focus();
  }

  function onTriggerClick() {
    // Ignore the phantom click dispatched right after selecting an option.
    if (Date.now() - closedAt.current < 350) return;
    if (open) setOpen(false);
    else openMenu();
  }

  function openMenu() {
    if (disabled) return;
    const idx = Math.max(0, options.findIndex((o) => o.value === current));
    setHighlight(idx);
    setOpen(true);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openMenu();
        else setHighlight((h) => Math.min(options.length - 1, h + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openMenu();
        else setHighlight((h) => Math.max(0, h - 1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setHighlight(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setHighlight(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open && options[highlight]) commit(options[highlight].value, true);
        else openMenu();
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={wrapRef} className={cn("relative inline-block", className)}>
      {name ? <input type="hidden" name={name} value={current} /> : null}

      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={onTriggerClick}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3.5 text-sm text-foreground transition-colors hover:border-border-bright focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          open ? "border-accent" : "border-border",
          triggerClassName,
        )}
      >
        <span className={cn("truncate", !selected && "text-faint")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-faint transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-activedescendant={`${baseId}-opt-${highlight}`}
          className={cn(
            "animate-pop absolute z-50 mt-2 max-h-72 min-w-full overflow-auto rounded-xl border border-border bg-elevated py-1 shadow-xl",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {options.map((o, i) => {
            const isSel = o.value === current;
            const isHi = i === highlight;
            return (
              <li
                key={o.value}
                id={`${baseId}-opt-${i}`}
                data-value={o.value}
                role="option"
                aria-selected={isSel}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(o.value)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-sm whitespace-nowrap transition-colors",
                  isHi ? "bg-surface-2" : "bg-transparent",
                  isSel ? "font-medium text-accent-bright" : "text-foreground",
                )}
              >
                {o.label}
                {isSel ? <Check size={15} className="shrink-0 text-accent" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
