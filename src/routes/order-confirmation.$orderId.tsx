import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Package, Phone, Receipt } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/order-confirmation/$orderId")({
  component: OrderConfirmationPage,
});

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  items: any;
  created_at: string;
}

function OrderConfirmationPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (!mounted) return;
      setOrder(data as Order);
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [orderId]);

  if (loading) {
    return (
      <MobileShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MobileShell>
    );
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  const shortId = order?.id.slice(0, 8).toUpperCase() ?? "";

  return (
    <MobileShell>
      <div className="flex min-h-[calc(100dvh-120px)] flex-col items-center px-5 pt-10 pb-8">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-primary neon-glow"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="text-5xl font-bold text-primary-foreground"
          >
            ✓
          </motion.span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6 text-2xl font-bold"
        >
          Order Confirmed!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-1 text-center text-sm text-muted-foreground"
        >
          Your order has been placed and is being prepared.
        </motion.p>

        {/* Order Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-8 w-full glass-strong rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order ID</span>
            </div>
            <span className="font-mono text-sm font-bold">{shortId}</span>
          </div>

          <div className="mt-4 space-y-3">
            {items.map((it: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{it.name} × {it.qty}</span>
                </div>
                <span className="font-semibold neon-text">₹{Number(it.price) * Number(it.qty)}</span>
              </div>
            ))}
          </div>

          <div className="my-3 h-px bg-border" />

          <div className="flex items-center justify-between text-base font-bold">
            <span>Total Paid</span>
            <span className="neon-text">₹{order?.total ?? 0}</span>
          </div>

          <div className="mt-4 space-y-2 rounded-xl bg-surface p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{order?.address ?? ""}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{order?.phone ?? ""}</span>
            </div>
          </div>
        </motion.div>

        {/* Track Order CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 w-full"
        >
          <Link
            to="/track/$orderId"
            params={{ orderId }}
            className="flex h-[60px] w-full items-center justify-between rounded-2xl bg-primary px-6 text-base font-bold text-primary-foreground neon-glow shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] transition-shadow hover:shadow-[0_14px_50px_-8px_hsl(var(--primary)/0.8)]"
          >
            <span>Track Your Order</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-4"
        >
          <Link to="/" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    </MobileShell>
  );
}
