import { signIn } from "@/auth";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8 text-center">
        <h1 className="mb-1 text-2xl font-semibold">Timy</h1>
        <p className="mb-6 text-sm text-slate-500">Consulting time tracking</p>
        {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">Sign-in failed. Only the owner&apos;s Google account is allowed.</p>}
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/timesheet" }); }}>
          <button className="btn btn-primary w-full py-2">Sign in with Google</button>
        </form>
      </div>
    </main>
  );
}
