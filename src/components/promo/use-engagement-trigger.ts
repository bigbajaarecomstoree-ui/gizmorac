"use client";

import * as React from "react";

/**
 * Returns true once the visitor shows engagement or intent — whichever comes
 * first: scrolling roughly a screenful, dwelling for `delayMs`, or an
 * exit-intent cursor leaving through the top of the window (desktop pointers
 * only). Used to time promo popups so they surface at a welcome moment instead
 * of interrupting on load.
 *
 * `armed` gates the whole thing: pass false when the popup is disabled or has
 * already been shown this session, so no listeners are attached.
 */
export function useEngagementTrigger(armed: boolean, delayMs: number): boolean {
  const [engaged, setEngaged] = React.useState(false);

  React.useEffect(() => {
    if (!armed) return;

    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      cleanup();
      setEngaged(true);
    };

    // (a) dwell — still reach a shopper who lingers without scrolling.
    const timer = setTimeout(fire, Math.max(0, delayMs));

    // (b) engagement — once they scroll ~a screenful, they're browsing.
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.9) fire();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // (c) exit-intent (desktop pointers only) — cursor leaving via the top edge.
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) fire();
    };
    const finePointer =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: fine)").matches;
    if (finePointer) document.addEventListener("mouseout", onMouseOut);

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
    }
    return cleanup;
  }, [armed, delayMs]);

  return engaged;
}
