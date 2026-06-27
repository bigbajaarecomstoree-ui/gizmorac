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
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 shadow-sm">
      <div className="flex -space-x-2.5" aria-hidden="true">
        {initials.map((letter, i) => (
          <span
            key={i}
            className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ring-2 ring-surface ${TINTS[i % TINTS.length]}`}
          >
            {letter}
          </span>
        ))}
        <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-[0.625rem] font-bold text-on-accent ring-2 ring-surface">
          +{extra}
        </span>
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-sm font-bold text-foreground">{count} bought today</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-faint">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Updated just now
        </p>
      </div>
    </div>
  );
}
