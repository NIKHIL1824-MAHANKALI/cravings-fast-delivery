import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck, LogOut, Plus, Pencil, Trash2, Check, X, Search,
  LayoutDashboard, ClipboardList, UtensilsCrossed, Users, Bell,
  IndianRupee, Package, AlertTriangle, ShoppingBag, Clock, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { MenuItem, Category } from "@/lib/types";
import { NotificationBell, useOrderNotifications, useNotificationMute, showNewOrderToast } from "@/components/admin/NotificationCenter";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Role = "admin" | "staff";
type OrderStatus =
  | "pending" | "accepted" | "preparing" | "packed"
  | "out_for_delivery" | "delivered" | "cancelled";

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  user_id: string | null;
  items: any;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  maps_url: string | null;
}


const STATUS_FLOW: OrderStatus[] = [
  "pending", "accepted", "preparing", "packed", "out_for_delivery", "delivered", "cancelled",
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  accepted: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  preparing: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  packed: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  out_for_delivery: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  delivered: "bg-primary/20 text-primary border-primary/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<"dash" | "orders" | "menu" | "customers">("dash");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | OrderStatus>("all");
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(new Set());
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/admin-login" });
        return;
      }
      const { data: r } = await supabase
        .from("user_roles").select("role").eq("user_id", data.user.id);
      const list = (r ?? []).map((x: any) => x.role).filter((x: string) => x === "admin" || x === "staff") as Role[];
      if (list.length === 0) {
        await supabase.auth.signOut();
        navigate({ to: "/admin-login" });
        return;
      }
      setRoles(list);
      setEmail(data.user.email ?? "");
      setChecking(false);
      refresh(true);
    })();
  }, [navigate]);

  // Realtime status updates (INSERT is handled by useOrderNotifications below)
  useEffect(() => {
    if (checking) return;
    const channel = supabase
      .channel("admin-order-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const o = payload.new as Order;
        if (o.status === "cancelled") toast(`Order #${o.id.slice(0, 6)} cancelled`, { icon: "⚠️" });
        refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [checking]);

  // Order actions used by notification quick-actions
  const setOrderStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Order ${status}`);
    refresh();
  };

  // Persisted mute preference
  const { muted, toggle: toggleMute } = useNotificationMute();

  // Realtime new-order notifications (bell + toast + sound + auto-refresh)
  const { notifs, unread, markRead, markAllRead, remove, clearAll } = useOrderNotifications({
    enabled: !checking,
    muted,
    onNewOrder: (n) => {
      refresh();
      showNewOrderToast(n, {
        onView: () => { setTab("orders"); setOrderFilter("pending"); },
        onAccept: isAdmin ? () => setOrderStatus(n.orderId, "accepted") : undefined,
        onReject: isAdmin ? () => setOrderStatus(n.orderId, "cancelled") : undefined,
      });
    },
  });

  const refresh = async (initial = false) => {
    const [{ data: m }, { data: o }] = await Promise.all([
      supabase.from("menu_items").select("*").order("category").order("name"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setItems((m || []) as MenuItem[]);
    setOrders((o || []) as Order[]);
    if (initial) setSeenOrderIds(new Set((o || []).map((x: any) => x.id)));

    // Low stock warning (one-time per refresh)
    const lowStockCount = (m || []).filter((x: any) => !x.is_available).length;
    if (initial && lowStockCount > 0) {
      toast(`⚠️ ${lowStockCount} item${lowStockCount > 1 ? "s" : ""} out of stock`);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin-login" });
  };

  // Stats
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter((o) => new Date(o.created_at) >= today);
    const pending = orders.filter((o) => o.status === "pending" || o.status === "accepted" || o.status === "preparing").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
    const available = items.filter((i) => i.is_available).length;
    const outOfStock = items.filter((i) => !i.is_available).length;
    return {
      total: orders.length,
      today: todayOrders.length,
      pending,
      delivered,
      revenue,
      available,
      outOfStock,
    };
  }, [orders, items]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 animate-pulse text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Verifying access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-background pb-24">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[40vh] hero-radial opacity-60" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Cravings Admin</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {isAdmin ? "Admin" : "Staff"} · {email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell
              notifs={notifs}
              unread={unread}
              markRead={markRead}
              markAllRead={markAllRead}
              remove={remove}
              clearAll={clearAll}
              canAct={isAdmin}
              onView={() => { setTab("orders"); setOrderFilter("pending"); }}
              onAccept={(id) => setOrderStatus(id, "accepted")}
              onReject={(id) => setOrderStatus(id, "cancelled")}
              muted={muted}
              onToggleMute={toggleMute}
            />
            <Link to="/" className="hidden glass rounded-full px-3 py-1.5 text-xs font-semibold md:block">View store</Link>
            <button onClick={signOut} className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="-mb-px flex gap-1 overflow-x-auto">
            {([
              { id: "dash", label: "Dashboard", icon: LayoutDashboard },
              { id: "orders", label: "Orders", icon: ClipboardList },
              { id: "menu", label: "Menu", icon: UtensilsCrossed },
              { id: "customers", label: "Customers", icon: Users },
            ] as const).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative flex items-center gap-2 whitespace-nowrap rounded-t-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {active && (
                    <motion.div layoutId="admin-tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6 md:px-8">
        {tab === "dash" && <Dashboard stats={stats} orders={orders} />}
        {tab === "orders" && (
          <OrdersPanel
            orders={orders}
            filter={orderFilter}
            setFilter={setOrderFilter}
            isAdmin={isAdmin}
            onRefresh={refresh}
          />
        )}
        {tab === "menu" && (
          <MenuPanel
            items={items}
            isAdmin={isAdmin}
            onEdit={(it) => setEditing(it)}
            onAdd={() => setEditing({ category: "meals", is_available: true })}
            onRefresh={refresh}
          />
        )}
        {tab === "customers" && <CustomersPanel orders={orders} />}
      </main>

      <AnimatePresence>
        {editing && (
          <EditModal
            item={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); refresh(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({ stats, orders }: { stats: any; orders: Order[] }) {
  const recent = orders.slice(0, 6);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Orders" value={stats.total} icon={ShoppingBag} />
        <StatCard label="Today's Orders" value={stats.today} icon={Clock} accent />
        <StatCard label="Pending" value={stats.pending} icon={Bell} />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle2} />
        <StatCard label="Revenue" value={`₹${stats.revenue.toFixed(0)}`} icon={IndianRupee} accent />
        <StatCard label="Available" value={stats.available} icon={Package} />
        <StatCard label="Out of Stock" value={stats.outOfStock} icon={AlertTriangle} warn={stats.outOfStock > 0} />
        <StatCard label="Total Menu" value={stats.available + stats.outOfStock} icon={UtensilsCrossed} />
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Recent Orders</h2>
          <span className="text-xs text-muted-foreground">Latest 6</span>
        </div>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl bg-surface-elevated/40 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{o.customer_name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    #{o.id.slice(0, 6)} · {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_COLORS[o.status]}`}>
                    {o.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-bold neon-text">₹{Number(o.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent, warn }: { label: string; value: any; icon: any; accent?: boolean; warn?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass relative overflow-hidden rounded-2xl p-4 ${accent ? "ring-1 ring-primary/40" : ""}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${warn ? "text-destructive" : accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${accent ? "neon-text" : warn ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
    </motion.div>
  );
}

