import { createFileRoute } from "@tanstack/react-router";
import { MockupNav } from "@/components/MockupNav";
import { Bell, Check, Clock, ChefHat } from "lucide-react";

export const Route = createFileRoute("/cuisine")({
  component: KitchenView,
  head: () => ({ meta: [{ title: "Cuisine · Tabli" }] }),
});

type Order = {
  id: string;
  table: string;
  time: string;
  status: "new" | "cooking" | "ready";
  items: { qty: number; name: string; note?: string }[];
};

const ORDERS: Order[] = [
  { id: "#142", table: "T7", time: "à l'instant", status: "new",
    items: [
      { qty: 2, name: "Tagliatelles truffe" },
      { qty: 1, name: "Burrata di Puglia", note: "sans basilic" },
      { qty: 2, name: "Tiramisu" },
    ] },
  { id: "#141", table: "T3", time: "il y a 2 min", status: "new",
    items: [
      { qty: 1, name: "Risotto Milanese" },
      { qty: 1, name: "Arrabbiata piccante", note: "extra piment" },
    ] },
  { id: "#140", table: "T12", time: "il y a 5 min", status: "cooking",
    items: [
      { qty: 4, name: "Vitello tonnato" },
      { qty: 4, name: "Tagliatelles truffe" },
      { qty: 2, name: "Panna cotta" },
    ] },
  { id: "#139", table: "T1", time: "il y a 8 min", status: "cooking",
    items: [
      { qty: 1, name: "Burrata di Puglia" },
      { qty: 2, name: "Risotto Milanese" },
    ] },
  { id: "#138", table: "T9", time: "il y a 12 min", status: "ready",
    items: [
      { qty: 3, name: "Tiramisu" },
    ] },
];

const STATUS = {
  new: { label: "Nouvelle", chip: "bg-brand text-brand-foreground", border: "border-brand" },
  cooking: { label: "En préparation", chip: "bg-foreground text-background", border: "border-foreground" },
  ready: { label: "Prêt à servir", chip: "bg-secondary text-secondary-foreground", border: "border-border" },
} as const;

function KitchenView() {
  const cols: { key: Order["status"]; title: string; icon: typeof Bell }[] = [
    { key: "new", title: "Nouvelles", icon: Bell },
    { key: "cooking", title: "En préparation", icon: ChefHat },
    { key: "ready", title: "Prêtes", icon: Check },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <MockupNav />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">Service du soir</p>
            <h1 className="mt-1 font-display text-4xl font-semibold">Cuisine — La Trattoria</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" /> En direct · 5 commandes actives
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {cols.map((col) => {
            const list = ORDERS.filter((o) => o.status === col.key);
            return (
              <div key={col.key} className="rounded-3xl border border-border bg-background/50 p-4">
                <div className="mb-4 flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <col.icon className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-display text-lg font-semibold">{col.title}</h2>
                  </div>
                  <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">{list.length}</span>
                </div>
                <div className="space-y-3">
                  {list.map((o) => (
                    <article key={o.id} className={`rounded-2xl border-l-4 ${STATUS[o.status].border} bg-card p-4 shadow-soft`}>
                      <header className="flex items-center justify-between">
                        <div>
                          <p className="font-display text-xl font-semibold">{o.table}</p>
                          <p className="text-xs text-muted-foreground">Commande {o.id}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${STATUS[o.status].chip}`}>
                          {STATUS[o.status].label}
                        </span>
                      </header>
                      <ul className="mt-3 space-y-1.5">
                        {o.items.map((it, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium">{it.qty}×</span> {it.name}
                            {it.note && <span className="ml-1 italic text-brand">— {it.note}</span>}
                          </li>
                        ))}
                      </ul>
                      <footer className="mt-4 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {o.time}
                        </span>
                        <button className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:opacity-90">
                          {o.status === "new" ? "Démarrer" : o.status === "cooking" ? "Marquer prêt" : "Servi"}
                        </button>
                      </footer>
                    </article>
                  ))}
                  {list.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
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
