import { createFileRoute } from "@tanstack/react-router";
import { MockupNav } from "@/components/MockupNav";
import { useState } from "react";
import { Plus, Minus, Leaf, Flame, X, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/menu")({
  component: ClientMenu,
  head: () => ({ meta: [{ title: "Menu · Table 7" }] }),
});

type Item = { id: string; name: string; desc: string; price: number; tags?: ("veggie" | "spicy")[]; category: string };

const ITEMS: Item[] = [
  { id: "1", name: "Burrata di Puglia", desc: "Tomates anciennes, basilic, huile AOP", price: 14, tags: ["veggie"], category: "Entrées" },
  { id: "2", name: "Vitello tonnato", desc: "Veau, sauce thon-câpres", price: 16, category: "Entrées" },
  { id: "3", name: "Tagliatelles truffe", desc: "Pâtes fraîches, truffe noire, parmesan 24 mois", price: 22, category: "Plats" },
  { id: "4", name: "Risotto Milanese", desc: "Carnaroli, safran, moelle", price: 19, tags: ["veggie"], category: "Plats" },
  { id: "5", name: "Arrabbiata piccante", desc: "Tomate, ail, piment de Calabre", price: 15, tags: ["spicy", "veggie"], category: "Plats" },
  { id: "6", name: "Tiramisu maison", desc: "Mascarpone, café, cacao", price: 8, category: "Desserts" },
  { id: "7", name: "Panna cotta", desc: "Crème vanille, coulis fruits rouges", price: 8, tags: ["veggie"], category: "Desserts" },
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
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const { [id]: _, ...rest } = c;
      return n <= 0 ? rest : { ...c, [id]: n };
    });

  return (
    <div className="min-h-screen bg-background pb-32">
      <MockupNav />

      {/* Header */}
      <div className="mx-auto max-w-2xl px-6 pt-10 pb-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Table 7</p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">La Trattoria</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Bonsoir 🌙 — voici la carte de ce soir.</p>
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
          {filtered.map((item) => (
            <li key={item.id} className="flex gap-4 py-5">
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
                  </div>
                  {cart[item.id] ? (
                    <div className="inline-flex items-center gap-3 rounded-full bg-foreground px-1 py-1 text-background">
                      <button onClick={() => sub(item.id)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/10"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="min-w-4 text-center text-[13px] font-medium tabular-nums">{cart[item.id]}</span>
                      <button onClick={() => add(item.id)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/10"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => add(item.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105">
                      <Plus className="h-4 w-4" />
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

      {/* Cart sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-[2rem] bg-card p-6 shadow-pop animate-in slide-in-from-bottom">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold tracking-tight">Votre commande</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <ul className="mt-5 divide-y divide-border">
              {Object.entries(cart).map(([id, q]) => {
                const it = ITEMS.find((i) => i.id === id)!;
                return (
                  <li key={id} className="flex items-center justify-between py-3 text-[14px]">
                    <span><span className="font-medium tabular-nums">{q}× </span>{it.name}</span>
                    <span className="font-medium tabular-nums">{it.price * q}€</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-[14px] text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-semibold tabular-nums">{total}€</span>
            </div>
            <button className="mt-5 w-full rounded-2xl bg-foreground py-4 text-[15px] font-medium text-background">
              Envoyer en cuisine
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Paiement à table en fin de repas</p>
          </div>
        </div>
      )}
    </div>
  );
}
