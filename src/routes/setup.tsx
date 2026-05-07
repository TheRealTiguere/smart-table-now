import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { setupStatusFn, initialSetupFn } from "@/lib/auth.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
  head: () => ({ meta: [{ title: "Configuration initiale · Tabli" }] }),
});

function SetupPage() {
  const navigate = useNavigate();
  const status = useServerFn(setupStatusFn);
  const setup = useServerFn(initialSetupFn);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    superAdminUsername: "",
    superAdminPassword: "",
    superAdminEmail: "",
    restaurantName: "",
    restaurantSlug: "",
    restaurantTimezone: "Europe/Paris",
    restaurantAdminUsername: "",
    restaurantAdminPassword: "",
  });

  useEffect(() => {
    status().then((s) => {
      if (!s.needsSetup) navigate({ to: "/admin/login" });
      else setChecking(false);
    });
  }, [status, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await setup({ data: form });
      toast.success("Configuration terminée");
      navigate({ to: "/admin/login" });
    } catch (err) {
      toast.error((err as Error).message);
      setSubmitting(false);
    }
  };

  if (checking) return <div className="min-h-screen bg-background" />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-[10px] bg-foreground" />
          <span className="font-display text-[19px] font-semibold tracking-tight">Tabli</span>
        </div>
        <h1 className="mt-8 font-display text-4xl font-semibold tracking-tight">Configuration initiale</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Crée le compte super-admin et le premier restaurant.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-8">
          <Section title="Super-admin (gère plusieurs restaurants)">
            <Input label="Identifiant" value={form.superAdminUsername} onChange={set("superAdminUsername")} required />
            <Input label="Email (optionnel)" type="email" value={form.superAdminEmail} onChange={set("superAdminEmail")} />
            <Input label="Mot de passe (min 8)" type="password" value={form.superAdminPassword} onChange={set("superAdminPassword")} required />
          </Section>

          <Section title="Premier restaurant">
            <Input label="Nom du restaurant" value={form.restaurantName} onChange={set("restaurantName")} required />
            <Input label="Slug (url, ex: chez-mario)" value={form.restaurantSlug} onChange={set("restaurantSlug")} required />
            <Input label="Fuseau horaire" value={form.restaurantTimezone} onChange={set("restaurantTimezone")} required />
          </Section>

          <Section title="Compte admin du restaurant">
            <Input label="Identifiant" value={form.restaurantAdminUsername} onChange={set("restaurantAdminUsername")} required />
            <Input label="Mot de passe (min 8)" type="password" value={form.restaurantAdminPassword} onChange={set("restaurantAdminPassword")} required />
          </Section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-foreground py-3.5 text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Création..." : "Terminer la configuration"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] text-muted-foreground">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl bg-surface py-3 px-4 text-[15px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
      />
    </label>
  );
}
