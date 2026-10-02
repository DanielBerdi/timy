import { useId } from "react";

/** Timy mark: a rounded tile with a clock whose minute hand doubles as the stem of a "T". */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} role="img" aria-label="Timy">
      <defs>
        <linearGradient id={id} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      {/* clock ring, open at the top-right where time "flows" */}
      <path d="M22.9 9.6A9.4 9.4 0 1 0 25.4 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      {/* hands: bar of the T + stem */}
      <path d="M12.2 11.8h7.6M16 11.8V16.4l3.4 2.3" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25" cy="8.2" r="2.2" fill="#fbbf24" />
    </svg>
  );
}

export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className="text-lg font-bold tracking-tight">Timy</span>
    </span>
  );
}
