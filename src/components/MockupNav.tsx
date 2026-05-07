import { Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/menu", label: "Vue client" },
  { to: "/cuisine", label: "Cuisine" },
  { to: "/dashboard", label: "Restaurateur" },
] as const;

export function MockupNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-brand-foreground shadow-soft">
            <QrCode className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold">Tabli</span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-border bg-card p-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-foreground text-background rounded-full px-4 py-1.5 text-sm" }}
              activeOptions={{ exact: true }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/dashboard"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Demander une démo
        </Link>
      </div>
    </header>
  );
}
