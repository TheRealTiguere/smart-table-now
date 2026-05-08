import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listOrdersFn, type OrderDTO } from "./orders.functions";
import { useMe } from "./use-me";

export function useOrders(): { data: OrderDTO[]; isLoading: boolean } {
  const fn = useServerFn(listOrdersFn);
  const qc = useQueryClient();
  const { data: me } = useMe();
  const tenantId = me?.tenantId ?? null;

  const q = useQuery({
    queryKey: ["orders", tenantId],
    queryFn: async () => {
      try {
        return await fn();
      } catch (e) {
        // Session expirée / déconnecté pendant la transition : on renvoie vide
        // au lieu de faire planter la route avec un errorComponent.
        if ((e as Error)?.message === "Non authentifié") return [] as OrderDTO[];
        throw e;
      }
    },
    enabled: !!tenantId,
    retry: false,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase
      .channel(`orders-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${tenantId}` }, () => {
        qc.invalidateQueries({ queryKey: ["orders", tenantId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        qc.invalidateQueries({ queryKey: ["orders", tenantId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tenantId, qc]);

  return { data: q.data ?? [], isLoading: q.isLoading };
}

export function tableStatus(orders: OrderDTO[], table: string): "free" | "occupied" | "cooking" | "ready" {
  const active = orders.filter((o) => o.table === table && o.status !== "served");
  if (active.length === 0) return "free";
  if (active.some((o) => o.status === "ready")) return "ready";
  if (active.some((o) => o.status === "cooking")) return "cooking";
  return "occupied";
}

export function tableTotal(orders: OrderDTO[], table: string): number {
  return orders.filter((o) => o.table === table && o.status !== "served").reduce((s, o) => s + o.total, 0);
}

export function elapsedMinutesLabel(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60_000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h${String(m % 60).padStart(2, "0")}` : `${m} min`;
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
