"use client";
import { useEffect } from "react";

/** Registers the service worker (production only) so Chrome offers "Install app". */
export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
