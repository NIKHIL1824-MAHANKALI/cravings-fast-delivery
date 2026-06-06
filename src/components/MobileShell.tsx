import { Link, useRouterState } from "@tanstack/react-router";
import { Home, UtensilsCrossed, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/cart";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
  { to: "/account", label: "You", icon: User },
] as const;

export function MobileShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const { count } = useCart();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[480px] overflow-hidden bg-background">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto h-[70vh] w-full max-w-[480px] hero-radial" />
      <div className="pointer-events-none fixed left-1/2 top-10 z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-20 right-0 z-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

      <main className="relative z-10" style={{ paddingBottom: hideNav ? "0px" : "calc(96px + env(safe-area-inset-bottom, 0px))" }}>{children}</main>

      {!hideNav && (
      <nav
        className="fixed bottom-0 left-1/2 z-30 mx-auto w-full max-w-[480px] -translate-x-1/2 px-4 pt-2"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="glass-strong flex items-center justify-around rounded-3xl px-2 py-2.5 shadow-card">
          {tabs.map((t) => {
            const active = path === t.to;
            const Icon = t.icon;
            const isCart = t.to === "/cart";
            return (
              <Link
                key={t.to}
                to={t.to}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5"
              >
                {active && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-2xl bg-primary/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {isCart && count > 0 && (
                    <motion.span
                      key={count}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground neon-glow"
                    >
                      {count}
                    </motion.span>
                  )}
                </div>
                <span className={`relative text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
      )}
    </div>
  );
}
