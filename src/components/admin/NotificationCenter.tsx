import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, X, Check, Eye, Trash2, CheckCheck, Package, Phone, MapPin, Clock, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MUTE_KEY = "cravings_admin_notifications_muted_v1";

function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
function saveMuted(v: boolean) {
  try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch {}
}

export function useNotificationMute() {
  const [muted, setMutedState] = useState<boolean>(() => loadMuted());
  const setMuted = useCallback((v: boolean) => { setMutedState(v); saveMuted(v); }, []);
  const toggle = useCallback(() => setMutedState((prev) => { const n = !prev; saveMuted(n); return n; }), []);
  return { muted, setMuted, toggle };
}

export interface OrderNotification {
  id: string;                // notif id
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  total: number;
  items: Array<{ name: string; qty: number }>;
  createdAt: string;         // order created_at
  receivedAt: string;        // when we captured it
  read: boolean;
}

const LS_KEY = "cravings_admin_notifications_v1";
const MAX = 50;

function loadStore(): OrderNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveStore(list: OrderNotification[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, MAX))); } catch {}
}

/* ---------- Sound ---------- */
let audioCtx: AudioContext | null = null;
function playChime() {
  try {
    if (typeof window === "undefined") return;
    audioCtx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx!;
    const now = ctx.currentTime;
    const notes = [880, 1320]; // A5 → E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.14;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {}
}

/* ---------- Hook: subscribe to new orders ---------- */
export function useOrderNotifications(opts: {
  enabled: boolean;
  onNewOrder?: (n: OrderNotification) => void;
}) {
  const { enabled, onNewOrder } = opts;
  const [notifs, setNotifs] = useState<OrderNotification[]>(() => loadStore());
  const notifsRef = useRef(notifs);
  notifsRef.current = notifs;

  const persist = (updater: (prev: OrderNotification[]) => OrderNotification[]) => {
    setNotifs((prev) => {
      const next = updater(prev).slice(0, MAX);
      saveStore(next);
      return next;
    });
  };

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("admin-order-notifications")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const o = payload.new as any;
          // De-dupe (in case listener + parent both hear the event)
          if (notifsRef.current.some((n) => n.orderId === o.id)) return;
          const n: OrderNotification = {
            id: `${o.id}-${Date.now()}`,
            orderId: o.id,
            customerName: o.customer_name,
            phone: o.phone,
            address: o.address,
            total: Number(o.total),
            items: Array.isArray(o.items) ? o.items : [],
            createdAt: o.created_at,
            receivedAt: new Date().toISOString(),
            read: false,
          };
          persist((prev) => [n, ...prev]);
          playChime();
          onNewOrder?.(n);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const unread = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);

  return {
    notifs,
    unread,
    markRead: (id: string) => persist((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)),
    markAllRead: () => persist((prev) => prev.map((n) => ({ ...n, read: true }))),
    remove: (id: string) => persist((prev) => prev.filter((n) => n.id !== id)),
    clearAll: () => persist(() => []),
  };
}

