-- =============================================================================
-- Supabase Security Advisor fixes (apply on live DB)
-- Project: enkgmggqkuorzbtwdnjz
--
-- Clears:
--   CRITICAL  RLS Disabled in Public → public.devs_migrations
--   WARN      function_search_path_mutable → public.next_purchase_id
--   WARN      function_search_path_mutable → public.next_agreement_id
--
-- Safe for app traffic:
--   - service_role bypasses RLS (AppBuilder api/* continues to work)
--   - no anon/authenticated policies on devs_migrations → deny by default
--   - ID generators keep same formats: AON-YYYY-XXXXXX / AGR-YYYY-XXXXXX
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) public.devs_migrations — enable RLS, revoke client privileges
-- ---------------------------------------------------------------------------
ALTER TABLE public.devs_migrations ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner when not using BYPASSRLS (extra hardening).
-- service_role still bypasses RLS in Supabase.
ALTER TABLE public.devs_migrations FORCE ROW LEVEL SECURITY;

-- Strip any direct privileges from client roles (defense in depth).
REVOKE ALL ON TABLE public.devs_migrations FROM anon;
REVOKE ALL ON TABLE public.devs_migrations FROM authenticated;
REVOKE ALL ON TABLE public.devs_migrations FROM PUBLIC;

-- Explicit deny-style policies are optional when no grants exist, but Advisor
-- and auditors expect RLS ON + no permissive policies for clients.
-- We intentionally create NO policies for anon/authenticated so all their
-- commands fail under RLS. service_role bypasses RLS and keeps working.

-- Drop any accidental permissive policies if they exist from prior experiments.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'devs_migrations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.devs_migrations', pol.policyname);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) public.next_purchase_id — fixed search_path
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

ALTER FUNCTION public.next_purchase_id() SET search_path TO public;

-- ---------------------------------------------------------------------------
-- 3) public.next_agreement_id — fixed search_path
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

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFY (run after apply)
-- ---------------------------------------------------------------------------
-- RLS enabled?
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'devs_migrations';

-- No policies for clients (empty is correct — deny all under RLS)
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'devs_migrations';

-- Functions have search_path pinned
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS args,
       p.proconfig AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('next_purchase_id', 'next_agreement_id')
ORDER BY p.proname;
