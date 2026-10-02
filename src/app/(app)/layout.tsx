import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, signOut } from "@/auth";
import NoSSR from "@/components/NoSSR";
import { Logo } from "@/components/Logo";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import TimerBar from "@/components/TimerBar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/login");
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 lg:px-6">
          <Link href="/timesheet" className="text-slate-900" aria-label="Timy home"><Logo /></Link>
          <Nav />
          <div className="order-last w-full md:order-none md:ml-auto md:w-auto"><TimerBar /></div>
          <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-3">
            <ThemeToggle />
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button className="btn">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="p-3 pb-24 sm:p-4 md:pb-4 lg:px-6"><NoSSR>{children}</NoSSR></main>
    </>
  );
}
