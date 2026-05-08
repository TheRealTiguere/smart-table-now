import { createFileRoute, redirect  } from "@tanstack/react-router";
import { AdminGuard } from "@/components/AdminGuard";
import { meFn } from "@/lib/auth.functions";
import { AdminNav } from "@/components/AdminNav";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllOrdersForRangeFn, clearArchivedFn } from "@/lib/orders.functions";
import { useConfig } from "@/lib/config-store";
import { useMounted } from "@/lib/use-mounted";
import { useMemo, useState } from "react";
import { ArrowUpRight, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/analytics")({
  beforeLoad: async () => {
    const me = await meFn();
    if (!me) throw redirect({ to: "/admin/login" });
  },
  component: () => (
    <AdminGuard>
      <AnalyticsPage />
    </AdminGuard>
  ),
  head: () => ({ meta: [{ title: "Analyses" }] }),
});

type Range = "day" | "week" | "month" | "year";

const RANGE_LABELS: Record<Range, string> = {
  day: "Jour",
  week: "Semaine",
  month: "Mois",
  year: "Année",
};

function rangeStart(r: Range, now: Date = new Date()): number {
  const d = new Date(now);
  if (r === "day") {
    d.setHours(0, 0, 0, 0);
  } else if (r === "week") {
    const day = (d.getDay() + 6) % 7; // Monday-based
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
  } else if (r === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
  }
  return d.getTime();
}

