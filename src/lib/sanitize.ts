// Emoji / pictographic-symbol stripping for all user + admin text input.
// Keeps the database clean and searchable. Deliberately scoped to emoji blocks
// (incl. flags, keycaps, ZWJ joiners and variation selectors) so it never
// touches ordinary letters, digits, punctuation, currency (₹), or typographic
// marks like © ® ™ and arrows (→).
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{20D0}-\u{20FF}\u{200D}]/gu;

/** Remove every emoji / pictographic symbol from a string. */
export function stripEmoji<T>(value: T): T {
  return typeof value === "string" ? (value.replace(EMOJI_RE, "") as T) : value;
}

/** Strip emoji from every top-level string field of an object (shallow copy). */
export function cleanStrings<T extends object>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const k in out) {
    if (typeof out[k] === "string") out[k] = stripEmoji(out[k] as string);
  }
  return out as T;
}

/**
 * Sanitize a `?next=` / post-auth redirect target to a SAME-ORIGIN path.
 * Parsed with the real URL resolver (the one the browser uses), so tricks that
 * defeat naive `startsWith("/")` checks — protocol-relative `//evil.com`,
 * backslash `/\evil.com` (browsers normalize `\`→`/`), embedded credentials,
 * CRLF — all resolve off our dummy origin and get rejected. Returns the
 * fallback ("" by default) when the input isn't a safe internal path.
 */
export function safeInternalPath(
  next: string | undefined | null,
  fallback = "",
): string {
  const n = (next ?? "").trim();
  if (!n.startsWith("/")) return fallback;
  try {
    const u = new URL(n, "http://internal.invalid");
    if (u.origin !== "http://internal.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
