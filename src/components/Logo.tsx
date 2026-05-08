import logo from "@/assets/qorder-logo.png";

export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={logo}
      alt="Qorder"
      width={size}
      height={size}
      className={`object-contain dark:invert ${className}`}
    />
  );
}
