import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MenuItem } from "./types";

export const menuQueryOptions = queryOptions({
  queryKey: ["menu"],
  queryFn: async (): Promise<MenuItem[]> => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("category")
      .order("created_at");
    if (error) throw error;
    return (data || []) as MenuItem[];
  },
});

export const adminMenuQueryOptions = queryOptions({
  queryKey: ["menu", "admin"],
  queryFn: async (): Promise<MenuItem[]> => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("category")
      .order("name");
    if (error) throw error;
    return (data || []) as MenuItem[];
  },
});
