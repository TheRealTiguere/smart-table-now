import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUser } from "./auth.functions";

export type OrderStatus = "new" | "cooking" | "ready" | "served";

export type OrderItemDTO = {
  id: string;
  name: string;
  qty: number;
  price: number;
  done: boolean;
  note?: string | null;
  kind: string;
  refId?: string | null;
};

export type OrderDTO = {
  id: string;
  table: string;
  status: OrderStatus;
  createdAt: number;
  servedAt: number | null;
  paidAt: number | null;
  paid: boolean;
  total: number;
  paymentMethod: string | null;
  customerEmail: string | null;
  receiptNumber: string | null;
  items: OrderItemDTO[];
};

const NEXT: Record<OrderStatus, OrderStatus> = {
  new: "cooking",
  cooking: "ready",
  ready: "served",
  served: "served",
};

function toDTO(o: any, items: any[]): OrderDTO {
  const own = items.filter((i) => i.order_id === o.id);
  const total = Number(o.total) || own.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  return {
    id: o.id,
    table: o.table_name,
    status: o.status as OrderStatus,
    createdAt: new Date(o.created_at).getTime(),
    servedAt: o.served_at ? new Date(o.served_at).getTime() : null,
    paidAt: o.paid_at ? new Date(o.paid_at).getTime() : null,
    paid: !!o.paid,
    total,
    paymentMethod: o.payment_method ?? null,
    customerEmail: o.customer_email ?? null,
    receiptNumber: o.receipt_number ?? null,
    items: own
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: Number(i.price),
        done: !!i.done,
        note: i.note,
        kind: i.kind,
        refId: i.ref_id,
      })),
  };
}

async function fetchTenantOrders(tenantId: string): Promise<OrderDTO[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!orders || orders.length === 0) return [];
  const ids = orders.map((o) => o.id);
  const { data: items, error: iErr } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .in("order_id", ids);
  if (iErr) throw new Error(iErr.message);
  return orders.map((o) => toDTO(o, items ?? []));
}

export const listOrdersFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireUser();
  if (!me.tenantId) return [];
  return fetchTenantOrders(me.tenantId);
});

export const listAllOrdersForRangeFn = createServerFn({ method: "GET" })
  .inputValidator((input: { sinceMs: number }) => input)
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!me.tenantId) return [];
    const sinceIso = new Date(data.sinceMs).toISOString();
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("tenant_id", me.tenantId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!orders || orders.length === 0) return [];
    const ids = orders.map((o) => o.id);
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .in("order_id", ids);
    return orders.map((o) => toDTO(o, items ?? []));
  });

