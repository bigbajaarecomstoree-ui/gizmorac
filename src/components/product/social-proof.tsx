// Lightweight "recent buyers" social proof. The number + initials are derived
// deterministically from the product slug, so the server and client render the
// same thing (no hydration mismatch) and it stays stable per product.

const TINTS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
];
const POOL = "ARMSPKNDVTBJLG".split("");

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function SocialProof({ seed }: { seed: string }) {
  const h = hashStr(seed);
  const count = 24 + (h % 44); // 24–67
  const shown = 4;
  const initials = Array.from(
    { length: shown },
    (_, i) => POOL[(h >> (i * 3)) % POOL.length],
  );
  const extra = count - shown;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/60 bg-surface/50 px-3 py-2.5 shadow-sm backdrop-blur-md backdrop-saturate-150">
      <div className="flex -space-x-2">
        {initials.map((letter, i) => (
          <span
            key={i}
            className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ring-2 ring-surface ${TINTS[i % TINTS.length]}`}
          >
            {letter}
          </span>
        ))}
        <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface-2 text-[0.625rem] font-semibold text-muted ring-2 ring-surface">
          +{extra}
        </span>
      </div>

      <p className="flex-1 text-sm leading-snug text-muted">
        <span className="font-bold text-foreground">{count}</span> people bought
        this in the last 24 hours
      </p>

      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
      </span>
    </div>
  );
}
