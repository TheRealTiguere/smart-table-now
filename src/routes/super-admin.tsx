import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminGuard } from "@/components/AdminGuard";
import { listTenantsFn, createTenantFn, toggleTenantFn, deleteTenantFn } from "@/lib/tenants.functions";
import { logoutFn, meFn } from "@/lib/auth.functions";
import { Plus, Trash2, Power, LogOut, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/super-admin")({
  beforeLoad: async () => {
    const me = await meFn();
    if (!me) throw redirect({ to: "/admin/login" });
  },
  component: () => (
    <AdminGuard requireRole="super_admin">
      <SuperAdminPage />
    </AdminGuard>
  ),
  head: () => ({ meta: [{ title: "Super-admin · Qorder" }] }),
});

function SuperAdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listTenantsFn);
  const create = useServerFn(createTenantFn);
  const toggle = useServerFn(toggleTenantFn);
  const del = useServerFn(deleteTenantFn);
  const logout = useServerFn(logoutFn);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => list(),
  });

  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    timezone: "Europe/Paris",
    sourceUrl: "",
    adminUsername: "",
    adminPassword: "",
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: form });
      toast.success("Restaurant créé");
      setForm({ name: "", slug: "", timezone: "Europe/Paris", sourceUrl: "", adminUsername: "", adminPassword: "" });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["tenants"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" et toutes ses données ?`)) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["tenants"] });
    toast.success("Supprimé");
  };

  const onToggle = async (id: string, active: boolean) => {
    await toggle({ data: { id, active: !active } });
    qc.invalidateQueries({ queryKey: ["tenants"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-display text-[17px] font-semibold tracking-tight">Qorder</span>
            <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Super-admin
            </span>
          </div>
          <button
            onClick={async () => {
              await logout();
              qc.invalidateQueries({ queryKey: ["me"] });
              navigate({ to: "/admin/login" });
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-[13px] font-medium"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Restaurants</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {tenants.length} restaurant{tenants.length > 1 ? "s" : ""} déployé{tenants.length > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau restaurant
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="mt-6 space-y-3 rounded-3xl bg-surface p-6 ring-1 ring-border">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} required />
              <Field label="Fuseau horaire" value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} required />
              <Field label="URL source (Uber Eats / Deliveroo)" value={form.sourceUrl} onChange={(v) => setForm({ ...form, sourceUrl: v })} />
              <Field label="Identifiant admin" value={form.adminUsername} onChange={(v) => setForm({ ...form, adminUsername: v })} required />
              <Field label="Mot de passe admin" type="password" value={form.adminPassword} onChange={(v) => setForm({ ...form, adminPassword: v })} required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full bg-secondary px-4 py-2 text-[13px]">
                Annuler
              </button>
              <button type="submit" disabled={busy} className="rounded-full bg-foreground px-4 py-2 text-[13px] text-background disabled:opacity-50">
                {busy ? "Création..." : "Créer"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : tenants.length === 0 ? (
            <div className="rounded-3xl bg-surface p-10 text-center ring-1 ring-border">
              <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-[14px] text-muted-foreground">Aucun restaurant pour l'instant</p>
            </div>
          ) : (
            tenants.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl bg-surface px-5 py-4 ring-1 ring-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-[12px] text-muted-foreground">/{t.slug}</span>
                    {!t.active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Suspendu</span>}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {t.timezone} · admin: {t.admins.join(", ") || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggle(t.id, t.active)}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[12px]"
                    title={t.active ? "Suspendre" : "Réactiver"}
                  >
                    <Power className="h-3 w-3" />
                    {t.active ? "Suspendre" : "Activer"}
                  </button>
                  <button
                    onClick={() => onDelete(t.id, t.name)}
                    className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-[12px] text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-background py-3 px-4 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
      />
    </label>
  );
}
