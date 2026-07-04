import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Flame, Sparkles, Clock, Truck, ShieldCheck, Star, Leaf, Heart } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { FoodCard } from "@/components/FoodCard";
import { menuQueryOptions } from "@/lib/queries";
import biryaniHero from "@/assets/biryani-hero.jpg";
import cravingsLogo from "@/assets/cravings-wordmark.png";
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
      <header className="flex items-center justify-between px-5 pt-5">
        <img src={cravingsLogo} alt="cravings" className="h-8 w-auto" width={1280} height={512} />
        <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5">
          <Clock className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-semibold">15 min</span>
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
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"
          >
            <Sparkles className="h-3 w-3" /> Gourmet · Homemade · 15 Min
          </motion.div>
          <h1 className="font-display mt-3 text-[40px] font-bold leading-[1.02] tracking-tight">
            Homemade <em className="italic neon-text">Desi</em> Meals<br />
            <span className="text-foreground/90">Delivered Fresh.</span>
          </h1>
          <p className="font-body mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Chicken Biryani, Bagara Rice, Curries, Snacks & Drinks — chef-crafted by home kitchens. No frozen. No shortcuts.
          </p>

          {/* 3D Floating Biryani */}
          <div className="relative mx-auto mt-6 flex h-[300px] w-full items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="pulse-glow-static h-60 w-60 rounded-full bg-primary/25 blur-2xl" />
            </div>
            <div className="animate-spin-slow absolute h-72 w-72 rounded-full border border-dashed border-primary/30" />
            <div className="animate-spin-slow-rev absolute h-[340px] w-[340px] rounded-full border border-primary/10" />
            <img
              src={biryaniHero}
              alt="Chicken Biryani"
              width={1024}
              height={1024}
              loading="eager"
              decoding="async"
              className="animate-float-slow relative z-10 h-64 w-64 rounded-full object-cover shadow-float"
              style={{ filter: "drop-shadow(0 30px 40px rgba(198,255,0,0.35))" }}
            />
            <div
              className="glass-strong absolute -right-1 top-4 rounded-2xl px-3 py-2 shadow-card"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bestseller</p>
              <p className="font-display text-sm font-bold">Chicken Biryani</p>
              <p className="text-xs font-bold neon-text">₹249</p>
            </div>
            <div
              className="absolute -left-1 bottom-4 glass-strong flex items-center gap-2 rounded-2xl px-3 py-2 shadow-card"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                <Leaf className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Made</p>
                <p className="text-xs font-bold">Fresh today</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <motion.div whileTap={{ scale: 0.96 }}>
              <Link
                to="/menu"
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground neon-glow"
              >
                Order Now
              </Link>
            </motion.div>
            <motion.div whileTap={{ scale: 0.96 }}>
              <Link
                to="/menu"
                className="glass-strong flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-foreground"
              >
                View Menu
              </Link>
            </motion.div>
          </div>
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
        <img src={cravingsLogo} alt="cravings" className="mx-auto h-10 w-auto" width={1280} height={512} />
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          Homemade with <Heart className="h-3 w-3 fill-primary text-primary" /> · Delivered fast
        </p>
        <p className="mt-4 text-[10px] text-muted-foreground">© 2026 cravings™. Gourmet meals. Zero compromise.</p>
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
