import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUser } from "./auth.functions";
import bcrypt from "bcryptjs";
import { z } from "zod";

export type TenantRole = "restaurant_admin" | "kitchen";

export const listTenantUsersFn = createServerFn({ method: "GET" }).handler(async () => {
  const me = await requireUser();
  if (!me.tenantId) throw new Error("Aucun restaurant associé");
  const { data, error } = await supabaseAdmin
    .from("app_users")
    .select("id, username, role, active, created_at, last_login_at")
    .eq("tenant_id", me.tenantId)
    .in("role", ["restaurant_admin", "kitchen"])
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

const createSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(6).max(200),
  role: z.enum(["restaurant_admin", "kitchen"]),
});

export const createTenantUserFn = createServerFn({ method: "POST" })
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (me.role !== "restaurant_admin" && me.role !== "super_admin") {
      throw new Error("Accès refusé");
    }
    if (!me.tenantId) throw new Error("Aucun restaurant associé");
    const hash = await bcrypt.hash(data.password, 10);
    const { error } = await supabaseAdmin.from("app_users").insert({
      username: data.username,
      password_hash: hash,
      role: data.role,
      tenant_id: me.tenantId,
    });
    if (error) throw new Error(`Identifiant déjà pris : ${error.message}`);
    return { ok: true };
  });

export const toggleTenantUserFn = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!me.tenantId) throw new Error("Aucun restaurant associé");
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ active: data.active })
      .eq("id", data.id)
      .eq("tenant_id", me.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTenantUserFn = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!me.tenantId) throw new Error("Aucun restaurant associé");
    if (data.id === me.id) throw new Error("Impossible de supprimer son propre compte");
    await supabaseAdmin.from("sessions").delete().eq("user_id", data.id);
    const { error } = await supabaseAdmin
      .from("app_users")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", me.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const pwdSchema = z.object({ id: z.string().uuid(), password: z.string().min(6).max(200) });

export const resetTenantUserPasswordFn = createServerFn({ method: "POST" })
  .inputValidator((input) => pwdSchema.parse(input))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (!me.tenantId) throw new Error("Aucun restaurant associé");
    const hash = await bcrypt.hash(data.password, 10);
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({ password_hash: hash })
      .eq("id", data.id)
      .eq("tenant_id", me.tenantId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("sessions").delete().eq("user_id", data.id);
    return { ok: true };
  });
