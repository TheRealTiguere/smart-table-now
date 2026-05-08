import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Leaf, Flame, X, ChevronUp, Check, Image as ImageIcon, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { resolveTenantFn } from "@/lib/tenants.functions";
import { createOrderFn, listOrdersForTableFn } from "@/lib/orders.functions";
import { useConfig, useConfigHydrated, ALLERGEN_LABELS, isFormulaActiveNow } from "@/lib/config-store";
import { useMounted } from "@/lib/use-mounted";
import { toast } from "sonner";

export const Route = createFileRoute("/menu")({
  component: ClientMenu,
  head: () => ({ meta: [{ title: "Menu · Table" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    table: (s.table as string) || undefined,
    r: (s.r as string) || undefined,
    k: (s.k as string) || undefined,
  }),
});

type CartLine = { kind: "dish" | "formula"; id: string; qty: number };

function ClientMenu() {
  const mounted = useMounted();
  const cfgReady = useConfigHydrated();
  const search = Route.useSearch();
  const resolveTenant = useServerFn(resolveTenantFn);
  const createOrder = useServerFn(createOrderFn);
  const listForTable = useServerFn(listOrdersForTableFn);

  const { restaurantName, logo, categories, dishes, formulas, timezone } = useConfig();
  const table = search.table || "T1";

  const tenantQ = useQuery({
    queryKey: ["resolve-tenant", search.r ?? null],
    queryFn: () => resolveTenant({ data: search.r ? { slug: search.r } : {} }),
    staleTime: 5 * 60_000,
  });
  const tenantSlug = tenantQ.data?.slug ?? null;

  const ordersQ = useQuery({
    queryKey: ["table-orders", tenantSlug, table],
    queryFn: () => listForTable({ data: { tenantSlug: tenantSlug!, table } }),
    enabled: !!tenantSlug,
    refetchInterval: 15_000,
  });
  const myOrders = ordersQ.data ?? [];


  // Tick every minute so schedule-restricted formulas appear/disappear in real time
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const sortedCats = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);
  const availableFormulas = useMemo(
    () => formulas.filter((f) => isFormulaActiveNow(f, timezone)),
    [formulas, timezone],
  );
  const TABS = useMemo(
    () => [
      "Tous",
      ...(availableFormulas.length > 0 ? ["Formules"] : []),
      ...sortedCats.map((c) => c.name),
    ],
    [sortedCats, availableFormulas.length],
  );

  const [tab, setTab] = useState("Tous");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState<string | null>(null); // dish id
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    if (!TABS.includes(tab)) setTab("Tous");
  }, [TABS, tab]);

  const addLine = (kind: CartLine["kind"], id: string) => {
    if (kind === "dish") {
      const d = dishes.find((x) => x.id === id);
      if (!d || !d.available) return toast.error("Indisponible");
    } else {
      const f = formulas.find((x) => x.id === id);
      if (!f || !f.available) return toast.error("Indisponible");
    }
    setCart((c) => {
      const i = c.findIndex((l) => l.kind === kind && l.id === id);
      if (i >= 0) {
        const next = [...c];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...c, { kind, id, qty: 1 }];
    });
  };

  const subLine = (kind: CartLine["kind"], id: string) => {
    setCart((c) =>
      c
        .map((l) => (l.kind === kind && l.id === id ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0),
    );
  };

  const lineQty = (kind: CartLine["kind"], id: string) =>
    cart.find((l) => l.kind === kind && l.id === id)?.qty ?? 0;

  const linePrice = (l: CartLine) => {
    if (l.kind === "dish") return dishes.find((d) => d.id === l.id)?.price ?? 0;
    return formulas.find((f) => f.id === l.id)?.price ?? 0;
  };
  const lineName = (l: CartLine) => {
    if (l.kind === "dish") return dishes.find((d) => d.id === l.id)?.name ?? "";
    return formulas.find((f) => f.id === l.id)?.name ?? "";
  };

  const total = useMemo(() => cart.reduce((s, l) => s + linePrice(l) * l.qty, 0), [cart, dishes, formulas]);
  const count = cart.reduce((a, b) => a + b.qty, 0);

  const send = async () => {
    if (count === 0) return;
    if (!tenantSlug) return toast.error("Restaurant introuvable");
    const items = cart.map((l) => ({
      kind: l.kind,
      refId: l.id,
      name: l.kind === "formula" ? `Formule · ${lineName(l)}` : lineName(l),
      price: linePrice(l),
      qty: l.qty,
    }));
    const email = customerEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error("Email invalide");
    }
    try {
      await createOrder({ data: { tenantSlug, table, customerEmail: email || null, items } });
      setCart([]);
      setOpen(false);
      setSent(true);
      ordersQ.refetch();
      toast.success("Commande envoyée en cuisine", {
        description: `Table ${table.replace("T", "")} · ${total}€`,
      });
      setTimeout(() => setSent(false), 2500);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!mounted || !cfgReady) {
    return <div className="min-h-screen bg-background pb-32" />;
  }

  const showFormulas = (tab === "Tous" || tab === "Formules") && availableFormulas.length > 0;
  const visibleCats = tab === "Tous" || tab === "Formules" ? sortedCats : sortedCats.filter((c) => c.name === tab);

  const infoDish = info ? dishes.find((d) => d.id === info) ?? null : null;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Brand bar */}
      <div className="border-b border-border/60">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt="" className="h-7 w-7 rounded-[6px] object-cover" />
            ) : (
              <div className="h-6 w-6 rounded-[6px] bg-foreground" />
            )}
            <span className="font-display text-[15px] font-semibold tracking-tight">{restaurantName}</span>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Table {table.replace("T", "")}</span>
        </div>
      </div>

      {/* Header */}
      <div className="mx-auto max-w-2xl px-6 pt-10 pb-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-primary">Bienvenue</p>
        <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">La carte</h1>
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

      {/* Tabs */}
      <div className="sticky top-0 z-30 glass border-b border-border/60">
        <div className="mx-auto flex max-w-2xl gap-1.5 overflow-x-auto px-6 py-3">
          {TABS.map((c) => (
            <button
              key={c}
              onClick={() => setTab(c)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                tab === c ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-6 py-6 space-y-10">
        {/* Formulas */}
        {showFormulas && (
          <section>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Formules</h2>
            <ul className="mt-3 space-y-3">
              {availableFormulas.map((f) => {
                const q = lineQty("formula", f.id);
                const items = f.dishIds.map((id) => dishes.find((d) => d.id === id)?.name).filter(Boolean) as string[];
                return (
                  <li key={f.id} className="rounded-2xl bg-surface p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-[17px] font-semibold tracking-tight">{f.name}</h3>
                      <span className="text-[15px] font-medium tabular-nums">{f.price}€</span>
                    </div>
                    {f.desc && <p className="mt-1 text-[13px] text-muted-foreground">{f.desc}</p>}
                    {items.length > 0 && (
                      <p className="mt-2 text-[12px] text-muted-foreground">{items.join(" · ")}</p>
                    )}
                    <div className="mt-3 flex justify-end">
                      {q > 0 ? (
                        <Stepper
                          value={q}
                          onAdd={() => addLine("formula", f.id)}
                          onSub={() => subLine("formula", f.id)}
                        />
                      ) : (
                        <button
                          onClick={() => addLine("formula", f.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Categories */}
        {tab !== "Formules" &&
          visibleCats.map((cat) => {
            const list = dishes.filter((d) => d.categoryId === cat.id);
            if (list.length === 0) return null;
            return (
              <section key={cat.id}>
                <h2 className="font-display text-2xl font-semibold tracking-tight">{cat.name}</h2>
                <ul className="mt-2 divide-y divide-border">
                  {list.map((item) => {
                    const unavailable = !item.available;
                    const q = lineQty("dish", item.id);
                    const allAllergens = [
                      ...item.allergens.map((a) => ALLERGEN_LABELS[a]),
                      ...item.customAllergens,
                    ];
                    return (
                      <li key={item.id} className={`flex gap-4 py-5 ${unavailable ? "opacity-50" : ""}`}>
                        {item.photo !== undefined && (
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface">
                            {item.photo ? (
                              <img src={item.photo} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <h3 className="font-display text-[18px] font-semibold tracking-tight">{item.name}</h3>
                            <span className="text-[15px] font-medium tabular-nums text-muted-foreground">{item.price}€</span>
                          </div>
                          {item.desc && <p className="mt-1 text-[14px] text-muted-foreground">{item.desc}</p>}
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {item.tags.includes("veggie") && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                                  <Leaf className="h-3 w-3" /> Veggie
                                </span>
                              )}
                              {item.tags.includes("spicy") && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-destructive">
                                  <Flame className="h-3 w-3" /> Piquant
                                </span>
                              )}
                              {allAllergens.length > 0 && (
                                <button
                                  onClick={() => setInfo(item.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-secondary/80"
                                >
                                  <Info className="h-3 w-3" /> Allergènes
                                </button>
                              )}
                              {unavailable && (
                                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">Épuisé</span>
                              )}
                            </div>
                            {q > 0 ? (
                              <Stepper
                                value={q}
                                onAdd={() => addLine("dish", item.id)}
                                onSub={() => subLine("dish", item.id)}
                              />
                            ) : (
                              <button
                                onClick={() => addLine("dish", item.id)}
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
              </section>
            );
          })}
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
              {cart.map((l) => (
                <li key={`${l.kind}-${l.id}`} className="flex items-center justify-between py-3 text-[14px]">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-1 py-1">
                      <button onClick={() => subLine(l.kind, l.id)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-background"><Minus className="h-3 w-3" /></button>
                      <span className="min-w-3 text-center text-[12px] font-medium tabular-nums">{l.qty}</span>
                      <button onClick={() => addLine(l.kind, l.id)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-background"><Plus className="h-3 w-3" /></button>
                    </div>
                    <span>{l.kind === "formula" ? `Formule · ${lineName(l)}` : lineName(l)}</span>
                  </div>
                  <span className="font-medium tabular-nums">{linePrice(l) * l.qty}€</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-[14px] text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-semibold tabular-nums">{total}€</span>
            </div>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Email pour recevoir la note (facultatif)"
              className="mt-4 w-full rounded-xl bg-surface px-4 py-2.5 text-[13px] outline-none ring-1 ring-inset ring-border focus:ring-foreground"
            />
            <button onClick={send} className="mt-3 w-full rounded-2xl bg-foreground py-4 text-[15px] font-medium text-background transition-opacity hover:opacity-90">
              Envoyer en cuisine
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Paiement à table en fin de repas</p>
          </div>
        </div>
      )}

      {/* Allergens sheet */}
      {infoDish && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center" onClick={() => setInfo(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-[2rem] bg-card p-6 shadow-pop sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold tracking-tight">{infoDish.name}</h3>
              <button onClick={() => setInfo(null)} className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Allergènes</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {infoDish.allergens.map((a) => (
                <span key={a} className="rounded-full bg-secondary px-2.5 py-1 text-[12px]">{ALLERGEN_LABELS[a]}</span>
              ))}
              {infoDish.customAllergens.map((a) => (
                <span key={a} className="rounded-full bg-secondary px-2.5 py-1 text-[12px]">{a}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ value, onAdd, onSub }: { value: number; onAdd: () => void; onSub: () => void }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-foreground px-1 py-1 text-background">
      <button onClick={onSub} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/10">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-4 text-center text-[13px] font-medium tabular-nums">{value}</span>
      <button onClick={onAdd} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/10">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
