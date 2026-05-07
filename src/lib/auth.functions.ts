import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const SESSION_COOKIE = "tabli_session";
const SESSION_DAYS = 30;

function randomToken(): string {
  // Server-side only — uses Web Crypto
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type CurrentUser = {
  id: string;
  username: string;
  role: "super_admin" | "restaurant_admin";
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  email: string | null;
};

/**
 * Detects whether the system has been bootstrapped (a super-admin exists).
 * Used by /setup to know if it should show the wizard.
 */
export const setupStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { count, error } = await supabaseAdmin
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin");
  if (error) throw new Error(error.message);
  return { needsSetup: (count ?? 0) === 0 };
});

const setupSchema = z.object({
  superAdminUsername: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
  superAdminPassword: z.string().min(8).max(200),
  superAdminEmail: z.string().email().optional().or(z.literal("")),
  restaurantName: z.string().min(1).max(120),
  restaurantSlug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  restaurantTimezone: z.string().min(1).max(80),
  restaurantAdminUsername: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
  restaurantAdminPassword: z.string().min(8).max(200),
});

/**
 * Initial setup: creates the first super-admin, the first tenant, and the first restaurant admin.
 * Refuses to run if a super-admin already exists.
 */
export const initialSetupFn = createServerFn({ method: "POST" })
  .inputValidator((input) => setupSchema.parse(input))
  .handler(async ({ data }) => {
    const { count } = await supabaseAdmin
      .from("app_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) > 0) {
      throw new Error("Setup already completed.");
    }

    // Create tenant
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        name: data.restaurantName,
        slug: data.restaurantSlug,
        timezone: data.restaurantTimezone,
      })
      .select()
      .single();
    if (tErr) throw new Error(`Slug déjà utilisé ou erreur : ${tErr.message}`);

    // Create super-admin
    const superHash = await bcrypt.hash(data.superAdminPassword, 10);
    const { error: suErr } = await supabaseAdmin.from("app_users").insert({
      username: data.superAdminUsername,
      password_hash: superHash,
      role: "super_admin",
      email: data.superAdminEmail || null,
    });
    if (suErr) {
      // Rollback tenant
      await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Username super-admin déjà pris : ${suErr.message}`);
    }

    // Create restaurant admin
    const adminHash = await bcrypt.hash(data.restaurantAdminPassword, 10);
    const { error: aErr } = await supabaseAdmin.from("app_users").insert({
      username: data.restaurantAdminUsername,
      password_hash: adminHash,
      role: "restaurant_admin",
      tenant_id: tenant.id,
    });
    if (aErr) throw new Error(`Username admin déjà pris : ${aErr.message}`);

    return { ok: true, tenantSlug: tenant.slug };
  });

const loginSchema = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
});

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((input) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: user, error } = await supabaseAdmin
      .from("app_users")
      .select("*")
      .eq("username", data.username)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!user) throw new Error("Identifiants invalides");

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new Error("Identifiants invalides");

    // Create session
    const token = randomToken();
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    const { error: sErr } = await supabaseAdmin.from("sessions").insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });
    if (sErr) throw new Error(sErr.message);

    await supabaseAdmin
      .from("app_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);

    setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: SESSION_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return { ok: true, role: user.role };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    await supabaseAdmin.from("sessions").delete().eq("token", token);
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true };
});

export const meFn = createServerFn({ method: "GET" }).handler(async (): Promise<CurrentUser | null> => {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("*, app_users(*)")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!session || !session.app_users) return null;
  const u = session.app_users as {
    id: string;
    username: string;
    role: "super_admin" | "restaurant_admin";
    tenant_id: string | null;
    email: string | null;
  };

  let tenantSlug: string | null = null;
  let tenantName: string | null = null;
  if (u.tenant_id) {
    const { data: t } = await supabaseAdmin
      .from("tenants")
      .select("slug, name")
      .eq("id", u.tenant_id)
      .maybeSingle();
    tenantSlug = t?.slug ?? null;
    tenantName = t?.name ?? null;
  }

  return {
    id: u.id,
    username: u.username,
    role: u.role,
    tenantId: u.tenant_id,
    tenantSlug,
    tenantName,
    email: u.email,
  };
});

/**
 * Server-side helper for use within other server functions.
 * Throws if not authenticated. Optionally enforces a role.
 */
export async function requireUser(
  role?: "super_admin" | "restaurant_admin",
): Promise<CurrentUser> {
  const me = await meFn();
  if (!me) throw new Error("Non authentifié");
  if (role && me.role !== role) {
    if (!(role === "restaurant_admin" && me.role === "super_admin")) {
      throw new Error("Accès refusé");
    }
  }
  return me;
}
