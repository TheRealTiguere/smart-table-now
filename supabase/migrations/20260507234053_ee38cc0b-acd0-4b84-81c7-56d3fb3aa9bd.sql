ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS tva_number TEXT,
  ADD COLUMN IF NOT EXISTS tva_rate NUMERIC NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'Service compris',
  ADD COLUMN IF NOT EXISTS invoice_counter INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

CREATE OR REPLACE FUNCTION public.next_receipt_number(p_tenant uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num integer;
  v_prefix text;
BEGIN
  UPDATE public.tenants
    SET invoice_counter = invoice_counter + 1
    WHERE id = p_tenant
    RETURNING invoice_counter INTO v_num;
  v_prefix := to_char(now(), 'YYYYMMDD');
  RETURN v_prefix || '-' || lpad(v_num::text, 5, '0');
END;
$$;