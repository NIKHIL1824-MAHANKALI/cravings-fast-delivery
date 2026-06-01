import { motion } from "framer-motion";
import { Plus, Flame } from "lucide-react";
import { useCart } from "@/lib/cart";
import type { MenuItem } from "@/lib/types";

export function FoodCard({ item }: { item: MenuItem }) {
  const { add } = useCart();
  const disabled = !item.is_available;

  return (
    <motion.div
      whileHover={{ y: -6, rotateX: 4, rotateY: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="glass relative flex gap-3 rounded-3xl p-3 shadow-card"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🍛</div>
        )}
        {item.is_bestseller && (
          <div className="absolute left-1 top-1 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
            <Flame className="h-2.5 w-2.5" /> HOT
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{item.name}</h3>
        </div>
        <p className="line-clamp-2 mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <span className="text-lg font-bold text-foreground">₹{Number(item.price)}</span>
            {disabled && <p className="text-[10px] text-destructive">Out of stock</p>}
          </div>
          <button
            disabled={disabled}
            onClick={() => add(item)}
            className="group flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-neon transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}
