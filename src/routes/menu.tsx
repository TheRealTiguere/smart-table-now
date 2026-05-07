import { createFileRoute } from "@tanstack/react-router";
import { MockupNav } from "@/components/MockupNav";
import { useState } from "react";
import { Plus, Minus, ShoppingBag, Leaf, Flame, X } from "lucide-react";

export const Route = createFileRoute("/menu")({
  component: ClientMenu,
  head: () => ({ meta: [{ title: "Menu · Table 7" }] }),
});

type Item = { id: string; name: string; desc: string; price: number; tags?: ("veggie" | "spicy")[]; category: string };

const ITEMS: Item[] = [
  { id: "1", name: "Burrata di Puglia", desc: "Tomates anciennes, basilic, huile d'olive AOP", price: 14, tags: ["veggie"], category: "Entrées" },
  { id: "2", name: "Vitello tonnato", desc: "Veau froid, sauce thon-câpres", price: 16, category: "Entrées" },
  { id: "3", name: "Tagliatelles truffe", desc: "Pâtes fraîches, truffe noire, parmesan 24 mois", price: 22, category: "Plats" },
  { id: "4", name: "Risotto Milanese", desc: "Carnaroli, safran, moelle", price: 19, tags: ["veggie"], category: "Plats" },
  { id: "5", name: "Arrabbiata piccante", desc: "Tomate, ail, piment de Calabre", price: 15, tags: ["spicy", "veggie"], category: "Plats" },
  { id: "6", name: "Tiramisu maison", desc: "Mascarpone, café, cacao", price: 8, category: "Desserts" },
  { id: "7", name: "Panna cotta fruits rouges", desc: "Crème vanille, coulis maison", price: 8, tags: ["veggie"], category: "Desserts" },
];

const CATS = ["Tous", "Entrées", "Plats", "Desserts"];

function ClientMenu() {
  const [cat, setCat] = useState("Tous");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);

  const filtered = cat === "Tous" ? ITEMS : ITEMS.filter((i) => i.category === cat);
  const total = Object.entries(cart).reduce((s, [id, q]) => s + (ITEMS.find((i) => i.id === id)?.price ?? 0) * q, 0);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) => setCart((c) => {
    const n = (c[id] ?? 0) - 1;
    const { [id]: _, ...rest } = c;
    return n <= 0 ? rest : { ...c, [id]: n };
  });

  return (
    <div className="min-h-screen bg-background pb-32">
      <MockupNav />

      {/* Restaurant header */}
      <div className="bg-gradient-warm border-b border-border">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-brand">La Trattoria</p>
              <h1 className="mt-1 font-display text-4xl font-semibold">Table 7</h1>
              <p className="mt-1 text-sm text-muted-foreground">Bonsoir, voici le menu de ce soir 🌙</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground font-display text-2xl text-background">
              T7
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="sticky top-[65px] z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-6 py-3">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                cat === c ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <main className="mx-auto max-w-2xl px-6 py-6">
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold leading-tight">{item.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {item.tags?.includes("veggie") && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                          <Leaf className="h-3 w-3" /> Veggie
                        </span>
                      )}
                      {item.tags?.includes("spicy") && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                          <Flame className="h-3 w-3" /> Piquant
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-display text-lg font-semibold">{item.price}€</span>
                </div>
                <div className="mt-3 flex justify-end">
                  {cart[item.id] ? (
                    <div className="inline-flex items-center gap-3 rounded-full bg-foreground p-1 text-background">
                      <button onClick={() => sub(item.id)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/10"><Minus className="h-4 w-4"/></button>
                      <span className="min-w-4 text-center text-sm font-medium">{cart[item.id]}</span>
                      <button onClick={() => add(item.id)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/10"><Plus className="h-4 w-4"/></button>
                    </div>
                  ) : (
                    <button onClick={() => add(item.id)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-secondary">
                      <Plus className="h-4 w-4" /> Ajouter
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>

      {/* Cart bar */}
      {count > 0 && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-foreground px-5 py-4 text-background shadow-soft"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ShoppingBag className="h-5 w-5" /> {count} article{count > 1 ? "s" : ""}
          </span>
          <span className="font-display text-lg">Voir · {total}€</span>
        </button>
      )}

      {/* Cart sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold">Votre commande</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-secondary"><X className="h-5 w-5"/></button>
            </div>
            <ul className="mt-4 space-y-2">
              {Object.entries(cart).map(([id, q]) => {
                const it = ITEMS.find((i) => i.id === id)!;
                return (
                  <li key={id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm">
                    <span>{q}× {it.name}</span>
                    <span className="font-medium">{it.price * q}€</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-semibold">{total}€</span>
            </div>
            <button className="mt-4 w-full rounded-2xl bg-gradient-brand py-4 font-medium text-brand-foreground shadow-soft">
              Envoyer en cuisine
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Paiement à table en fin de repas</p>
          </div>
        </div>
      )}
    </div>
  );
}
