import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrderStatus = "new" | "cooking" | "ready" | "served";

export type OrderItem = { id: string; name: string; price: number; qty: number; note?: string };

export type Order = {
  id: string;
  table: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;
  total: number;
  paid?: boolean;
};

export type TableStatus = "free" | "occupied" | "cooking" | "ready";

type State = {
  orders: Order[];
  currentTable: string;
  addOrder: (o: Omit<Order, "id" | "createdAt" | "status" | "total"> & { status?: OrderStatus }) => string;
  advanceOrder: (id: string) => void;
  markPaid: (id: string) => void;
  setCurrentTable: (t: string) => void;
  reset: () => void;
};

const NEXT: Record<OrderStatus, OrderStatus> = {
  new: "cooking",
  cooking: "ready",
  ready: "served",
  served: "served",
};

const seed = (): Order[] => {
  const now = Date.now();
  return [
    {
      id: "140",
      table: "T12",
      items: [
        { id: "3", name: "Tagliatelles truffe", price: 22, qty: 4 },
        { id: "2", name: "Vitello tonnato", price: 16, qty: 4 },
      ],
      status: "cooking",
      createdAt: now - 5 * 60_000,
      total: 22 * 4 + 16 * 4,
    },
    {
      id: "141",
      table: "T3",
      items: [
        { id: "4", name: "Risotto Milanese", price: 19, qty: 1 },
        { id: "5", name: "Arrabbiata piccante", price: 15, qty: 1, note: "extra piment" },
      ],
      status: "new",
      createdAt: now - 2 * 60_000,
      total: 19 + 15,
    },
    {
      id: "138",
      table: "T9",
      items: [{ id: "6", name: "Tiramisu maison", price: 8, qty: 3 }],
      status: "ready",
      createdAt: now - 12 * 60_000,
      total: 24,
    },
  ];
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      orders: seed(),
      currentTable: "T7",
      addOrder: (o) => {
        const id = String(Math.floor(Math.random() * 900) + 100);
        const total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
        set((st) => ({
          orders: [
            ...st.orders,
            { id, table: o.table, items: o.items, status: o.status ?? "new", createdAt: Date.now(), total },
          ],
        }));
        return id;
      },
      advanceOrder: (id) =>
        set((st) => ({
          orders: st.orders.map((o) => (o.id === id ? { ...o, status: NEXT[o.status] } : o)),
        })),
      markPaid: (id) =>
        set((st) => ({ orders: st.orders.map((o) => (o.id === id ? { ...o, paid: true } : o)) })),
      setCurrentTable: (t) => set({ currentTable: t }),
      reset: () => set({ orders: seed() }),
    }),
    { name: "tabli-store" },
  ),
);

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 30) return "à l'instant";
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h}h`;
}

export function tableStatus(orders: Order[], table: string): TableStatus {
  const active = orders.filter((o) => o.table === table && o.status !== "served");
  if (active.length === 0) return "free";
  if (active.some((o) => o.status === "ready")) return "ready";
  if (active.some((o) => o.status === "cooking")) return "cooking";
  return "occupied";
}

export function tableTotal(orders: Order[], table: string): number {
  return orders
    .filter((o) => o.table === table && o.status !== "served")
    .reduce((s, o) => s + o.total, 0);
}
