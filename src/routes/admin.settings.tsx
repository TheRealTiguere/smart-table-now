import { createFileRoute, redirect  } from "@tanstack/react-router";
import { AdminGuard } from "@/components/AdminGuard";
import { meFn } from "@/lib/auth.functions";
import { AdminNav } from "@/components/AdminNav";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTenantSettingsFn, updateTenantSettingsFn } from "@/lib/settings.functions";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: async () => {
    const me = await meFn();
    if (!me) throw redirect({ to: "/admin/login" });
  },
  component: () => (
    <AdminGuard>
      <SettingsPage />
    </AdminGuard>
  ),
  head: () => ({ meta: [{ title: "Paramètres" }] }),
});

function SettingsPage() {
  const fetchFn = useServerFn(getTenantSettingsFn);
  const updateFn = useServerFn(updateTenantSettingsFn);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: () => fetchFn(),
  });

  const [form, setForm] = useState({
    name: "",
    address: "",
    siret: "",
    tva_number: "",
    tva_rate: 10,
    phone: "",
    email: "",
    receipt_footer: "Service compris",
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? "",
        address: data.address ?? "",
        siret: data.siret ?? "",
        tva_number: data.tva_number ?? "",
        tva_rate: Number(data.tva_rate ?? 10),
        phone: data.phone ?? "",
        email: data.email ?? "",
        receipt_footer: data.receipt_footer ?? "Service compris",
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => updateFn({ data: form }),
    onSuccess: () => {
      toast.success("Paramètres enregistrés");
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Configuration</p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">Paramètres du restaurant</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Ces informations apparaissent sur les notes/factures envoyées aux clients.
        </p>

        {isLoading ? (
          <p className="mt-10 text-muted-foreground">Chargement…</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mut.mutate();
            }}
            className="mt-10 space-y-6 rounded-3xl bg-surface p-8"
          >
            <Field label="Nom du restaurant" required>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                maxLength={120}
                className="w-full rounded-xl bg-card px-4 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
              />
            </Field>

            <Field label="Adresse de l'établissement">
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={3}
                maxLength={400}
                placeholder={`12 rue Exemple\n75001 Paris`}
                className="w-full rounded-xl bg-card px-4 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
              />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Numéro SIRET">
                <input
                  value={form.siret}
                  onChange={(e) => setForm({ ...form, siret: e.target.value })}
                  maxLength={40}
                  placeholder="123 456 789 00012"
                  className="w-full rounded-xl bg-card px-4 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
                />
              </Field>

              <Field label="N° TVA intracommunautaire">
                <input
                  value={form.tva_number}
                  onChange={(e) => setForm({ ...form, tva_number: e.target.value })}
                  maxLength={40}
                  placeholder="FR12345678901"
                  className="w-full rounded-xl bg-card px-4 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
                />
              </Field>

              <Field label="Téléphone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={40}
                  className="w-full rounded-xl bg-card px-4 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
                />
              </Field>

              <Field label="Email du restaurant">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={200}
                  className="w-full rounded-xl bg-card px-4 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
                />
              </Field>

              <Field label="Taux de TVA (%)" required>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.tva_rate}
                  onChange={(e) => setForm({ ...form, tva_rate: Number(e.target.value) })}
                  required
                  className="w-full rounded-xl bg-card px-4 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
                />
              </Field>
            </div>

            <Field label="Mention de bas de note">
              <input
                value={form.receipt_footer}
                onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                maxLength={400}
                placeholder="Service compris"
                className="w-full rounded-xl bg-card px-4 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
              />
            </Field>

            <button
              type="submit"
              disabled={mut.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {mut.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}
