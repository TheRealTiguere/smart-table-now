import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUser } from "./auth.functions";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const resolveTenantFn = createServerFn({ method: "GET" })
  .inputValidator((input: { slug?: string }) => input ?? {})
  .handler(async ({ data }) => {
    const q = supabaseAdmin
      .from("tenants")
      .select("id, slug, name, timezone")
      .eq("active", true);
    const { data: rows, error } = data?.slug
      ? await q.eq("slug", data.slug).limit(1)
      : await q.order("created_at", { ascending: true }).limit(1);
    if (error) throw new Error(error.message);
    return rows?.[0] ?? null;
  });

export const listTenantsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireUser("super_admin");
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, timezone, active, source_url, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  // Count admins per tenant
  const { data: users } = await supabaseAdmin
    .from("app_users")
    .select("tenant_id, username")
    .eq("role", "restaurant_admin");
  const byTenant = new Map<string, string[]>();
  (users ?? []).forEach((u) => {
    if (!u.tenant_id) return;
    const arr = byTenant.get(u.tenant_id) ?? [];
    arr.push(u.username);
    byTenant.set(u.tenant_id, arr);
  });

  return (data ?? []).map((t) => ({ ...t, admins: byTenant.get(t.id) ?? [] }));
});

const createTenantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  timezone: z.string().min(1).max(80).default("Europe/Paris"),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  adminUsername: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
  adminPassword: z.string().min(8).max(200),
});

export const createTenantFn = createServerFn({ method: "POST" })
  .inputValidator((input) => createTenantSchema.parse(input))
  .handler(async ({ data }) => {
    await requireUser("super_admin");

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: data.name,
        slug: data.slug,
        timezone: data.timezone,
        source_url: data.sourceUrl || null,
      })
      .select()
      .single();
    if (tErr) throw new Error(`Slug déjà utilisé : ${tErr.message}`);

    const hash = await bcrypt.hash(data.adminPassword, 10);
    const { error: uErr } = await supabaseAdmin.from("app_users").insert({
      username: data.adminUsername,
      password_hash: hash,
      role: "restaurant_admin",
      tenant_id: tenant.id,
    });
    if (uErr) {
      await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Username déjà pris : ${uErr.message}`);
    }
    return { ok: true, id: tenant.id };
  });

export const toggleTenantFn = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data }) => {
    await requireUser("super_admin");
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTenantFn = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await requireUser("super_admin");
    // Cascade delete app data for this tenant
    await supabaseAdmin.from("app_users").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("dishes").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("formulas").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("categories").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("tables_layout").delete().eq("tenant_id", data.id);
    await supabaseAdmin.from("orders").delete().eq("tenant_id", data.id);
    const { error } = await supabaseAdmin.from("tenants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