const createSchema = z.object({
  tenantSlug: z.string().min(1).max(60),
  table: z.string().min(1).max(40),
  customerEmail: z.string().email().max(200).optional().nullable(),
  items: z
    .array(
      z.object({
        kind: z.enum(["dish", "formula"]),
        refId: z.string().min(1).max(100),
        name: z.string().min(1).max(200),
        price: z.number().min(0).max(100000),
        qty: z.number().int().min(1).max(99),
        note: z.string().max(500).optional().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

export const createOrderFn = createServerFn({ method: "POST" })
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", data.tenantSlug)
      .eq("active", true)
      .maybeSingle();
    if (!tenant) throw new Error("Restaurant introuvable");
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        tenant_id: tenant.id,
        table_name: data.table,
        status: "new",
        total,
        customer_email: data.customerEmail || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { error: iErr } = await supabaseAdmin.from("order_items").insert(
      data.items.map((it, idx) => ({
        order_id: order.id,
        name: it.name,
        price: it.price,
        qty: it.qty,
        kind: it.kind,
        ref_id: it.refId,
        note: it.note ?? null,
        sort_order: idx,
      })),
    );
    if (iErr) throw new Error(iErr.message);
    return { id: order.id };
  });

const idSchema = z.object({ id: z.string().uuid() });

export const advanceOrderFn = createServerFn({ method: "POST" })
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("status, served_at, tenant_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (me.tenantId && order.tenant_id !== me.tenantId) throw new Error("Refusé");
    const next = NEXT[order.status as OrderStatus];
    const patch: Record<string, unknown> = { status: next };
    if (next === "served" && !order.served_at) patch.served_at = new Date().toISOString();
    const { error: uErr } = await supabaseAdmin.from("orders").update(patch as any).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

export const recallOrderFn = createServerFn({ method: "POST" })
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("status, paid, tenant_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (me.tenantId && order.tenant_id !== me.tenantId) throw new Error("Refusé");
    if (order.paid) throw new Error("Commande déjà encaissée");
    const prev: OrderStatus =
      order.status === "served" ? "ready" : order.status === "ready" ? "cooking" : order.status === "cooking" ? "new" : (order.status as OrderStatus);
    const patch: Record<string, unknown> = { status: prev };
    if (order.status === "served") patch.served_at = null;
    const { error: uErr } = await supabaseAdmin.from("orders").update(patch as any).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    await supabaseAdmin.from("order_items").update({ done: false }).eq("order_id", data.id);
    return { ok: true };
  });

export const toggleItemDoneFn = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ itemId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await requireUser();
    const { data: it, error } = await supabaseAdmin
      .from("order_items")
      .select("id, done")
      .eq("id", data.itemId)
      .single();
    if (error) throw new Error(error.message);
    const { error: uErr } = await supabaseAdmin
      .from("order_items")
      .update({ done: !it.done })
      .eq("id", data.itemId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

export const validatePartialFn = createServerFn({ method: "POST" })
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.id)
      .single();
    if (!order) throw new Error("Commande introuvable");
    if (me.tenantId && order.tenant_id !== me.tenantId) throw new Error("Refusé");
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", data.id);
    if (!items) throw new Error("Pas d'articles");
    const done = items.filter((i) => i.done);
    const remaining = items.filter((i) => !i.done);
    if (done.length === 0 || remaining.length === 0)
      throw new Error("Rien à séparer");
    const servedTotal = done.reduce((s, i) => s + Number(i.price) * i.qty, 0);
    const remainingTotal = remaining.reduce((s, i) => s + Number(i.price) * i.qty, 0);
    // Create the served order (split out)
    const { data: servedOrder, error: sErr } = await supabaseAdmin
      .from("orders")
      .insert({
        tenant_id: order.tenant_id,
        table_name: order.table_name,
        status: "served",
        total: servedTotal,
        served_at: new Date().toISOString(),
        customer_email: order.customer_email,
      })
      .select()
      .single();
    if (sErr) throw new Error(sErr.message);
    // Move done items to served order, reset done
    await supabaseAdmin
      .from("order_items")
      .update({ order_id: servedOrder.id, done: false })
      .in(
        "id",
        done.map((d) => d.id),
      );
    // Update remaining order total
    await supabaseAdmin.from("orders").update({ total: remainingTotal }).eq("id", data.id);
    return { ok: true };
  });

const paySchema = z.object({
  id: z.string().uuid(),
  method: z.enum(["cash", "card", "other"]).optional(),
  receiptNumber: z.string().max(80).optional(),
});

export const markPaidFn = createServerFn({ method: "POST" })
  .inputValidator((input) => paySchema.parse(input))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("tenant_id, served_at, paid_at")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (me.tenantId && order.tenant_id !== me.tenantId) throw new Error("Refusé");
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      paid: true,
      status: "served",
      paid_at: order.paid_at ?? now,
      served_at: order.served_at ?? now,
      payment_method: data.method ?? "card",
    };
    if (data.receiptNumber) patch.receipt_number = data.receiptNumber;
    const { error: uErr } = await supabaseAdmin.from("orders").update(patch as any).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true };
  });

export const setOrderEmailFn = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), email: z.string().email().max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const me = await requireUser();
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("tenant_id")
      .eq("id", data.id)
      .single();
    if (!order || (me.tenantId && order.tenant_id !== me.tenantId)) throw new Error("Refusé");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ customer_email: data.email })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearArchivedFn = createServerFn({ method: "POST" }).handler(async () => {
  const me = await requireUser();
  if (!me.tenantId) return { ok: true };
  // Delete paid+served orders for this tenant
  const { data: ids } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("tenant_id", me.tenantId)
    .eq("status", "served");
  const idList = (ids ?? []).map((r) => r.id);
  if (idList.length > 0) {
    await supabaseAdmin.from("order_items").delete().in("order_id", idList);
    await supabaseAdmin.from("orders").delete().in("id", idList);
  }
  return { ok: true };
});

export const listOrdersForTableFn = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ tenantSlug: z.string().min(1), table: z.string().min(1).max(40) }).parse(input))
  .handler(async ({ data }) => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", data.tenantSlug)
      .maybeSingle();
    if (!tenant) return [];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("table_name", data.table)
      .neq("status", "served")
      .gte("created_at", since);
    if (!orders || orders.length === 0) return [];
    const ids = orders.map((o) => o.id);
    const { data: items } = await supabaseAdmin.from("order_items").select("*").in("order_id", ids);
    return orders.map((o) => toDTO(o, items ?? []));
  });
