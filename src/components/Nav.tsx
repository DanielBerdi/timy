"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; icon: string }[] = [
  { href: "/timesheet", label: "Timesheet", icon: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { href: "/calendar", label: "Calendar", icon: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" },
  { href: "/customers", label: "Customers", icon: "M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 19v-1a4 4 0 0 0-3-3.9M15 5.2a3 3 0 0 1 0 5.6" },
  { href: "/projects", label: "Projects", icon: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" },
  { href: "/reports", label: "Reports", icon: "M5 20V10M12 20V4M19 20v-7" },
];

export default function Nav() {
  const path = usePathname();
  const active = (href: string) => path.startsWith(href);
  return (
    <>
      {/* desktop: links in the header */}
      <nav className="hidden gap-1 md:flex">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`rounded-md px-3 py-1.5 text-sm font-medium ${active(l.href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>{l.label}</Link>
        ))}
      </nav>
      {/* phone: fixed bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(l.href) ? "text-indigo-700" : "text-slate-500"}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={l.icon} /></svg>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
