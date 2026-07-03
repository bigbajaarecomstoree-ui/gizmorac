"use client";

/**
 * Small scroll-reveal toolkit for the storefront. Each primitive fades and
 * slides its children up the first time it scrolls into view, using plain CSS
 * transitions, so server components can wrap their server-rendered children
 * without becoming client components themselves. Reduced-motion users get the
 * content rendered visible immediately (`motion-reduce` variants).
 */
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const HIDDEN = "opacity-0 translate-y-6";
const SHOWN = "opacity-100 translate-y-0";
const TRANSITION =
  "transition-[opacity,translate] ease-[cubic-bezier(0.16,1,0.3,1)] " +
  "motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0";

/** Flips to true (once) when the element scrolls into view. */
function useInView(threshold: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, shown };
}

/** Fade + slide-up a block when it scrolls into view. */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, shown } = useInView(0.2);
  return (
    <div
      ref={ref}
      className={cn(TRANSITION, "duration-[600ms]", shown ? SHOWN : HIDDEN, className)}
    >
      {children}
    </div>
  );
}

/** Container that cascades its <StaggerItem> children in as they enter view. */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, shown } = useInView(0.15);
  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) =>
        isValidElement(child)
          ? cloneElement(child as ReactElement<StaggerItemProps>, {
              shown,
              delayMs: 50 + i * 80,
            })
          : child,
      )}
    </div>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
  /** Injected by <Stagger>. */
  shown?: boolean;
  delayMs?: number;
};

/** A single item inside <Stagger>. Must be a direct child for the cascade. */
export function StaggerItem({ children, className, shown, delayMs = 0 }: StaggerItemProps) {
  return (
    <div
      className={cn(TRANSITION, "duration-500", shown ? SHOWN : HIDDEN, className)}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
