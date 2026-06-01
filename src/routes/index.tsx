import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Flame, Sparkles, Clock, Truck, ShieldCheck, Star } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { FoodCard } from "@/components/FoodCard";
import { menuQueryOptions } from "@/lib/queries";
import biryaniHero from "@/assets/biryani-hero.jpg";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQueryOptions),
  component: Home,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Couldn't load menu: {error.message}</div>
  ),
});

function Home() {
  const { data: items } = useSuspenseQuery(menuQueryOptions);
  const available = items.filter((i) => i.is_available);
  const bestsellers = available.filter((i) => i.is_bestseller);
  const specials = available.filter((i) => i.is_special);
  const snacks = available.filter((i) => i.category === "snacks");
  const drinks = available.filter((i) => i.category === "drinks");

  return (
    <MobileShell>
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Deliver to</p>
          <p className="text-sm font-semibold">Home · 15 min</p>
        </div>
        <div className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <span className="text-base">🌶️</span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Sparkles className="h-3 w-3" /> NEW · CRAVINGS KITCHEN
          </div>
          <h1 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-tight">
            Homemade <span className="neon-text">flavours</span><br />delivered fast.
          </h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Biryani, meals & snacks cooked fresh by home chefs. No frozen. No shortcuts.
          </p>

          {/* 3D Floating Biryani */}
          <div className="relative mx-auto mt-6 flex h-[280px] w-full items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-56 w-56 animate-pulse-glow rounded-full bg-primary/20 blur-2xl" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute h-72 w-72 rounded-full border border-dashed border-primary/30"
            />
            <motion.img
              src={biryaniHero}
              alt="Chicken Biryani"
              width={1024}
              height={1024}
              className="relative z-10 h-64 w-64 animate-float-slow rounded-full object-cover shadow-float"
              style={{ filter: "drop-shadow(0 30px 40px rgba(200,255,0,0.25))" }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
            <motion.div
              className="absolute -right-1 top-6 glass rounded-2xl px-3 py-2 shadow-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Best Seller</p>
              <p className="text-sm font-bold">Chicken Biryani</p>
              <p className="text-xs neon-text">₹249</p>
            </motion.div>
            <motion.div
              className="absolute -left-1 bottom-6 glass flex items-center gap-2 rounded-2xl px-3 py-2 shadow-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                <Clock className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Fresh in</p>
                <p className="text-xs font-bold">25 min</p>
              </div>
            </motion.div>
          </div>

          <Link
            to="/menu"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground neon-glow active:scale-95"
          >
            Order Now
          </Link>
        </motion.div>
      </section>

      {/* Search */}
      <section className="mt-8 px-5">
        <Link to="/menu" className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search biryani, curries, snacks...</span>
        </Link>
      </section>

      {/* Categories */}
      <section className="mt-6 px-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Meals", icon: "🍛", to: "/menu", q: "meals" },
            { label: "Snacks", icon: "🥟", to: "/menu", q: "snacks" },
            { label: "Drinks", icon: "🥤", to: "/menu", q: "drinks" },
          ].map((c) => (
            <Link
              key={c.label}
              to={c.to}
              search={{ cat: c.q }}
              className="glass flex flex-col items-center gap-1.5 rounded-2xl py-4 transition-all active:scale-95"
            >
              <span className="text-3xl">{c.icon}</span>
              <span className="text-xs font-semibold">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Specials banner */}
      {specials.length > 0 && (
        <section className="mt-8 px-5">
          <SectionTitle title="Today's Special" icon={<Sparkles className="h-4 w-4" />} />
          <div className="scroll-hide -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
            {specials.map((item) => (
              <motion.div
                key={item.id}
                whileTap={{ scale: 0.97 }}
                className="relative w-[260px] shrink-0 overflow-hidden rounded-3xl glass-strong shadow-card"
              >
                <div className="relative h-36 w-full overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/30 to-transparent text-6xl">🍛</div>
                  )}
                  <div className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    SPECIAL
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-bold">{item.name}</h4>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                  <p className="mt-1 text-base font-bold neon-text">₹{Number(item.price)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Popular */}
      {bestsellers.length > 0 && (
        <section className="mt-8 px-5">
          <SectionTitle title="Popular Dishes" icon={<Flame className="h-4 w-4" />} />
          <div className="mt-3 grid gap-3">
            {bestsellers.slice(0, 4).map((item) => (
              <FoodCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Snacks */}
      {snacks.length > 0 && (
        <section className="mt-8 px-5">
          <SectionTitle title="Snacks Collection" />
          <div className="scroll-hide -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
            {snacks.map((item) => (
              <div key={item.id} className="w-[160px] shrink-0">
                <MiniCard item={item} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Drinks */}
      {drinks.length > 0 && (
        <section className="mt-8 px-5">
          <SectionTitle title="Cold Drinks" />
          <div className="scroll-hide -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
            {drinks.map((item) => (
              <div key={item.id} className="w-[140px] shrink-0">
                <MiniCard item={item} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Why us */}
      <section className="mt-10 px-5">
        <SectionTitle title="Why CRAVINGS" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { icon: Truck, t: "Fast Delivery", s: "Under 30 min" },
            { icon: ShieldCheck, t: "Freshly Cooked", s: "No frozen food" },
            { icon: Flame, t: "Authentic", s: "Real home spice" },
            { icon: Star, t: "Top Rated", s: "4.9★ avg rating" },
          ].map(({ icon: Icon, t, s }) => (
            <div key={t} className="glass rounded-2xl p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-sm font-bold">{t}</p>
              <p className="text-xs text-muted-foreground">{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="mt-8 px-5">
        <SectionTitle title="Loved by foodies" />
        <div className="scroll-hide -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
          {[
            { n: "Priya R.", r: "Best biryani I've had outside Hyderabad. Tastes like home." },
            { n: "Arjun K.", r: "Chicken curry hits HARD with spice. 10/10." },
            { n: "Sneha M.", r: "Hot, fresh, delivered fast. New favorite." },
          ].map((rv) => (
            <div key={rv.n} className="glass w-[260px] shrink-0 rounded-2xl p-4">
              <div className="flex gap-0.5 text-primary">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
              </div>
              <p className="mt-2 text-sm">{rv.r}</p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">— {rv.n}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-12 px-5 pb-4 text-center">
        <p className="text-2xl font-bold neon-text">CRAVINGS</p>
        <p className="mt-1 text-xs text-muted-foreground">Homemade with love · Delivered fast</p>
        <p className="mt-4 text-[10px] text-muted-foreground">© 2026 CRAVINGS. All rights reserved.</p>
      </footer>
    </MobileShell>
  );
}

function SectionTitle({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        {icon && <span className="text-primary">{icon}</span>}
        {title}
      </h2>
    </div>
  );
}

function MiniCard({ item }: { item: import("@/lib/types").MenuItem }) {
  const { add } = useCart();
  return (
    <motion.div whileTap={{ scale: 0.96 }} className="glass overflow-hidden rounded-2xl shadow-card">
      <div className="h-24 w-full bg-surface">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">
            {item.category === "drinks" ? "🥤" : "🥟"}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-1 text-xs font-semibold">{item.name}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-bold">₹{Number(item.price)}</span>
          <button
            onClick={() => add(item)}
            className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground active:scale-95"
          >
            + Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}
