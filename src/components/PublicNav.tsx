import { Link } from "@tanstack/react-router";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-[8px] bg-foreground" />
          <span className="font-display text-[17px] font-semibold tracking-tight">Tabli</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#fonctionnement" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Fonctionnement</a>
          <a href="#fonctionnalites" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Fonctionnalités</a>
          <a href="#resultats" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">Résultats</a>
        </nav>
        <Link
          to="/admin/login"
          className="rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
        >
          Espace équipe
        </Link>
      </div>
    </header>
  );
}