function AnalyticsPage() {
  const mounted = useMounted();
  const listFn = useServerFn(listAllOrdersForRangeFn);
  const clearFn = useServerFn(clearArchivedFn);
  const restaurantName = useConfig((s) => s.restaurantName);
  const qc = useQueryClient();
  const [range, setRange] = useState<Range>("day");

  const sinceMs = rangeStart(range);
  const q = useQuery({
    queryKey: ["analytics", range],
    queryFn: () => listFn({ data: { sinceMs } }),
    refetchInterval: 30_000,
  });
  const filtered = q.data ?? [];
  const clearHistory = async () => {
    await clearFn();
    qc.invalidateQueries({ queryKey: ["analytics"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    toast.success("Historique effacé");
  };

  const stats = useMemo(() => {
    const revenue = filtered.reduce((s, o) => s + o.total, 0);
    const count = filtered.length;
    const items = filtered.reduce((s, o) => s + o.items.reduce((x, i) => x + i.qty, 0), 0);
    const avg = count ? revenue / count : 0;
    return { revenue, count, items, avg };
  }, [filtered]);

  // Top items
  const top = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    filtered.forEach((o) =>
      o.items.forEach((i) => {
        const cur = map.get(i.name) ?? { name: i.name, qty: 0, revenue: 0 };
        cur.qty += i.qty;
        cur.revenue += i.qty * i.price;
        map.set(i.name, cur);
      }),
    );
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [filtered]);

  // Time series buckets
  const series = useMemo(() => {
    const buckets: { label: string; value: number }[] = [];
    const now = new Date();
    if (range === "day") {
      // 24 hourly buckets
      for (let h = 0; h < 24; h++) buckets.push({ label: `${h}h`, value: 0 });
      filtered.forEach((o) => {
        const h = new Date(o.createdAt).getHours();
        buckets[h].value += o.total;
      });
    } else if (range === "week") {
      const labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      labels.forEach((l) => buckets.push({ label: l, value: 0 }));
      filtered.forEach((o) => {
        const day = (new Date(o.createdAt).getDay() + 6) % 7;
        buckets[day].value += o.total;
      });
    } else if (range === "month") {
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= days; d++) buckets.push({ label: String(d), value: 0 });
      filtered.forEach((o) => {
        const d = new Date(o.createdAt).getDate();
        buckets[d - 1].value += o.total;
      });
    } else {
      const labels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      labels.forEach((l) => buckets.push({ label: l, value: 0 }));
      filtered.forEach((o) => {
        const m = new Date(o.createdAt).getMonth();
        buckets[m].value += o.total;
      });
    }
    return buckets;
  }, [filtered, range]);

  const maxSeries = Math.max(1, ...series.map((b) => b.value));

  const exportCsv = () => {
    const rows = [["id", "table", "createdAt", "status", "paid", "total", "items"]];
    filtered.forEach((o) => {
      rows.push([
        o.id,
        o.table,
        new Date(o.createdAt).toISOString(),
        o.status,
        o.paid ? "1" : "0",
        String(o.total),
        o.items.map((i) => `${i.qty}× ${i.name}`).join(" | "),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${restaurantName}-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface">
        <AdminNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <AdminNav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Analyses</p>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">Historique &amp; performances</h1>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Suivez le chiffre d'affaires, les commandes et les plats les plus vendus.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-card p-1 ring-1 ring-border">
              {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={
                    "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors " +
                    (range === r ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-[13px] font-medium ring-1 ring-border hover:bg-foreground hover:text-background"
            >
              <Download className="h-3.5 w-3.5" /> Exporter CSV
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Chiffre d'affaires", value: `${stats.revenue.toFixed(0)}€` },
            { label: "Commandes", value: String(stats.count) },
            { label: "Articles vendus", value: String(stats.items) },
            { label: "Panier moyen", value: `${stats.avg.toFixed(1)}€` },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl bg-card p-6 shadow-xs">
              <p className="text-[12px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-3 font-display text-4xl font-semibold tracking-tight tabular-nums">{s.value}</p>
              <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary">
                <ArrowUpRight className="h-3.5 w-3.5" /> {RANGE_LABELS[range]}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="mt-6 rounded-3xl bg-card p-6 shadow-xs">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Évolution du CA</h2>
            <span className="text-[12px] text-muted-foreground">{RANGE_LABELS[range]}</span>
          </div>
          {filtered.length === 0 ? (
            <p className="mt-8 text-center text-[13px] text-muted-foreground">Aucune commande sur cette période.</p>
          ) : (
            <div className="mt-6 flex h-56 items-end gap-1">
              {series.map((b, i) => (
                <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-lg bg-foreground/15 transition-colors group-hover:bg-foreground"
                    style={{ height: `${(b.value / maxSeries) * 100}%`, minHeight: b.value > 0 ? "4px" : "0px" }}
                    title={`${b.label} · ${b.value.toFixed(0)}€`}
                  />
                  <span className="text-[9px] text-muted-foreground">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Top items */}
          <div className="rounded-3xl bg-card p-6 shadow-xs">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Top vendus</h2>
            {top.length === 0 ? (
              <p className="mt-6 text-[13px] text-muted-foreground">Aucune vente sur cette période.</p>
            ) : (
              <ul className="mt-6 space-y-5">
                {top.map((p, i) => {
                  const max = top[0].qty;
                  return (
                    <li key={p.name}>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2.5">
                          <span className="font-display text-[11px] font-semibold text-muted-foreground tabular-nums">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="font-medium">{p.name}</span>
                        </span>
                        <span className="font-medium tabular-nums">
                          {p.qty} · {p.revenue.toFixed(0)}€
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{ width: `${(p.qty / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* History list */}
          <div className="rounded-3xl bg-card p-6 shadow-xs">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold tracking-tight">Historique</h2>
              <button
                onClick={() => {
                  if (confirm("Effacer tout l'historique archivé ?")) {
                    clearHistory();
                  }
                }}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" /> Vider
              </button>
            </div>
            {filtered.length === 0 ? (
              <p className="mt-6 text-[13px] text-muted-foreground">Aucune commande à afficher.</p>
            ) : (
              <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
                {[...filtered]
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((o) => (
                    <li key={o.id} className="rounded-2xl bg-surface p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium">
                            #{o.id} · {o.table}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(o.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-semibold tabular-nums">{o.total}€</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {o.status === "served" ? (o.paid ? "Payée" : "Servie") : o.status}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1.5 truncate text-[12px] text-muted-foreground">
                        {o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
