
-- 1. Move has_role to private schema (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Recreate policies to reference private.has_role
DROP POLICY IF EXISTS "Admins manage items delete" ON public.menu_items;
DROP POLICY IF EXISTS "Admins manage items insert" ON public.menu_items;
DROP POLICY IF EXISTS "Admins manage items update" ON public.menu_items;
DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Admins manage items delete" ON public.menu_items
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage items insert" ON public.menu_items
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage items update" ON public.menu_items
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 3. Orders: require auth, bind to user
ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL;

CREATE POLICY "Users view own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users create own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete orders" ON public.orders
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 4. Drop the now-unused public.has_role (would still be API-exposed)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
