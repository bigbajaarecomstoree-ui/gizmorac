/**
 * Safely serialize structured data for an inline
 * `<script type="application/ld+json">` tag.
 *
 * `JSON.stringify` does not escape `<`, so content like `</script>` in a
 * product name or FAQ could break out of the tag and inject markup. Escaping
 * `<` to its unicode form keeps the JSON valid while making breakout impossible.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
