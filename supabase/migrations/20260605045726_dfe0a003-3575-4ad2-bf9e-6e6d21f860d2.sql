
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'accepted' BEFORE 'preparing';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'packed' AFTER 'preparing';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Admins delete orders') THEN
    CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
