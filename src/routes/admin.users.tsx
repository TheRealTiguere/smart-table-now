import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminNav } from "@/components/AdminNav";
import {
  listTenantUsersFn,
  createTenantUserFn,
  toggleTenantUserFn,
  deleteTenantUserFn,
  resetTenantUserPasswordFn,
} from "@/lib/users.functions";
import { useMe } from "@/lib/use-me";
import { Plus, Trash2, Power, KeyRound, ChefHat, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <AdminGuard>
      <UsersPage />
    </AdminGuard>
  ),
  head: () => ({ meta: [{ title: "Comptes · Admin" }] }),
});

const ROLE_LABEL = {
  restaurant_admin: "Admin restaurant",
  kitchen: "Cuisine",
} as const;

function UsersPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const list = useServerFn(listTenantUsersFn);
  const create = useServerFn(createTenantUserFn);
  const toggle = useServerFn(toggleTenantUserFn);
  const del = useServerFn(deleteTenantUserFn);
  const resetPwd = useServerFn(resetTenantUserPasswordFn);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["tenant-users"],
    queryFn: () => list(),
  });

  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ username: string; password: string; role: "kitchen" | "restaurant_admin" }>({
    username: "",
    password: "",
    role: "kitchen",
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: form });
      toast.success("Compte créé");
      setForm({ username: "", password: "", role: "kitchen" });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["tenant-users"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onReset = async (id: string, username: string) => {
    const pwd = prompt(`Nouveau mot de passe pour ${username} (min 6 caractères) :`);
    if (!pwd || pwd.length < 6) {
      if (pwd !== null) toast.error("Mot de passe trop court");
      return;
    }
    try {
      await resetPwd({ data: { id, password: pwd } });
      toast.success("Mot de passe réinitialisé");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onDelete = async (id: string, username: string) => {
    if (!confirm(`Supprimer le compte "${username}" ?`)) return;
    try {
      await del({ data: { id } });
      qc.invalidateQueries({ queryKey: ["tenant-users"] });
      toast.success("Supprimé");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onToggle = async (id: string, active: boolean) => {
    await toggle({ data: { id, active: !active } });
    qc.invalidateQueries({ queryKey: ["tenant-users"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Comptes équipe</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Crée des accès pour la cuisine ou un autre admin du restaurant.
            </p>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau compte
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="mt-6 space-y-3 rounded-3xl bg-surface p-6 ring-1 ring-border">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Identifiant" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
              <Field label="Mot de passe (min 6)" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-muted-foreground">Rôle</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as "kitchen" | "restaurant_admin" })}
                  className="w-full rounded-2xl bg-background py-3 px-4 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
                >
                  <option value="kitchen">Cuisine (uniquement écran cuisine)</option>
                  <option value="restaurant_admin">Admin restaurant (accès complet)</option>
                </select>
              </label>
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
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-2xl bg-surface px-5 py-4 ring-1 ring-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                    {u.role === "kitchen" ? <ChefHat className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.username}</span>
                      {u.id === me?.id && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">vous</span>}
                      {!u.active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">Désactivé</span>}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {ROLE_LABEL[u.role as keyof typeof ROLE_LABEL] ?? u.role}
                      {u.last_login_at && ` · dernière connexion ${new Date(u.last_login_at).toLocaleDateString("fr-FR")}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onReset(u.id, u.username)}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[12px]"
                  >
                    <KeyRound className="h-3 w-3" />
                    Mot de passe
                  </button>
                  {u.id !== me?.id && (
                    <>
                      <button
                        onClick={() => onToggle(u.id, u.active)}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[12px]"
                      >
                        <Power className="h-3 w-3" />
                        {u.active ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        onClick={() => onDelete(u.id, u.username)}
                        className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-[12px] text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        Supprimer
                      </button>
                    </>
                  )}
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
