import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChefHat, Bike, PackageCheck, Receipt, XCircle, Package, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/track/$orderId")({ component: TrackPage });

type Status =
  | "pending" | "accepted" | "preparing" | "packed"
  | "out_for_delivery" | "delivered" | "cancelled";

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  status: Status;
  items: any;
  created_at: string;
}

const STEPS: { key: Status; label: string; sub: string; Icon: any; toast: string }[] = [
  { key: "pending",          label: "Order Placed",     sub: "Waiting for confirmation",  Icon: Receipt,       toast: "Order placed" },
  { key: "accepted",         label: "Accepted",         sub: "Restaurant accepted",       Icon: ThumbsUp,      toast: "Order accepted by restaurant" },
  { key: "preparing",        label: "Preparing",        sub: "Chef is cooking fresh",     Icon: ChefHat,       toast: "Your food is being prepared" },
  { key: "packed",           label: "Packed",           sub: "Ready for pickup",          Icon: Package,       toast: "Order packed and ready" },
  { key: "out_for_delivery", label: "On The Way",       sub: "Delivery in progress",      Icon: Bike,          toast: "Your order is on the way" },
  { key: "delivered",        label: "Delivered",        sub: "Enjoy your meal!",          Icon: PackageCheck,  toast: "Delivered. Enjoy!" },
];

function stepIndex(s: Status) {
  const i = STEPS.findIndex((x) => x.key === s);
  return i === -1 ? 0 : i;
}

function TrackPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const prevStatus = useRef<Status | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (!mounted) return;
      if (error || !data) setNotFound(true);
      else {
        setOrder(data as Order);
        prevStatus.current = (data as Order).status;
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const next = payload.new as Order;
          if (prevStatus.current && prevStatus.current !== next.status) {
            const step = STEPS.find((s) => s.key === next.status);
            if (next.status === "cancelled") {
              toast.error("Your order was cancelled");
            } else if (step) {
              toast.success(step.toast);
            }
          }
          prevStatus.current = next.status;
          setOrder((prev) => ({ ...(prev as Order), ...next }));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const cancelled = order?.status === "cancelled";
  // For cancelled orders: keep the steps the order had already passed (green),
  // then append a red "Cancelled" step as the active one.
  const lastReachedIdx = order ? (cancelled ? (prevStatus.current && prevStatus.current !== "cancelled" ? stepIndex(prevStatus.current) : -1) : stepIndex(order.status)) : 0;
  const timelineSteps = cancelled
    ? [
        ...STEPS.slice(0, lastReachedIdx + 1),
        { key: "cancelled" as Status, label: "Cancelled", sub: "Order was cancelled", Icon: XCircle, toast: "" },
      ]
    : STEPS;
  const currentIdx = cancelled ? timelineSteps.length - 1 : stepIndex(order?.status ?? "pending");
  const progressPct = cancelled ? 100 : (currentIdx / (STEPS.length - 1)) * 100;

  return (
    <MobileShell>
      <header className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link to="/account" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Track Order</h1>
          <p className="text-xs text-muted-foreground">Live status updates</p>
        </div>
      </header>

      {loading ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading...</p>
      ) : notFound || !order ? (
        <div className="glass m-5 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold">Order not found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in with the account that placed it to view live tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-5 px-5 pt-3">
          <div className="glass-strong rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Order ID</p>
                <p className="font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="font-bold neon-text">₹{Number(order.total)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cancelled ? "bg-destructive" : "bg-primary"} opacity-75`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${cancelled ? "bg-destructive" : "bg-primary"}`} />
              </span>
              <p className={`text-xs font-semibold ${cancelled ? "text-destructive" : ""}`}>
                {cancelled ? "Order cancelled" : STEPS[currentIdx].label}
              </p>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <motion.div
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${cancelled ? "bg-destructive" : "bg-primary neon-glow"}`}
              />
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="relative">
              {timelineSteps.map((step, i) => {
                const isCancelStep = step.key === "cancelled";
                const done = i < currentIdx;
                const active = i === currentIdx;
                const Icon = step.Icon;
                const activeRed = active && isCancelStep;
                return (
                  <div key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
                    {i < timelineSteps.length - 1 && (
                      <div className="absolute left-[19px] top-10 h-[calc(100%-2.5rem)] w-px bg-border">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: done ? "100%" : "0%" }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="w-px bg-primary"
                        />
                      </div>
                    )}
                    <motion.div
                      animate={active && !activeRed ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                      transition={active && !activeRed ? { duration: 1.6, repeat: Infinity } : {}}
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all ${
                        activeRed
                          ? "bg-destructive text-destructive-foreground shadow-[0_0_20px_hsl(var(--destructive)/0.6)]"
                          : done || active
                          ? "bg-primary text-primary-foreground neon-glow"
                          : "glass text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                    </motion.div>
                    <div className="flex-1 pt-1.5">
                      <p className={`text-sm font-bold ${activeRed ? "text-destructive" : done || active ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          <div className="glass rounded-2xl p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delivering to</p>
            <p className="text-sm font-semibold">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground">{order.phone}</p>
            <p className="mt-1 text-xs text-muted-foreground">{order.address}</p>
          </div>

          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Items</p>
              <div className="space-y-1.5">
                {order.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-foreground">{it.name} × {it.qty}</span>
                    <span className="text-muted-foreground">₹{Number(it.price) * Number(it.qty)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </MobileShell>
  );
}
