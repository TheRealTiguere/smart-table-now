import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUser } from "./auth.functions";
import { z } from "zod";

export type TenantSettings = {
  id: string;
  name: string;
  address: string | null;
  siret: string | null;
  tva_number: string | null;
  tva_rate: number;
  phone: string | null;
  email: string | null;
  receipt_footer: string | null;
};

export const getTenantSettingsFn = createServerFn({ method: "GET" }).handler(async (): Promise<TenantSettings> => {
  const me = await requireUser();
  if (!me.tenantId) throw new Error("Aucun restaurant associé");
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, address, siret, tva_number, tva_rate, phone, email, receipt_footer")
    .eq("id", me.tenantId)
    .single();
  if (error) throw new Error(error.message);
  return data as TenantSettings;
});

const updateSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(400).optional().nullable(),
  siret: z.string().max(40).optional().nullable(),
  tva_number: z.string().max(40).optional().nullable(),
  tva_rate: z.number().min(0).max(100),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  receipt_footer: z.string().max(400).optional().nullable(),
});

export const updateTenantSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((input) => updateSchema.parse(input))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (me.role !== "restaurant_admin" && me.role !== "super_admin") throw new Error("Accès refusé");
    if (!me.tenantId) throw new Error("Aucun restaurant associé");
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({
        name: data.name,
        address: data.address || null,
        siret: data.siret || null,
        tva_number: data.tva_number || null,
        tva_rate: data.tva_rate,
        phone: data.phone || null,
        email: data.email || null,
        receipt_footer: data.receipt_footer || null,
      })
      .eq("id", me.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const nextReceiptNumberFn = createServerFn({ method: "POST" }).handler(async () => {
  const me = await requireUser();
  if (!me.tenantId) throw new Error("Aucun restaurant associé");
  const { data, error } = await supabaseAdmin.rpc("next_receipt_number", { p_tenant: me.tenantId });
  if (error) throw new Error(error.message);
  return { number: data as string };
});
