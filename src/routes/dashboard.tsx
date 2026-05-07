import { createFileRoute } from "@tanstack/react-router";
import { MockupNav } from "@/components/MockupNav";
import { TrendingUp, Users, Receipt, Clock, QrCode, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Tableau de bord · Tabli" }] }),
});

const STATS = [
  { label: "CA aujourd'hui", value: "2 480€", delta: "+18%", icon: TrendingUp },
  { label: "Commandes", value: "84", delta: "+12", icon: Receipt },
  { label: "Tables actives", value: "11/16", delta: "live", icon: Users },
  { label: "Temps moyen", value: "23 min", delta: "-4 min", icon: Clock },
];

const TABLES = [
  { id: "T1", status: "occupied", total: 64 },
  { id: "T2", status: "occupied", total: 32 },
  { id: "T3", status: "cooking", total: 48 },
  { id: "T4", status: "free", total: 0 },
  { id: "T5", status: "free", total: 0 },
  { id: "T6", status: "occupied", total: 92 },
  { id: "T7", status: "cooking", total: 58 },
  { id: "T8", status: "free", total: 0 },
  { id: "T9", status: "ready", total: 24 },
  { id: "T10", status: "occupied", total: 71 },
  { id: "T11", status: "free", total: 0 },
  { id: "T12", status: "cooking", total: 142 },
] as const;

const STATUS_STYLE = {
  free: "bg-card text-muted-foreground border-border",
  occupied: "bg-secondary text-secondary-foreground border-border",
  cooking: "bg-foreground text-background border-foreground",
  ready: "bg-brand text-brand-foreground border-brand",
} as const;

const STATUS_LABEL = { free: "Libre", occupied: "En salle", cooking: "Cuisine", ready: "À servir" };

const TOP = [
  { name: "Tagliatelles truffe", qty: 28, revenue: 616 },
  { name: "Tiramisu maison", qty: 22, revenue: 176 },
  { name: "Burrata di Puglia", qty: 19, revenue: 266 },
  { name: "Risotto Milanese", qty: 14, revenue: 266 },
];

function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <MockupNav />

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">Restaurateur</p>
            <h1 className="mt-1 font-display text-4xl font-semibold">Bonsoir, Marco 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">Voici votre service en un coup d'œil.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">
            <QrCode className="h-4 w-4" /> Imprimer les QR codes
          </button>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"><s.icon className="h-4 w-4"/></div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">{s.delta}</span>
              </div>
              <p className="mt-4 font-display text-3xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Tables map */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">Plan de salle</h2>
                <p className="text-xs text-muted-foreground">Statut en temps réel</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <span key={k} className={`rounded-full border px-2 py-0.5 ${STATUS_STYLE[k as keyof typeof STATUS_STYLE]}`}>{v}</span>
                ))}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {TABLES.map((t) => (
                <div key={t.id} className={`flex aspect-square flex-col items-center justify-center rounded-2xl border ${STATUS_STYLE[t.status]} p-3 text-center transition-transform hover:-translate-y-0.5`}>
                  <span className="font-display text-2xl font-semibold">{t.id}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider opacity-80">{STATUS_LABEL[t.status]}</span>
                  {t.total > 0 && <span className="mt-1 text-xs font-medium">{t.total}€</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Top items */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Top du jour</h2>
              <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4"/></button>
            </div>
            <ul className="mt-5 space-y-4">
              {TOP.map((p, i) => {
                const max = TOP[0].qty;
                return (
                  <li key={p.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold">{i + 1}</span>
                        {p.name}
                      </span>
                      <span className="font-medium">{p.revenue}€</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-gradient-brand" style={{ width: `${(p.qty / max) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{p.qty} commandés</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Recent activity */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold">Activité récente</h2>
          <ul className="mt-4 divide-y divide-border">
            {[
              { t: "il y a 1 min", e: "Table 7 a passé une commande", a: "58€" },
              { t: "il y a 4 min", e: "Table 12 — paiement reçu", a: "142€" },
              { t: "il y a 7 min", e: "Cuisine a marqué Table 9 prête", a: "" },
              { t: "il y a 11 min", e: "Table 3 a ajouté 2 desserts", a: "+16€" },
            ].map((r, i) => (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{r.e}</p>
                  <p className="text-xs text-muted-foreground">{r.t}</p>
                </div>
                {r.a && <span className="font-display text-base">{r.a}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
