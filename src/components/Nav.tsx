"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/timesheet", "Timesheet"], ["/calendar", "Calendar"], ["/customers", "Customers"], ["/projects", "Projects"], ["/reports", "Reports"],
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={`rounded-md px-3 py-1.5 text-sm font-medium ${path.startsWith(href) ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>{label}</Link>
      ))}
    </nav>
  );
}
