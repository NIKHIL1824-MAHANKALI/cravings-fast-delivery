import { motion } from "framer-motion";
import { Plus, Flame, ImageOff } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { MenuItem } from "@/lib/types";

export function FoodCard({ item }: { item: MenuItem }) {
  const { add } = useCart();
  const [errored, setErrored] = useState(false);
  const disabled = !item.is_available;
  const hasImage = !!item.image_url && !errored;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass group relative overflow-hidden rounded-3xl shadow-card"
    >
      {/* Image on top */}
      <div className="relative aspect-[5/3] w-full overflow-hidden bg-surface">
        {hasImage ? (
          <img
            src={item.image_url!}
            alt={item.name}
            loading="lazy"
            width={1024}
            height={614}
            onError={() => setErrored(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-surface to-background text-muted-foreground">
            <ImageOff className="h-6 w-6 opacity-50" />
            <span className="text-[10px] uppercase tracking-wider">No image</span>
          </div>
        )}

        {/* gradient overlay for text legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" />

        {item.is_bestseller && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground shadow-neon">
            <Flame className="h-3 w-3" /> BESTSELLER
          </div>
        )}
        {disabled && (
          <div className="absolute right-2 top-2 rounded-full bg-destructive/90 px-2 py-1 text-[10px] font-bold text-destructive-foreground">
            SOLD OUT
          </div>
        )}
      </div>

      {/* Content below */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-base font-semibold text-foreground">{item.name}</h3>
          {item.description && (
            <p className="line-clamp-2 mt-0.5 text-xs text-muted-foreground">{item.description}</p>
          )}
          <p className="mt-2 text-xl font-bold text-foreground">₹{Number(item.price)}</p>
        </div>
        <button
          disabled={disabled}
          onClick={() => add(item)}
          aria-label={`Add ${item.name} to cart`}
          className="mt-1 flex items-center gap-1 self-end rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-neon transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Add
        </button>
      </div>
    </motion.div>
  );
}
