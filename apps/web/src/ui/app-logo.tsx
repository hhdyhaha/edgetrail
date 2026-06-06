import { m } from "#/paraglide/messages";

export function AppLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      alt={m.app_title()}
      className={`shrink-0 rounded-lg object-cover ${className}`}
      height="192"
      src="/logo192.png"
      width="192"
    />
  );
}
