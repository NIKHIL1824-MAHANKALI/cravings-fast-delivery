export type Category = "meals" | "snacks" | "drinks";

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: Category;
  image_url: string | null;
  is_available: boolean;
  is_bestseller: boolean;
  is_special: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  qty: number;
}
