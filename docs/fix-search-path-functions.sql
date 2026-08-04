-- =============================================================================
-- Supabase Security Advisor fix: function_search_path_mutable
-- Clears warnings for:
--   - public.next_purchase_id
--   - public.next_agreement_id
-- (Also hardens public.is_staff the same way.)
--
-- HOW TO APPLY (required for Advisor to clear):
--   Supabase Dashboard → SQL Editor → New query → paste this file → Run
--   Then: Database → Advisors → Security Advisor → Rerun linter
--
-- OR use App Builder "Push to Supabase" after src/db/schema.ts (already updated).
--
-- Behavior unchanged: same counters, same ID formats (AON-YYYY-XXXXXX / AGR-YYYY-XXXXXX).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- next_purchase_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_purchase_id()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $function$
DECLARE
  y text := to_char((NOW() AT TIME ZONE 'UTC'), 'YYYY');
  n integer;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  INSERT INTO public.purchase_id_counters (year, last_seq, updated_at)
  VALUES (y, 1, NOW())
  ON CONFLICT (year) DO UPDATE
    SET last_seq = public.purchase_id_counters.last_seq + 1,
        updated_at = NOW()
  RETURNING last_seq INTO n;

  RETURN 'AON-' || y || '-' || lpad(n::text, 6, '0');
END;
$function$;

-- Ensure proconfig is set even if CREATE OR REPLACE did not replace attributes cleanly.
ALTER FUNCTION public.next_purchase_id() SET search_path TO public;

COMMENT ON FUNCTION public.next_purchase_id() IS 'managed-by:devs-ai; search_path=public';

-- ---------------------------------------------------------------------------
-- next_agreement_id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_agreement_id()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $function$
DECLARE
  y text := to_char((NOW() AT TIME ZONE 'UTC'), 'YYYY');
  n integer;
BEGIN
  PERFORM set_config('search_path', 'public', true);

  INSERT INTO public.agreement_id_counters (year, last_seq, updated_at)
  VALUES (y, 1, NOW())
  ON CONFLICT (year) DO UPDATE
    SET last_seq = public.agreement_id_counters.last_seq + 1,
        updated_at = NOW()
  RETURNING last_seq INTO n;

  RETURN 'AGR-' || y || '-' || lpad(n::text, 6, '0');
END;
$function$;

ALTER FUNCTION public.next_agreement_id() SET search_path TO public;

COMMENT ON FUNCTION public.next_agreement_id() IS 'managed-by:devs-ai; search_path=public';

-- ---------------------------------------------------------------------------
-- is_staff (same Advisor class; safe to include)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff(allowed_roles text[] DEFAULT ARRAY['admin','support','read_only']::text[])
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles ap
    WHERE ap.user_id = (SELECT auth.uid()::text)
      AND ap.is_active = true
      AND ap.role = ANY (allowed_roles)
  );
$function$;

ALTER FUNCTION public.is_staff(text[]) SET search_path TO public;

COMMENT ON FUNCTION public.is_staff(text[]) IS 'managed-by:devs-ai; search_path=public';

-- ---------------------------------------------------------------------------
-- VERIFY (run after apply — expected: search_path=public on each row)
-- ---------------------------------------------------------------------------
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('next_purchase_id', 'next_agreement_id', 'is_staff')
ORDER BY p.proname;

-- Smoke-test IDs still generate (optional; increments counters):
-- SELECT public.next_purchase_id();
-- SELECT public.next_agreement_id();
