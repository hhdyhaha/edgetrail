import { type ClassValue, clsx } from "clsx";
import type * as React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "accent";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[#181c23] text-white hover:bg-[#252b35] dark:bg-[#f8fafc] dark:text-[#181c23] dark:hover:bg-white",
        variant === "accent" && "bg-[#ec7124] text-white hover:bg-[#d85f18]",
        variant === "secondary" &&
          "border border-[#dee3ea] bg-white text-[#181c23] hover:bg-[#f8fafc] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-900",
        variant === "ghost" &&
          "text-slate-600 hover:bg-[#fff5ee] hover:text-[#181c23] dark:text-slate-200 dark:hover:bg-slate-900",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[#dee3ea] bg-white p-5 shadow-[0_5px_0_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
      {...props}
    />
  );
}

export function MetricCard({
  label,
  value,
  note,
  tone = "orange",
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: "orange" | "green" | "blue" | "purple";
}) {
  const toneStyle = badgeToneStyle(tone);

  return (
    <Card>
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-4 text-3xl font-bold tabular-nums text-[#181c23] dark:text-slate-50">
        {value}
      </div>
      {note ? (
        <div
          className="mt-4 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold"
          style={toneStyle}
        >
          {note}
        </div>
      ) : null}
    </Card>
  );
}

export function Badge({
  children,
  className,
  style,
  tone = "green",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "green" | "orange" | "slate" | "blue";
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        className,
      )}
      style={{ ...badgeToneStyle(tone), ...style }}
      {...props}
    >
      {children}
    </span>
  );
}

function badgeToneStyle(
  tone: "green" | "orange" | "slate" | "blue" | "purple",
): React.CSSProperties {
  return {
    blue: {
      backgroundColor: "#eff6ff",
      borderColor: "#dbeafe",
      color: "#1d4ed8",
    },
    green: {
      backgroundColor: "#ecfdf5",
      borderColor: "#d1fae5",
      color: "#047857",
    },
    orange: {
      backgroundColor: "#fff5ee",
      borderColor: "#fed7aa",
      color: "#d85f18",
    },
    purple: {
      backgroundColor: "#f5f3ff",
      borderColor: "#ddd6fe",
      color: "#6d28d9",
    },
    slate: {
      backgroundColor: "#f1f5f9",
      borderColor: "#e2e8f0",
      color: "#475569",
    },
  }[tone];
}