/* ---------- Orders ---------- */
function OrdersPanel({
  orders, filter, setFilter, isAdmin, onRefresh,
}: { orders: Order[]; filter: "all" | OrderStatus; setFilter: (f: any) => void; isAdmin: boolean; onRefresh: () => void }) {
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const update = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Updated to ${status.replace(/_/g, " ")}`);
    onRefresh();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order deleted");
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["all", ...STATUS_FLOW] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${
              filter === s ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ")}
            {s !== "all" && (
              <span className="ml-1 opacity-70">({orders.filter((o) => o.status === s).length})</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No orders to show.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((o) => (
            <motion.div key={o.id} layout className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{o.customer_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">📞 {o.phone}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_COLORS[o.status]}`}>
                  {o.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">📍 {o.address}</p>
              <div className="mt-2 rounded-xl bg-surface-elevated/40 p-2 text-[11px]">
                {Array.isArray(o.items)
                  ? o.items.map((i: any) => `${i.name} × ${i.qty}`).join(" · ")
                  : ""}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-base font-bold neon-text">₹{Number(o.total)}</span>
                {isAdmin && (
                  <button onClick={() => del(o.id)} className="rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold text-destructive">
                    <Trash2 className="mr-1 inline h-3 w-3" /> Delete
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {o.status === "pending" && (
                  <>
                    <button onClick={() => update(o.id, "accepted")} className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
                      Accept
                    </button>
                    <button onClick={() => update(o.id, "cancelled")} className="rounded-full bg-destructive/20 px-3 py-1 text-[10px] font-bold text-destructive">
                      Reject
                    </button>
                  </>
                )}
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    onClick={() => update(o.id, s)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                      o.status === s ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Menu ---------- */
function MenuPanel({
  items, isAdmin, onEdit, onAdd, onRefresh,
}: { items: MenuItem[]; isAdmin: boolean; onEdit: (i: MenuItem) => void; onAdd: () => void; onRefresh: () => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | Category>("all");

  const filtered = items.filter((i) =>
    (cat === "all" || i.category === cat) &&
    (q === "" || i.name.toLowerCase().includes(q.toLowerCase()))
  );

  const toggle = async (item: MenuItem) => {
    const { error } = await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success(item.is_available ? "Marked out of stock" : "Marked available");
    onRefresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass relative flex flex-1 min-w-[200px] items-center rounded-xl px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search items…"
            className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
          />
        </div>
        <div className="glass flex rounded-xl p-1">
          {(["all", "meals", "snacks", "drinks"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold capitalize ${
                cat === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground neon-glow"
        >
          <Plus className="h-4 w-4" strokeWidth={3} /> Add item
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((it) => (
          <motion.div key={it.id} layout className="glass overflow-hidden rounded-2xl">
            <div className="relative h-32 w-full overflow-hidden bg-surface">
              {it.image_url ? (
                <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl">🍛</div>
              )}
              <span className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                it.is_available ? "border-primary/40 bg-primary/20 text-primary" : "border-destructive/40 bg-destructive/20 text-destructive"
              }`}>
                {it.is_available ? "Available" : "Out of stock"}
              </span>
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-1 text-sm font-semibold">{it.name}</p>
                <span className="text-sm font-bold neon-text">₹{Number(it.price)}</span>
              </div>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">{it.description ?? "—"}</p>
              <div className="mt-3 flex gap-1.5">
                <button onClick={() => toggle(it)} className="flex-1 rounded-lg glass px-2 py-1.5 text-[10px] font-bold">
                  {it.is_available ? "Mark Out" : "Mark Available"}
                </button>
                <button onClick={() => onEdit(it)} className="rounded-lg bg-surface-elevated p-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {isAdmin && (
                  <button onClick={() => remove(it.id)} className="rounded-lg bg-destructive/15 p-1.5 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Customers ---------- */
function CustomersPanel({ orders }: { orders: Order[] }) {
  const customers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; orders: number; total: number; last: string }>();
    orders.forEach((o) => {
      const key = o.phone;
      const prev = map.get(key);
      if (prev) {
        prev.orders += 1;
        prev.total += Number(o.total);
        if (new Date(o.created_at) > new Date(prev.last)) prev.last = o.created_at;
      } else {
        map.set(key, { name: o.customer_name, phone: o.phone, orders: 1, total: Number(o.total), last: o.created_at });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.orders - a.orders);
  }, [orders]);

  if (customers.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No customers yet.</p>;
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-border/50 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>Customer</span><span>Orders</span><span>Total</span><span className="hidden md:block">Last order</span>
      </div>
      {customers.map((c) => (
        <div key={c.phone} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border/30 px-4 py-3 last:border-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{c.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{c.phone}</p>
          </div>
          <span className="text-sm font-bold">{c.orders}</span>
          <span className="text-sm font-bold neon-text">₹{c.total.toFixed(0)}</span>
          <span className="hidden text-[11px] text-muted-foreground md:block">{new Date(c.last).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Edit modal ---------- */
function EditModal({
  item, onClose, onSaved,
}: { item: Partial<MenuItem>; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Partial<MenuItem>>(item);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!draft.name || !draft.price || !draft.category) {
      toast.error("Fill name, price, category");
      return;
    }
    setSaving(true);
    const payload = {
      name: draft.name,
      description: draft.description ?? "",
      price: Number(draft.price),
      category: draft.category,
      image_url: draft.image_url ?? null,
      is_available: draft.is_available ?? true,
      is_bestseller: draft.is_bestseller ?? false,
      is_special: draft.is_special ?? false,
    };
    const { error } = draft.id
      ? await supabase.from("menu_items").update(payload).eq("id", draft.id)
      : await supabase.from("menu_items").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong w-full max-w-md rounded-3xl p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{item.id ? "Edit item" : "New item"}</h2>
          <button onClick={onClose} className="p-1"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <Field label="Name" value={draft.name ?? ""} onChange={(v) => set("name", v)} />
          <Field label="Description" value={draft.description ?? ""} onChange={(v) => set("description", v)} />
          <Field label="Price (₹)" value={String(draft.price ?? "")} onChange={(v) => set("price", Number(v) as any)} type="number" />
          <Field label="Image URL" value={draft.image_url ?? ""} onChange={(v) => set("image_url", v)} />
          <div>
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Category</span>
            <div className="flex gap-2">
              {(["meals", "snacks", "drinks"] as Category[]).map((c) => (
                <button
                  key={c}
                  onClick={() => set("category", c)}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold capitalize ${
                    draft.category === c ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Toggle label="Available" value={draft.is_available ?? true} onChange={(v) => set("is_available", v)} />
            <Toggle label="Bestseller" value={draft.is_bestseller ?? false} onChange={(v) => set("is_bestseller", v)} />
            <Toggle label="Special" value={draft.is_special ?? false} onChange={(v) => set("is_special", v)} />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
          >
            <Check className="h-4 w-4" strokeWidth={3} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex-1 rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider ${
        value ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
      }`}
    >{label}</button>
  );
}
