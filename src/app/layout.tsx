import type { Metadata, Viewport } from "next";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Timy",
  description: "Consulting time tracking",
  applicationName: "Timy",
  appleWebApp: { capable: true, title: "Timy", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#4f46e5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}` }} />
      </head>
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
