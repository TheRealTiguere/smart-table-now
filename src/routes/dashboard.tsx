import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminNav } from "@/components/AdminNav";
import { AdminGuard } from "@/components/AdminGuard";
import { ArrowUpRight, ArrowDownRight, QrCode, X, Check, RotateCcw, Plus, Trash2, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useStore, tableStatus, tableTotal, timeAgo, type TableStatus } from "@/lib/store";
import { useConfig } from "@/lib/config-store";
import { useMounted } from "@/lib/use-mounted";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AdminGuard>
      <Dashboard />
    </AdminGuard>
  ),
  head: () => ({ meta: [{ title: "Pilotage" }] }),
});

const STATUS_DOT: Record<TableStatus, string> = {
  free: "bg-border",
  occupied: "bg-muted-foreground",
  cooking: "bg-foreground",
  ready: "bg-primary",
};

const STATUS_LABEL: Record<TableStatus, string> = {
  free: "Libre",
  occupied: "En salle",
  cooking: "Cuisine",
  ready: "À servir",
};

function Dashboard() {
  const mounted = useMounted();
  const orders = useStore((s) => s.orders);
  const archived = useStore((s) => s.archived);
  const recallOrder = useStore((s) => s.recallOrder);
  const markPaid = useStore((s) => s.markPaid);
  const reset = useStore((s) => s.reset);
  const TABLE_IDS = useConfig((s) => s.tables);
  const addTable = useConfig((s) => s.addTable);
  const removeTable = useConfig((s) => s.removeTable);
  const renameTable = useConfig((s) => s.renameTable);
  const [selected, setSelected] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [editPlan, setEditPlan] = useState(false);
  const [newTable, setNewTable] = useState("");

  const stats = useMemo(() => {
    const today = orders.filter((o) => o.status !== "served" || o.paid);
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const activeTables = TABLE_IDS.filter((t) => tableStatus(orders, t) !== "free").length;
    const avgMin = orders.length
      ? Math.round(orders.reduce((s, o) => s + (Date.now() - o.createdAt) / 60_000, 0) / orders.length)
      : 0;
    return [
      { label: "Chiffre d'affaires", value: `${revenue}€`, delta: "+18%", up: true },
      { label: "Commandes", value: String(today.length), delta: `+${today.length}`, up: true },
      { label: "Tables actives", value: `${activeTables}/${TABLE_IDS.length}`, delta: "live", up: true },
      { label: "Temps moyen", value: `${avgMin} min`, delta: "−4 min", up: false },
    ];
  }, [orders]);

  const top = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach((o) =>
      o.items.forEach((it) => {
        const cur = map.get(it.name) ?? { name: it.name, qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.qty * it.price;
        map.set(it.name, cur);
      }),
    );
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders]);

  const activity = useMemo(() => {
    return [...orders]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6)
      .map((o) => ({
        t: timeAgo(o.createdAt),
        e:
          o.status === "ready"
            ? `Cuisine a marqué ${o.table} prête`
            : o.status === "cooking"
              ? `${o.table} en préparation`
              : o.status === "served"
                ? `${o.table} servie${o.paid ? " · payée" : ""}`
                : `${o.table} a passé une commande`,
        a: `${o.total}€`,
      }));
  }, [orders]);

  const selectedOrders = selected ? orders.filter((o) => o.table === selected && o.status !== "served") : [];
  const selectedTotal = selectedOrders.reduce((s, o) => s + o.total, 0);

  const handlePay = () => {
    if (!selected) return;
    selectedOrders.forEach((o) => markPaid(o.id));
    toast.success(`Table ${selected.replace("T", "")} encaissée`, { description: `${selectedTotal}€` });
    setSelected(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Pilotage</p>
            <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">Bonsoir, Marco.</h1>
            <p className="mt-2 text-[15px] text-muted-foreground">Voici votre service en un coup d'œil.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </button>
            <button
              onClick={() => setQrOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              <QrCode className="h-4 w-4" /> Imprimer les QR
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
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
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold tracking-tight">Plan de salle</h2>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                {!editPlan && (Object.keys(STATUS_LABEL) as TableStatus[]).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[k]}`} />
                    {STATUS_LABEL[k]}
                  </span>
                ))}
                <button
                  onClick={() => setEditPlan((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium ring-1 ring-border hover:bg-foreground hover:text-background"
                >
                  <Pencil className="h-3 w-3" /> {editPlan ? "Terminer" : "Modifier"}
                </button>
              </div>
            </div>

            {editPlan && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newTable.trim();
                  if (!name) return;
                  if (TABLE_IDS.includes(name)) {
                    toast.error("Cette table existe déjà");
                    return;
                  }
                  addTable(name);
                  setNewTable("");
                  toast.success(`Table ${name} ajoutée`);
                }}
                className="mt-4 flex gap-2"
              >
                <input
                  value={newTable}
                  onChange={(e) => setNewTable(e.target.value)}
                  placeholder="Nom de la table (ex. T13, Terrasse 1…)"
                  maxLength={20}
                  className="flex-1 rounded-2xl bg-card px-4 py-2.5 text-[14px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-foreground px-4 py-2.5 text-[13px] font-medium text-background hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </button>
              </form>
            )}

            <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {TABLE_IDS.map((id) => {
                const status = tableStatus(orders, id);
                const total = tableTotal(orders, id);
                if (editPlan) {
                  return (
                    <div
                      key={id}
                      className="relative flex aspect-square flex-col items-center justify-center rounded-2xl bg-card p-3 text-center shadow-xs"
                    >
                      <button
                        onClick={() => {
                          if (status !== "free") {
                            toast.error("Table occupée — impossible de la supprimer");
                            return;
                          }
                          if (confirm(`Supprimer la table ${id} ?`)) {
                            removeTable(id);
                            if (selected === id) setSelected(null);
                            toast.success(`Table ${id} supprimée`);
                          }
                        }}
                        className="absolute right-1.5 top-1.5 rounded-full bg-foreground/90 p-1 text-background hover:bg-foreground"
                        aria-label={`Supprimer ${id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <input
                        defaultValue={id}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (!v || v === id) {
                            e.target.value = id;
                            return;
                          }
                          if (TABLE_IDS.includes(v)) {
                            toast.error("Nom déjà utilisé");
                            e.target.value = id;
                            return;
                          }
                          renameTable(id, v);
                          if (selected === id) setSelected(v);
                        }}
                        className="w-full bg-transparent text-center font-display text-xl font-semibold tracking-tight outline-none focus:underline"
                      />
                      <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[status]}</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={id}
                    onClick={() => setSelected(id)}
                    className="group relative flex aspect-square flex-col items-center justify-center rounded-2xl bg-card p-3 text-center shadow-xs transition-transform hover:-translate-y-0.5"
                  >
                    <span className={`absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
                    <span className="font-display text-2xl font-semibold tracking-tight">{id}</span>
                    <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[status]}</span>
                    {total > 0 && <span className="mt-1 text-[11px] font-medium tabular-nums">{total}€</span>}
                  </button>
                );
              })}
              {TABLE_IDS.length === 0 && (
                <p className="col-span-full text-center text-[13px] text-muted-foreground py-8">
                  Aucune table. Activez « Modifier » pour en ajouter.
                </p>
              )}
            </div>
          </div>

          {/* Top */}
          <div className="rounded-3xl bg-surface p-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Top du jour</h2>
            {top.length === 0 ? (
              <p className="mt-6 text-[13px] text-muted-foreground">Aucune vente pour l'instant.</p>
            ) : (
              <ul className="mt-6 space-y-5">
                {top.map((p, i) => {
                  const max = top[0].qty;
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
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="mt-4 rounded-3xl bg-surface p-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Activité</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">Pas d'activité pour le moment.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {activity.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-3.5 text-[14px]">
                  <div>
                    <p className="font-medium">{r.e}</p>
                    <p className="text-[12px] text-muted-foreground">{r.t}</p>
                  </div>
                  {r.a && <span className="font-display text-[15px] font-semibold tabular-nums">{r.a}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Table detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-[2rem] bg-card p-6 shadow-pop animate-in slide-in-from-bottom sm:rounded-3xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Table {selected.replace("T", "")}</p>
                <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight">{STATUS_LABEL[tableStatus(orders, selected)]}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>

            {selectedOrders.length === 0 ? (
              <p className="mt-6 text-center text-[14px] text-muted-foreground">Aucune commande active.</p>
            ) : (
              <>
                <ul className="mt-5 space-y-4">
                  {selectedOrders.map((o) => (
                    <li key={o.id} className="rounded-2xl bg-surface p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-muted-foreground">#{o.id} · {timeAgo(o.createdAt)}</span>
                        <span className="text-[12px] font-medium">{o.status === "new" ? "Reçue" : o.status === "cooking" ? "En préparation" : "Prête"}</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-[13px]">
                        {o.items.map((it, i) => (
                          <li key={i} className="flex justify-between">
                            <span><span className="tabular-nums text-muted-foreground">{it.qty}× </span>{it.name}</span>
                            <span className="tabular-nums">{it.qty * it.price}€</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-[14px] text-muted-foreground">Addition</span>
                  <span className="font-display text-2xl font-semibold tabular-nums">{selectedTotal}€</span>
                </div>
                <button onClick={handlePay} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-[15px] font-medium text-background transition-opacity hover:opacity-90">
                  <Check className="h-4 w-4" /> Encaisser
                </button>
              </>
            )}

            <Link
              to="/menu"
              search={{ table: selected }}
              onClick={() => setSelected(null)}
              className="mt-3 block text-center text-[12px] text-muted-foreground underline-offset-4 hover:underline"
            >
              Ouvrir le menu de cette table →
            </Link>
          </div>
        </div>
      )}

      {/* QR sheet */}
      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setQrOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-3xl bg-card p-6 shadow-pop animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold tracking-tight">QR codes des tables</h3>
              <button onClick={() => setQrOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">Le client scanne, le menu de sa table s'ouvre.</p>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {TABLE_IDS.map((id) => {
                const url = typeof window !== "undefined" ? `${window.location.origin}/menu?table=${id}` : `/menu?table=${id}`;
                return (
                  <div key={id} className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-4">
                    <div className="rounded-lg bg-white p-2">
                      <QRCodeSVG value={url} size={80} level="M" />
                    </div>
                    <span className="font-display text-[15px] font-semibold">{id}</span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                window.print();
                toast.success("Impression lancée");
              }}
              className="mt-5 w-full rounded-2xl bg-foreground py-3.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Imprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
