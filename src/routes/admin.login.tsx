import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, ArrowLeft } from "lucide-react";
import { login, isAdmin } from "@/lib/admin-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
  head: () => ({ meta: [{ title: "Connexion · Admin" }] }),
});

function AdminLogin() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (isAdmin()) navigate({ to: "/dashboard" });
  }, [navigate]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (login(pwd)) {
      toast.success("Connecté");
      navigate({ to: "/dashboard" });
    } else {
      setErr(true);
      toast.error("Mot de passe incorrect");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-sm px-6 pt-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Link>

        <div className="mt-12 flex items-center gap-2">
          <div className="h-9 w-9 rounded-[10px] bg-foreground" />
          <span className="font-display text-[19px] font-semibold tracking-tight">Tabli</span>
        </div>

        <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">Espace équipe</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Connectez-vous pour accéder au pilotage et à la cuisine.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => {
                setPwd(e.target.value);
                setErr(false);
              }}
              placeholder="Mot de passe"
              className={`w-full rounded-2xl bg-surface py-3.5 pl-11 pr-4 text-[15px] outline-none ring-1 ring-inset transition-colors ${
                err ? "ring-destructive" : "ring-border focus:ring-foreground"
              }`}
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-2xl bg-foreground py-3.5 text-[15px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Se connecter
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          Le menu client s'ouvre par scan du QR code de la table.
        </p>
      </div>
    </div>
  );
}