/* ---------- Bell + dropdown ---------- */
export function NotificationBell({
  notifs, unread, markRead, markAllRead, remove, clearAll, onView, onAccept, onReject, canAct,
}: {
  notifs: OrderNotification[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
  onView: (orderId: string) => void;
  onAccept: (orderId: string) => Promise<void> | void;
  onReject: (orderId: string) => Promise<void> | void;
  canAct: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass relative flex h-9 w-9 items-center justify-center rounded-full"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground"
          >
            {unread > 99 ? "99+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-2 top-[62px] z-50 max-h-[80vh] overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl md:absolute md:inset-x-auto md:right-0 md:top-11 md:w-[380px]"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div>
                <p className="text-sm font-bold">Notifications</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {unread > 0 ? `${unread} unread` : "All caught up"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {notifs.length > 0 && (
                  <>
                    <button
                      onClick={markAllRead}
                      className="rounded-full px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                      title="Mark all read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={clearAll}
                      className="rounded-full px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-destructive"
                      title="Clear all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground md:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[65vh] overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-xs text-muted-foreground">No notifications yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {notifs.map((n) => (
                    <NotifRow
                      key={n.id}
                      n={n}
                      onOpen={() => { markRead(n.id); onView(n.orderId); setOpen(false); }}
                      onAccept={canAct ? async () => { await onAccept(n.orderId); markRead(n.id); } : undefined}
                      onReject={canAct ? async () => { await onReject(n.orderId); markRead(n.id); } : undefined}
                      onDismiss={() => remove(n.id)}
                      onMarkRead={() => markRead(n.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotifRow({
  n, onOpen, onAccept, onReject, onDismiss, onMarkRead,
}: {
  n: OrderNotification;
  onOpen: () => void;
  onAccept?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
  onDismiss: () => void;
  onMarkRead: () => void;
}) {
  const time = new Date(n.createdAt).toLocaleString();
  return (
    <li className={`relative px-4 py-3 transition-colors ${n.read ? "" : "bg-primary/5"}`}>
      {!n.read && (
        <span className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">🔔 New Order</p>
            <span className="text-[10px] font-mono text-muted-foreground">#{n.orderId.slice(0, 6)}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">A new customer order has been placed.</p>

          <div className="mt-2 space-y-1 text-[11px]">
            <p className="font-semibold text-foreground">{n.customerName}</p>
            <p className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> {n.phone}</p>
            <p className="flex items-start gap-1 text-muted-foreground"><MapPin className="h-3 w-3 shrink-0 mt-0.5" /> <span className="line-clamp-2">{n.address}</span></p>
            <p className="flex items-start gap-1 text-muted-foreground">
              <Package className="h-3 w-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{n.items.map((i) => `${i.name} × ${i.qty}`).join(" · ")}</span>
            </p>
            <div className="flex items-center justify-between pt-1">
              <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> {time}</p>
              <p className="text-sm font-bold neon-text">₹{n.total}</p>
            </div>
          </div>
        </div>
        <button onClick={onDismiss} className="rounded-full p-1 text-muted-foreground hover:text-destructive" title="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          onClick={onOpen}
          className="flex items-center gap-1 rounded-full bg-surface-elevated/60 px-3 py-1 text-[10px] font-bold hover:bg-surface-elevated"
        >
          <Eye className="h-3 w-3" /> View
        </button>
        {onAccept && (
          <button
            onClick={onAccept}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground"
          >
            <Check className="h-3 w-3" /> Accept
          </button>
        )}
        {onReject && (
          <button
            onClick={onReject}
            className="flex items-center gap-1 rounded-full bg-destructive/20 px-3 py-1 text-[10px] font-bold text-destructive"
          >
            <X className="h-3 w-3" /> Reject
          </button>
        )}
        {!n.read && (
          <button onClick={onMarkRead} className="ml-auto text-[10px] font-bold text-muted-foreground hover:text-foreground">
            Mark read
          </button>
        )}
      </div>
    </li>
  );
}

/* ---------- Rich toast helper ---------- */
export function showNewOrderToast(n: OrderNotification, actions: {
  onView: () => void;
  onAccept?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
}) {
  toast.custom((t) => (
    <div className="w-[340px] overflow-hidden rounded-2xl border border-primary/40 bg-background/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/50 bg-primary/10 px-4 py-2">
        <p className="text-xs font-bold text-primary">🔔 New Order Received</p>
        <button onClick={() => toast.dismiss(t)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-bold">New Order from {n.customerName} • ₹{n.total}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">#{n.orderId.slice(0, 8)} · {n.items.length} item{n.items.length !== 1 ? "s" : ""}</p>
        <div className="mt-3 flex gap-1.5">
          <button
            onClick={() => { actions.onView(); toast.dismiss(t); }}
            className="flex-1 rounded-full bg-surface-elevated/60 px-3 py-1.5 text-[11px] font-bold hover:bg-surface-elevated"
          >
            View
          </button>
          {actions.onAccept && (
            <button
              onClick={async () => { await actions.onAccept!(); toast.dismiss(t); }}
              className="flex-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
            >
              Accept
            </button>
          )}
          {actions.onReject && (
            <button
              onClick={async () => { await actions.onReject!(); toast.dismiss(t); }}
              className="flex-1 rounded-full bg-destructive/20 px-3 py-1.5 text-[11px] font-bold text-destructive"
            >
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  ), { duration: 8000, position: "top-right" });
}
