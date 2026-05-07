import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OrderStatus = "new" | "cooking" | "ready" | "served";

export type OrderItem = { id: string; name: string; price: number; qty: number; note?: string; done?: boolean };

export type Order = {
  id: string;
  table: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;
  total: number;
  paid?: boolean;
  paidAt?: number;
  paymentMethod?: "cash" | "card" | "other";
  customerEmail?: string;
  receiptNumber?: string;
};

export type TableStatus = "free" | "occupied" | "cooking" | "ready";

type State = {
  orders: Order[];
  archived: Order[];
  currentTable: string;
  addOrder: (o: Omit<Order, "id" | "createdAt" | "status" | "total"> & { status?: OrderStatus; customerEmail?: string }) => string;
  advanceOrder: (id: string) => void;
  recallOrder: (id: string) => void;
  toggleItemDone: (orderId: string, itemIndex: number) => void;
  validatePartial: (orderId: string) => void;
  markPaid: (id: string, payment?: { method?: "cash" | "card" | "other"; receiptNumber?: string }) => void;
  setOrderEmail: (id: string, email: string) => void;
  setCurrentTable: (t: string) => void;
  reset: () => void;
  clearHistory: () => void;
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
      archived: [],
      currentTable: "T7",
      addOrder: (o) => {
        const id = String(Math.floor(Math.random() * 900) + 100);
        const total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
        set((st) => ({
          orders: [
            ...st.orders,
            { id, table: o.table, items: o.items, status: o.status ?? "new", createdAt: Date.now(), total, customerEmail: o.customerEmail },
          ],
        }));
        return id;
      },
      advanceOrder: (id) =>
        set((st) => {
          const order = st.orders.find((o) => o.id === id);
          if (!order) return {};
          const nextStatus = NEXT[order.status];
          const updated = { ...order, status: nextStatus };
          // When the order reaches "served", archive it (keep in orders too until paid? No, remove)
          if (nextStatus === "served") {
            return {
              orders: st.orders.filter((o) => o.id !== id),
              archived: [...st.archived, updated],
            };
          }
          return { orders: st.orders.map((o) => (o.id === id ? updated : o)) };
        }),
      recallOrder: (id) =>
        set((st) => {
          // Find in archived first
          const archivedOrder = st.archived.find((o) => o.id === id);
          if (archivedOrder) {
            const restored = { ...archivedOrder, status: "ready" as OrderStatus, items: archivedOrder.items.map((it) => ({ ...it, done: false })) };
            return {
              archived: st.archived.filter((o) => o.id !== id),
              orders: [...st.orders, restored],
            };
          }
          // Otherwise step back from ready -> cooking, cooking -> new
          return {
            orders: st.orders.map((o) => {
              if (o.id !== id) return o;
              const prev: OrderStatus = o.status === "ready" ? "cooking" : o.status === "cooking" ? "new" : o.status;
              return { ...o, status: prev, items: o.items.map((it) => ({ ...it, done: false })) };
            }),
          };
        }),
      toggleItemDone: (orderId, itemIndex) =>
        set((st) => ({
          orders: st.orders.map((o) =>
            o.id !== orderId
              ? o
              : { ...o, items: o.items.map((it, i) => (i === itemIndex ? { ...it, done: !it.done } : it)) },
          ),
        })),
      validatePartial: (orderId) =>
        set((st) => {
          const order = st.orders.find((o) => o.id === orderId);
          if (!order) return {};
          const remaining = order.items.filter((it) => !it.done);
          const doneItems = order.items.filter((it) => it.done);
          if (doneItems.length === 0 || remaining.length === 0) return {};
          const newId = String(Math.floor(Math.random() * 900) + 100);
          const servedTotal = doneItems.reduce((s, i) => s + i.price * i.qty, 0);
          const remainingTotal = remaining.reduce((s, i) => s + i.price * i.qty, 0);
          const servedOrder: Order = {
            ...order,
            id: newId,
            status: "served",
            items: doneItems.map((it) => ({ ...it, done: false })),
            total: servedTotal,
          };
          const remainingOrder: Order = {
            ...order,
            items: remaining.map((it) => ({ ...it, done: false })),
            total: remainingTotal,
          };
          return {
            orders: st.orders.map((o) => (o.id === orderId ? remainingOrder : o)),
            archived: [...st.archived, servedOrder],
          };
        }),
      markPaid: (id, payment) =>
        set((st) => {
          const apply = (o: Order) =>
            o.id === id
              ? {
                  ...o,
                  paid: true,
                  paidAt: o.paidAt ?? Date.now(),
                  paymentMethod: payment?.method ?? o.paymentMethod ?? "card",
                  receiptNumber: payment?.receiptNumber ?? o.receiptNumber,
                }
              : o;
          return {
            orders: st.orders.map(apply),
            archived: st.archived.map(apply),
          };
        }),
      setOrderEmail: (id, email) =>
        set((st) => {
          const apply = (o: Order) => (o.id === id ? { ...o, customerEmail: email } : o);
          return {
            orders: st.orders.map(apply),
            archived: st.archived.map(apply),
          };
        }),
      setCurrentTable: (t) => set({ currentTable: t }),
      reset: () => set((st) => ({ orders: seed(), archived: st.archived })),
      clearHistory: () => set({ archived: [] }),
    }),
    {
      name: "tabli-store",
      storage: typeof window !== "undefined"
        ? createJSONStorage(() => localStorage)
        : undefined,
      skipHydration: true,
    },
  ),
);

import { useEffect, useState } from "react";

export function useHydratedStore<T>(selector: (s: State) => T): T | undefined {
  const value = useStore(selector);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    useStore.persist.rehydrate();
    setHydrated(true);
  }, []);
  return hydrated ? value : undefined;
}


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
