
-- ============================================
-- Tabli — Multi-tenant restaurant SaaS schema
-- 100% portable Postgres (no Supabase-specific dependencies)
-- ============================================

-- Roles enum
CREATE TYPE app_role AS ENUM ('super_admin', 'restaurant_admin');

-- Tenants (restaurants)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  source_url TEXT, -- Uber Eats / Deliveroo URL
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX tenants_slug_idx ON public.tenants(slug);

-- App users (admins) — independent of Supabase auth.users for portability
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role app_role NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  CONSTRAINT super_admin_no_tenant CHECK (
    (role = 'super_admin' AND tenant_id IS NULL)
    OR (role = 'restaurant_admin' AND tenant_id IS NOT NULL)
  )
);
CREATE INDEX app_users_username_idx ON public.app_users(username);
CREATE INDEX app_users_tenant_idx ON public.app_users(tenant_id);

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sessions_token_idx ON public.sessions(token);
CREATE INDEX sessions_user_idx ON public.sessions(user_id);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX categories_tenant_idx ON public.categories(tenant_id);

-- Dishes
CREATE TABLE public.dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  photo TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  allergens TEXT[] NOT NULL DEFAULT '{}',
  custom_allergens TEXT[] NOT NULL DEFAULT '{}',
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX dishes_tenant_idx ON public.dishes(tenant_id);
CREATE INDEX dishes_category_idx ON public.dishes(category_id);

-- Formulas (combos)
CREATE TABLE public.formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  dish_ids UUID[] NOT NULL DEFAULT '{}',
  schedules JSONB NOT NULL DEFAULT '[]',
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX formulas_tenant_idx ON public.formulas(tenant_id);

-- Tables (floor plan)
CREATE TABLE public.tables_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX tables_layout_tenant_idx ON public.tables_layout(tenant_id);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new', -- new | cooking | ready | served
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX orders_tenant_idx ON public.orders(tenant_id);
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_created_idx ON public.orders(created_at DESC);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  ref_id UUID, -- dish or formula id (no FK so deletion of menu items doesn't break history)
  kind TEXT NOT NULL, -- 'dish' | 'formula'
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  note TEXT
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

-- ============================================
-- RLS: enabled but DENY ALL by default.
-- All access goes through server functions using the service role.
-- This is critical because we use our own auth (not Supabase auth.uid()).
-- ============================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables_layout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated roles.
-- Only the service role (used in server functions) bypasses RLS.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
