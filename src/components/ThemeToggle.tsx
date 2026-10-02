"use client";
import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const OPTIONS: [Theme, string][] = [["system", "System"], ["light", "Light"], ["dark", "Dark"]];

function apply(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try { const t = localStorage.getItem("theme"); if (t === "light" || t === "dark" || t === "system") setTheme(t); } catch {}
  }, []);

  useEffect(() => {
    apply(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [theme]);

  function choose(t: Theme) {
    setTheme(t);
    try { localStorage.setItem("theme", t); } catch {}
  }

  return (
    <select aria-label="Theme" className="input w-auto" value={theme} onChange={(e) => choose(e.target.value as Theme)}>
      {OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}
