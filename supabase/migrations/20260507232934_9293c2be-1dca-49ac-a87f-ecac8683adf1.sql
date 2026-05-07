ALTER TABLE public.app_users DROP CONSTRAINT IF EXISTS super_admin_no_tenant;
ALTER TABLE public.app_users ADD CONSTRAINT super_admin_no_tenant CHECK (
  (role = 'super_admin' AND tenant_id IS NULL)
  OR (role IN ('restaurant_admin', 'kitchen') AND tenant_id IS NOT NULL)
);