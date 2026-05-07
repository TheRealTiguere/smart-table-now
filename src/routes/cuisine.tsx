import { createFileRoute } from "@tanstack/react-router";
import { MockupNav } from "@/components/MockupNav";
import { Clock } from "lucide-react";
import { useStore, timeAgo, type OrderStatus } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/cuisine")({
  component: KitchenView,
  head: () => ({ meta: [{ title: "Cuisine" }] }),
});

const COLS: { key: OrderStatus; title: string; sub: string }[] = [
  { key: "new", title: "Nouvelles", sub: "À démarrer" },
  { key: "cooking", title: "En préparation", sub: "En cours" },
  { key: "ready", title: "Prêtes", sub: "À servir" },
];

const ACTION: Record<OrderStatus, string> = {
  new: "Démarrer",
  cooking: "Marquer prête",
  ready: "Servie",
  served: "Servie",
};

function KitchenView() {
  const mounted = useMounted();
  const orders = useStore((s) => s.orders.filter((o) => o.status !== "served"));
  const advance = useStore((s) => s.advanceOrder);
  const [, force] = useState(0);

  useEffect(() => {
    const i = setInterval(() => force((n) => n + 1), 20_000);
    return () => clearInterval(i);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface">
        <MockupNav />
      </div>
    );
  }

  const handle = (id: string, status: OrderStatus, table: string) => {
    advance(id);
    const next = status === "new" ? "préparation" : status === "cooking" ? "prête" : "servie";
    toast.success(`Commande #${id} · ${table}`, { description: `Statut : ${next}` });
  };

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
            En direct · {orders.length} commandes
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {COLS.map((col) => {
            const list = orders.filter((o) => o.status === col.key).sort((a, b) => a.createdAt - b.createdAt);
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
                          <Clock className="h-3 w-3" /> {timeAgo(o.createdAt)}
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
                      <button
                        onClick={() => handle(o.id, o.status, o.table)}
                        className={`mt-4 w-full rounded-full py-2.5 text-[13px] font-medium transition-opacity hover:opacity-90 ${
                          o.status === "ready" ? "bg-primary text-primary-foreground" : "bg-foreground text-background"
                        }`}
                      >
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
