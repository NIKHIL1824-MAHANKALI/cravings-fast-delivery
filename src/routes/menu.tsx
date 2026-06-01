import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { FoodCard } from "@/components/FoodCard";
import { menuQueryOptions } from "@/lib/queries";
import { motion, AnimatePresence } from "framer-motion";
import type { Category } from "@/lib/types";

type SearchParams = { cat?: Category | "all" };

export const Route = createFileRoute("/menu")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    cat: (s.cat as SearchParams["cat"]) ?? "all",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQueryOptions),
  component: MenuPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">{error.message}</div>,
});

const TABS: { id: Category | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "✨" },
  { id: "meals", label: "Meals", icon: "🍛" },
  { id: "snacks", label: "Snacks", icon: "🥟" },
  { id: "drinks", label: "Drinks", icon: "🥤" },
];

function MenuPage() {
  const { cat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: items } = useSuspenseQuery(menuQueryOptions);
  const [q, setQ] = useState("");

  const filtered = items
    .filter((i) => i.is_available)
    .filter((i) => cat === "all" || i.category === cat)
    .filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <MobileShell>
      <header className="sticky top-0 z-20 -mx-0 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-5 pt-6 pb-3">
          <Link to="/" className="glass flex h-10 w-10 items-center justify-center rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold">Menu</h1>
        </div>
        <div className="px-5 pb-3">
          <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dishes..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="scroll-hide flex gap-2 overflow-x-auto px-5 pb-3">
          {TABS.map((t) => {
            const active = cat === t.id;
            return (
              <button
                key={t.id}
                onClick={() => navigate({ search: { cat: t.id } })}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-neon"
                    : "glass text-foreground"
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid gap-3 px-5 pt-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <FoodCard item={item} />
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No items found.</p>
        )}
      </div>
    </MobileShell>
  );
}
