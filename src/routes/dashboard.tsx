import { createFileRoute } from "@tanstack/react-router";
import { MockupNav } from "@/components/MockupNav";
import { ArrowUpRight, ArrowDownRight, QrCode } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Pilotage" }] }),
});

const STATS = [
  { label: "Chiffre d'affaires", value: "2 480€", delta: "+18%", up: true },
  { label: "Commandes", value: "84", delta: "+12", up: true },
  { label: "Tables actives", value: "11/16", delta: "live", up: true },
  { label: "Temps moyen", value: "23 min", delta: "−4 min", up: false },
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

const STATUS_DOT = {
  free: "bg-border",
  occupied: "bg-muted-foreground",
  cooking: "bg-foreground",
  ready: "bg-primary",
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

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Pilotage</p>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">Bonsoir, Marco.</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">Voici votre service en un coup d'œil.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background">
            <QrCode className="h-4 w-4" /> Imprimer les QR
          </button>
        </div>

        {/* Stats */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-3xl bg-surface p-6">
              <p className="text-[13px] text-muted-foreground">{s.label}</p>
              <p className="mt-3 font-display text-4xl font-semibold tracking-tight tabular-nums">{s.value}</p>
              <div className={`mt-2 inline-flex items-center gap-1 text-[12px] font-medium ${s.up ? "text-primary" : "text-muted-foreground"}`}>
                {s.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {s.delta}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Tables */}
          <div className="rounded-3xl bg-surface p-6 lg:col-span-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-semibold tracking-tight">Plan de salle</h2>
              <div className="flex flex-wrap gap-3 text-[11px]">
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[k as keyof typeof STATUS_DOT]}`} />
                    {v}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {TABLES.map((t) => (
                <div key={t.id} className="group relative flex aspect-square flex-col items-center justify-center rounded-2xl bg-card p-3 text-center shadow-xs transition-transform hover:-translate-y-0.5">
                  <span className={`absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full ${STATUS_DOT[t.status]}`} />
                  <span className="font-display text-2xl font-semibold tracking-tight">{t.id}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[t.status]}</span>
                  {t.total > 0 && <span className="mt-1 text-[11px] font-medium tabular-nums">{t.total}€</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Top */}
          <div className="rounded-3xl bg-surface p-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Top du jour</h2>
            <ul className="mt-6 space-y-5">
              {TOP.map((p, i) => {
                const max = TOP[0].qty;
                return (
                  <li key={p.name}>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-2.5">
                        <span className="font-display text-[11px] font-semibold text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                        <span className="font-medium">{p.name}</span>
                      </span>
                      <span className="font-medium tabular-nums">{p.revenue}€</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-card">
                      <div className="h-full rounded-full bg-foreground" style={{ width: `${(p.qty / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Activity */}
        <div className="mt-4 rounded-3xl bg-surface p-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Activité</h2>
          <ul className="mt-4 divide-y divide-border">
            {[
              { t: "il y a 1 min", e: "Table 7 a passé une commande", a: "58€" },
              { t: "il y a 4 min", e: "Table 12 — paiement reçu", a: "142€" },
              { t: "il y a 7 min", e: "Cuisine a marqué Table 9 prête", a: "" },
              { t: "il y a 11 min", e: "Table 3 a ajouté 2 desserts", a: "+16€" },
            ].map((r, i) => (
              <li key={i} className="flex items-center justify-between py-3.5 text-[14px]">
                <div>
                  <p className="font-medium">{r.e}</p>
                  <p className="text-[12px] text-muted-foreground">{r.t}</p>
                </div>
                {r.a && <span className="font-display text-[15px] font-semibold tabular-nums">{r.a}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
