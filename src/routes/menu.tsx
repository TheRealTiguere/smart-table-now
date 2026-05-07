import { createFileRoute, Link } from "@tanstack/react-router";
import { MockupNav } from "@/components/MockupNav";
import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Leaf, Flame, X, ChevronUp, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import { toast } from "sonner";

export const Route = createFileRoute("/menu")({
  component: ClientMenu,
  head: () => ({ meta: [{ title: "Menu · Table" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ table: (s.table as string) || undefined }),
});

type Item = { id: string; name: string; desc: string; price: number; tags?: ("veggie" | "spicy")[]; category: string; available?: boolean };

const ITEMS: Item[] = [
  { id: "1", name: "Burrata di Puglia", desc: "Tomates anciennes, basilic, huile AOP", price: 14, tags: ["veggie"], category: "Entrées" },
  { id: "2", name: "Vitello tonnato", desc: "Veau, sauce thon-câpres", price: 16, category: "Entrées" },
  { id: "3", name: "Tagliatelles truffe", desc: "Pâtes fraîches, truffe noire, parmesan 24 mois", price: 22, category: "Plats" },
  { id: "4", name: "Risotto Milanese", desc: "Carnaroli, safran, moelle", price: 19, tags: ["veggie"], category: "Plats" },
  { id: "5", name: "Arrabbiata piccante", desc: "Tomate, ail, piment de Calabre", price: 15, tags: ["spicy", "veggie"], category: "Plats", available: false },
  { id: "6", name: "Tiramisu maison", desc: "Mascarpone, café, cacao", price: 8, category: "Desserts" },
  { id: "7", name: "Panna cotta", desc: "Crème vanille, coulis fruits rouges", price: 8, tags: ["veggie"], category: "Desserts" },
];

const CATS = ["Tous", "Entrées", "Plats", "Desserts"];

function ClientMenu() {
  const mounted = useMounted();
  const search = Route.useSearch();
  const currentTable = useStore((s) => s.currentTable);
  const setCurrentTable = useStore((s) => s.setCurrentTable);
  const addOrder = useStore((s) => s.addOrder);
  const allOrders = useStore((s) => s.orders);
  const myOrders = allOrders.filter((o) => o.table === (search.table || currentTable) && o.status !== "served");

  const table = search.table || currentTable;
  useEffect(() => {
    if (search.table && search.table !== currentTable) setCurrentTable(search.table);
  }, [search.table, currentTable, setCurrentTable]);

  const [cat, setCat] = useState("Tous");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const filtered = cat === "Tous" ? ITEMS : ITEMS.filter((i) => i.category === cat);
  const total = useMemo(
    () => Object.entries(cart).reduce((s, [id, q]) => s + (ITEMS.find((i) => i.id === id)?.price ?? 0) * q, 0),
    [cart],
  );
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  const add = (id: string) => {
    const it = ITEMS.find((i) => i.id === id);
    if (it && it.available === false) {
      toast.error("Plat indisponible ce soir");
      return;
    }
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  };
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const { [id]: _removed, ...rest } = c;
      return n <= 0 ? rest : { ...c, [id]: n };
    });

  const send = () => {
    if (count === 0) return;
    const items = Object.entries(cart).map(([id, qty]) => {
      const it = ITEMS.find((i) => i.id === id)!;
      return { id, name: it.name, price: it.price, qty };
    });
    const orderId = addOrder({ table, items });
    setCart({});
    setOpen(false);
    setSent(true);
    toast.success(`Commande #${orderId} envoyée en cuisine`, {
      description: `Table ${table.replace("T", "")} · ${total}€`,
    });
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <MockupNav />

      {/* Header */}
      <div className="mx-auto max-w-2xl px-6 pt-10 pb-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Table {table.replace("T", "")}</p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">La Trattoria</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Bonsoir — voici la carte de ce soir.</p>

        {myOrders.length > 0 && (
          <div className="mt-5 rounded-2xl bg-surface p-4">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Vos commandes en cours</p>
            <ul className="mt-2 space-y-1.5">
              {myOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${o.status === "ready" ? "bg-primary" : o.status === "cooking" ? "bg-foreground" : "bg-muted-foreground"}`} />
                    #{o.id} · {o.status === "new" ? "Reçue" : o.status === "cooking" ? "En préparation" : "Prête"}
                  </span>
                  <span className="font-medium tabular-nums">{o.total}€</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="sticky top-[57px] z-30 glass border-b border-border/60">
        <div className="mx-auto flex max-w-2xl gap-1.5 overflow-x-auto px-6 py-3">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                cat === c ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <main className="mx-auto max-w-2xl px-6 py-6">
        <ul className="divide-y divide-border">
          {filtered.map((item) => {
            const unavailable = item.available === false;
            return (
              <li key={item.id} className={`flex gap-4 py-5 ${unavailable ? "opacity-50" : ""}`}>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-[18px] font-semibold tracking-tight">{item.name}</h3>
                    <span className="text-[15px] font-medium tabular-nums text-muted-foreground">{item.price}€</span>
                  </div>
                  <p className="mt-1 text-[14px] text-muted-foreground">{item.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {item.tags?.includes("veggie") && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          <Leaf className="h-3 w-3" /> Veggie
                        </span>
                      )}
                      {item.tags?.includes("spicy") && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-destructive">
                          <Flame className="h-3 w-3" /> Piquant
                        </span>
                      )}
                      {unavailable && (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          Épuisé
                        </span>
                      )}
                    </div>
                    {cart[item.id] ? (
                      <div className="inline-flex items-center gap-3 rounded-full bg-foreground px-1 py-1 text-background">
                        <button onClick={() => sub(item.id)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/10">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-4 text-center text-[13px] font-medium tabular-nums">{cart[item.id]}</span>
                        <button onClick={() => add(item.id)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/10">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => add(item.id)}
                        disabled={unavailable}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex justify-center">
          <Link to="/cuisine" className="text-[12px] text-muted-foreground underline-offset-4 hover:underline">
            Voir l'écran cuisine →
          </Link>
        </div>
      </main>

      {/* Cart bar */}
      {count > 0 && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-foreground px-5 py-3.5 text-background shadow-pop"
        >
          <span className="flex items-center gap-2 text-[14px] font-medium">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/15 text-[11px] font-semibold tabular-nums">{count}</span>
            Voir le panier
          </span>
          <span className="flex items-center gap-1.5 text-[15px] font-semibold tabular-nums">
            {total}€ <ChevronUp className="h-4 w-4" />
          </span>
        </button>
      )}

      {sent && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-pop animate-in fade-in slide-in-from-bottom">
          <Check className="h-4 w-4" />
          <span className="text-[14px] font-medium">Envoyée en cuisine</span>
        </div>
      )}

      {/* Cart sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-[2rem] bg-card p-6 shadow-pop animate-in slide-in-from-bottom">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold tracking-tight">Votre commande</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-5 divide-y divide-border">
              {Object.entries(cart).map(([id, q]) => {
                const it = ITEMS.find((i) => i.id === id)!;
                return (
                  <li key={id} className="flex items-center justify-between py-3 text-[14px]">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-1 py-1">
                        <button onClick={() => sub(id)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-background"><Minus className="h-3 w-3" /></button>
                        <span className="min-w-3 text-center text-[12px] font-medium tabular-nums">{q}</span>
                        <button onClick={() => add(id)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-background"><Plus className="h-3 w-3" /></button>
                      </div>
                      <span>{it.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">{it.price * q}€</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-[14px] text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-semibold tabular-nums">{total}€</span>
            </div>
            <button onClick={send} className="mt-5 w-full rounded-2xl bg-foreground py-4 text-[15px] font-medium text-background transition-opacity hover:opacity-90">
              Envoyer en cuisine
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Paiement à table en fin de repas</p>
          </div>
        </div>
      )}
    </div>
  );
}
