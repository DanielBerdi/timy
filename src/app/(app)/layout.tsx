import { redirect } from "next/navigation";
import { isAuthed, signOut } from "@/auth";
import NoSSR from "@/components/NoSSR";
import Nav from "@/components/Nav";
import ThemeToggle from "@/components/ThemeToggle";
import TimerBar from "@/components/TimerBar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/login");
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 lg:px-6">
          <span className="font-semibold text-indigo-600">Timy</span>
          <Nav />
          <div className="ml-auto flex items-center gap-3">
            <TimerBar />
            <ThemeToggle />
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button className="btn">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="p-4 lg:px-6"><NoSSR>{children}</NoSSR></main>
    </>
  );
}
