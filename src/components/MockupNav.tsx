import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Aperçu" },
  { to: "/menu", label: "Client" },
  { to: "/cuisine", label: "Cuisine" },
  { to: "/dashboard", label: "Pilotage" },
] as const;

export function MockupNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-[8px] bg-foreground" />
          <span className="font-display text-[17px] font-semibold tracking-tight">Tabli</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "rounded-full px-3.5 py-1.5 text-[13px] font-medium text-foreground bg-secondary" }}
              activeOptions={{ exact: true }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/dashboard"
          className="rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
        >
          Démo
        </Link>
      </div>
    </header>
  );
}
