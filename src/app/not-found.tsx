import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="glow-amber absolute -z-10 h-80 w-80 opacity-40" />
      <span className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-surface text-accent">
        <SearchX size={28} />
      </span>
      <p className="tech-label mt-6">Error · 404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        The page you&apos;re looking for has moved or never existed. Let&apos;s get
        you back to the good stuff.
      </p>
      <div className="mt-7 flex gap-3">
        <Link href="/" className={buttonVariants()}>
          Back home
        </Link>
        <Link href="/shop" className={buttonVariants({ variant: "outline" })}>
          Browse gadgets
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
