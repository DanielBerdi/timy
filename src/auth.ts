import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { setSetting } from "@/lib/db";

export const ALLOWED_EMAIL = (process.env.ALLOWED_EMAIL ?? "danielberdy@gmail.com").toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent", // always return a refresh token so Calendar access keeps working
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Single-user app: only the owner's verified Google account gets in.
    async signIn({ account, profile }) {
      const ok = profile?.email_verified === true && profile.email?.toLowerCase() === ALLOWED_EMAIL;
      if (ok && account?.refresh_token) {
        // Kept server-side (not in the browser cookie) and used to read Google Calendar.
        setSetting("google_refresh_token", account.refresh_token);
      }
      return ok;
    },
  },
});

export async function isAuthed(): Promise<boolean> {
  const s = await auth();
  return s?.user?.email?.toLowerCase() === ALLOWED_EMAIL;
}
