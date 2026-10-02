"use client";
import { parseTime } from "@/lib/time";

/** 24h time field ("HH:MM"). Accepts "9", "930", "9:30"; commits on blur / Enter, reverts when invalid. */
export default function TimeInput({ value, onCommit, className = "cell", placeholder = "HH:MM", disabled }: {
  value: string;
  /** Return false to reject the value (the field reverts). */
  onCommit: (v: string) => void | boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      key={value}
      className={`${className} font-mono tabular-nums`}
      type="text"
      inputMode="numeric"
      maxLength={5}
      size={5}
      placeholder={placeholder}
      disabled={disabled}
      defaultValue={value}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      onBlur={(e) => {
        const t = parseTime(e.target.value);
        if (t === null) e.target.value = value;
        else if (t !== value) { if (onCommit(t) === false) e.target.value = value; }
        else e.target.value = value;
      }}
    />
  );
}
