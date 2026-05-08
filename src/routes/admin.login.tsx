import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Lock, User, ArrowLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { loginFn, setupStatusFn } from "@/lib/auth.functions";
import { useMe } from "@/lib/use-me";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
  head: () => ({ meta: [{ title: "Connexion · Admin" }] }),
});

function AdminLogin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const login = useServerFn(loginFn);
  const status = useServerFn(setupStatusFn);
  const { data: me } = useMe();

  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    status().then((s) => {
      if (s.needsSetup) navigate({ to: "/setup" });
    });
  }, [status, navigate]);

  useEffect(() => {
    if (me) {
      const dest = me.role === "super_admin" ? "/super-admin" : me.role === "kitchen" ? "/cuisine" : "/dashboard";
      navigate({ to: dest });
    }
  }, [me, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await login({ data: { username, password: pwd } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Connecté");
      const dest = res.role === "super_admin" ? "/super-admin" : res.role === "kitchen" ? "/cuisine" : "/dashboard";
      navigate({ to: dest });
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-sm px-6 pt-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Link>

        <div className="mt-12 flex items-center gap-2">
          <Logo size={36} />
          <span className="font-display text-[19px] font-semibold tracking-tight">Qorder</span>
        </div>

        <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">Espace équipe</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Connectez-vous avec votre identifiant.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Identifiant"
              className="w-full rounded-2xl bg-surface py-3.5 pl-11 pr-4 text-[15px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Mot de passe"
              className="w-full rounded-2xl bg-surface py-3.5 pl-11 pr-4 text-[15px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-foreground py-3.5 text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          Le menu client s'ouvre par scan du QR code de la table.
        </p>
      </div>
    </div>
  );
}
