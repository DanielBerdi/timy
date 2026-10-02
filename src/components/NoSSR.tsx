"use client";
import { useEffect, useState } from "react";

/** Renders children only in the browser. The pages are fully client-driven (dates, local time,
 *  localStorage), so server HTML would only cause hydration mismatches (e.g. "Sep" vs "Sept"). */
export default function NoSSR({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : null;
}
