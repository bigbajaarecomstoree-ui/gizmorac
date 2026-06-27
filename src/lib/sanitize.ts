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

/** True when the string contains at least one emoji / pictographic symbol. */
export function hasEmoji(value: string): boolean {
  return typeof value === "string" && stripEmoji(value) !== value;
}

/** Strip emoji from every top-level string field of an object (shallow copy). */
export function cleanStrings<T extends object>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const k in out) {
    if (typeof out[k] === "string") out[k] = stripEmoji(out[k] as string);
  }
  return out as T;
}
