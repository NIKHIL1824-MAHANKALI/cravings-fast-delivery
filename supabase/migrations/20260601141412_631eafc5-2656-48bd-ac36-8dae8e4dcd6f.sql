
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Menu items
CREATE TYPE public.menu_category AS ENUM ('meals', 'snacks', 'drinks');

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category public.menu_category NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  is_special BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available items" ON public.menu_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage items insert" ON public.menu_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage items update" ON public.menu_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage items delete" ON public.menu_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed menu
INSERT INTO public.menu_items (name, description, price, category, is_bestseller, is_special) VALUES
('Chicken Biryani', 'Aromatic basmati rice layered with tender chicken, slow-cooked in Andhra spices', 249, 'meals', true, true),
('Bagara Rice', 'Fragrant rice cooked with whole spices, a Hyderabadi classic', 149, 'meals', false, false),
('Chicken Curry', 'Fiery Andhra-style chicken curry with rich gravy', 229, 'meals', true, false),
('Chicken Fried Rice', 'Wok-tossed rice with juicy chicken and aromatics', 199, 'meals', false, false),
('Veg Meals', 'Complete thali with rice, sambar, rasam, curries & curd', 159, 'meals', true, false),
('Chicken Manchurian', 'Crispy chicken in tangy Indo-Chinese sauce', 219, 'meals', false, false),
('Egg Fried Rice', 'Classic egg fried rice with spring onions', 169, 'meals', false, false),
('Paneer Curry', 'Creamy paneer in rich tomato gravy', 199, 'meals', false, false),
('Veg Fried Rice', 'Stir-fried rice with garden vegetables', 159, 'meals', false, false),
('Murukulu', 'Crunchy traditional rice spirals', 49, 'snacks', false, false),
('Mixture', 'Spicy savory snack mix', 59, 'snacks', false, false),
('Chips', 'Crispy banana chips', 39, 'snacks', false, false),
('Samosa', 'Golden fried pastry with spiced potato filling', 25, 'snacks', true, false),
('Veg Puff', 'Flaky pastry with vegetable filling', 30, 'snacks', false, false),
('Egg Puff', 'Flaky pastry stuffed with spiced egg', 35, 'snacks', false, false),
('Thums Up', 'Strong cola, 250ml', 25, 'drinks', false, false),
('Sprite', 'Lemon-lime soda, 250ml', 25, 'drinks', false, false),
('Coca Cola', 'Classic cola, 250ml', 25, 'drinks', false, false),
('Water Bottle', '1L mineral water', 20, 'drinks', false, false),
('Maaza', 'Mango drink, 250ml', 30, 'drinks', false, false),
('Frooti', 'Mango drink, 200ml', 20, 'drinks', false, false);
