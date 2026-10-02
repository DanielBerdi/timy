import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Timy – consulting time tracking",
    short_name: "Timy",
    description: "Customers, projects, calendar, timesheet and reports for a solo consultant.",
    start_url: "/timesheet",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#020617",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Timesheet", url: "/timesheet" },
      { name: "Calendar", url: "/calendar" },
      { name: "Reports", url: "/reports" },
    ],
  };
}
