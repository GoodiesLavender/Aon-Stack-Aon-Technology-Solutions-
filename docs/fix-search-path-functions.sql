-- =============================================================================
-- Supabase Security Advisor fix: function_search_path_mutable
-- Functions: public.next_purchase_id, public.next_agreement_id
-- (Also hardens public.is_staff the same way.)
--
-- Apply via: App Builder "Push to Supabase" after schema.ts is updated,
-- OR run this SQL in the Supabase SQL Editor if you need an immediate fix.
--
-- Behavior is unchanged: same counter tables, same ID formats.
-- =============================================================================

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
  -- Defense in depth: pin search_path for this transaction-local call.
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

COMMENT ON FUNCTION public.next_purchase_id() IS 'managed-by:devs-ai; search_path=public';

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

COMMENT ON FUNCTION public.next_agreement_id() IS 'managed-by:devs-ai; search_path=public';

-- Optional: same class of warning if Advisor lists is_staff
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

COMMENT ON FUNCTION public.is_staff(text[]) IS 'managed-by:devs-ai; search_path=public';

-- Verify (optional):
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
--        p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('next_purchase_id', 'next_agreement_id', 'is_staff');
-- Expected proconfig includes: {search_path=public}
