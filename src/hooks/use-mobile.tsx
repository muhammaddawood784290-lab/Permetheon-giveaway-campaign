import { useState, useEffect } from "react";

export function useIsMobile(breakpointMs = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${breakpointMs - 1}px)`);
    setIsMobile(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", listener);
      return () => mql.removeEventListener("change", listener);
    }
    mql.addListener(listener);
    return () => mql.removeListener(listener);
  }, [breakpointMs]);
  return isMobile;
}
