import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/admin-auth";

const links = [
  { to: "/cuisine" as const, label: "Cuisine" },
  { to: "/dashboard" as const, label: "Pilotage" },
  { to: "/admin/menu" as const, label: "Carte" },
];

export function AdminNav() {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-[8px] bg-foreground" />
          <span className="font-display text-[17px] font-semibold tracking-tight">Tabli</span>
          <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Admin</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "rounded-full px-3.5 py-1.5 text-[13px] font-medium text-foreground bg-secondary" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            logout();
            navigate({ to: "/" });
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-[13px] font-medium text-foreground transition-opacity hover:opacity-80"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
