import { createFileRoute } from "@tanstack/react-router";
import { MockupNav } from "@/components/MockupNav";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/cuisine")({
  component: KitchenView,
  head: () => ({ meta: [{ title: "Cuisine" }] }),
});

type Order = {
  id: string;
  table: string;
  time: string;
  status: "new" | "cooking" | "ready";
  items: { qty: number; name: string; note?: string }[];
};

const ORDERS: Order[] = [
  { id: "142", table: "T7", time: "à l'instant", status: "new",
    items: [
      { qty: 2, name: "Tagliatelles truffe" },
      { qty: 1, name: "Burrata di Puglia", note: "sans basilic" },
      { qty: 2, name: "Tiramisu" },
    ] },
  { id: "141", table: "T3", time: "il y a 2 min", status: "new",
    items: [
      { qty: 1, name: "Risotto Milanese" },
      { qty: 1, name: "Arrabbiata", note: "extra piment" },
    ] },
  { id: "140", table: "T12", time: "il y a 5 min", status: "cooking",
    items: [
      { qty: 4, name: "Vitello tonnato" },
      { qty: 4, name: "Tagliatelles truffe" },
    ] },
  { id: "139", table: "T1", time: "il y a 8 min", status: "cooking",
    items: [
      { qty: 1, name: "Burrata di Puglia" },
      { qty: 2, name: "Risotto Milanese" },
    ] },
  { id: "138", table: "T9", time: "il y a 12 min", status: "ready",
    items: [{ qty: 3, name: "Tiramisu" }] },
];

const COLS = [
  { key: "new" as const, title: "Nouvelles", sub: "À démarrer" },
  { key: "cooking" as const, title: "En préparation", sub: "En cours" },
  { key: "ready" as const, title: "Prêtes", sub: "À servir" },
];

const ACTION = { new: "Démarrer", cooking: "Marquer prête", ready: "Servie" } as const;

function KitchenView() {
  return (
    <div className="min-h-screen bg-surface">
      <MockupNav />

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Service du soir</p>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">Cuisine</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-[13px] shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            En direct · 5 commandes
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {COLS.map((col) => {
            const list = ORDERS.filter((o) => o.status === col.key);
            return (
              <div key={col.key}>
                <div className="mb-4 flex items-baseline justify-between px-1">
                  <div>
                    <h2 className="font-display text-xl font-semibold tracking-tight">{col.title}</h2>
                    <p className="text-[12px] text-muted-foreground">{col.sub}</p>
                  </div>
                  <span className="font-display text-xl font-semibold tabular-nums text-muted-foreground">{list.length}</span>
                </div>
                <div className="space-y-3">
                  {list.map((o) => (
                    <article key={o.id} className="rounded-3xl bg-card p-5 shadow-soft transition-transform hover:-translate-y-0.5">
                      <header className="flex items-baseline justify-between">
                        <div>
                          <p className="font-display text-2xl font-semibold tracking-tight">{o.table}</p>
                          <p className="text-[11px] text-muted-foreground">#{o.id}</p>
                        </div>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" /> {o.time}
                        </span>
                      </header>
                      <ul className="mt-4 space-y-1.5">
                        {o.items.map((it, i) => (
                          <li key={i} className="text-[14px] leading-relaxed">
                            <span className="font-medium tabular-nums text-muted-foreground">{it.qty}×</span>{" "}
                            <span>{it.name}</span>
                            {it.note && <div className="mt-0.5 text-[12px] italic text-primary">{it.note}</div>}
                          </li>
                        ))}
                      </ul>
                      <button className={`mt-4 w-full rounded-full py-2.5 text-[13px] font-medium transition-opacity hover:opacity-90 ${
                        o.status === "ready" ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
                      }`}>
                        {ACTION[o.status]}
                      </button>
                    </article>
                  ))}
                  {list.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-border p-10 text-center text-[12px] text-muted-foreground">
                      Aucune commande
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
