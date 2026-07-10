import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, MapPin, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useCart } from "@/lib/cart";
import { motion, AnimatePresence } from "framer-motion";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LocationPicker = lazy(() => import("@/components/LocationPicker"));

const LOC_PREF_KEY = "cravings.locationPref"; // "granted" | "denied"

export const Route = createFileRoute("/cart")({ component: CartPage });


function CartPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const delivery = items.length > 0 ? 29 : 0;

  return (
    <MobileShell hideNav>
      <header className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link to="/" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Your Cart</h1>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
          <div className="glass flex h-24 w-24 items-center justify-center rounded-full">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="mt-6 text-lg font-bold">Cart is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Add some delicious CRAVINGS meals.</p>
          <Link to="/menu" className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground neon-glow">
            Browse Menu
          </Link>
        </div>
      ) : (
        <>
          {/* Scrollable content with safe bottom padding so nothing hides under sticky CTA + bottom nav */}
          <div className="pb-[160px]">
            <div className="space-y-3 px-5 pt-4">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className="glass flex items-center gap-3 rounded-2xl p-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">🍛</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold">{item.name}</p>
                      <p className="text-xs neon-text">₹{item.price}</p>
                    </div>
                    <div className="glass-strong flex items-center gap-2 rounded-full px-1">
                      <button onClick={() => setQty(item.id, item.qty - 1)} className="flex h-7 w-7 items-center justify-center text-primary">
                        <Minus className="h-3 w-3" strokeWidth={3} />
                      </button>
                      <span className="min-w-4 text-center text-sm font-bold">{item.qty}</span>
                      <button onClick={() => setQty(item.id, item.qty + 1)} className="flex h-7 w-7 items-center justify-center text-primary">
                        <Plus className="h-3 w-3" strokeWidth={3} />
                      </button>
                    </div>
                    <button onClick={() => remove(item.id)} className="p-2 text-muted-foreground">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-6 px-5">
              <div className="glass space-y-2 rounded-2xl p-4 text-sm">
                <Row label="Subtotal" value={`₹${total}`} />
                <Row label="Delivery" value={`₹${delivery}`} />
                <div className="my-2 h-px bg-border" />
                <Row label="Total" value={`₹${total + delivery}`} bold />
              </div>
            </div>
          </div>

          {/* Sticky Place Order CTA — sits above the bottom nav (nav ~88px tall incl. safe area) */}
          <div
            className="fixed left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 px-4"
            style={{ bottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -2 }}
              onClick={() => setOpen(true)}
              className="flex h-[68px] w-full items-center justify-between rounded-2xl bg-primary px-6 text-lg font-bold text-primary-foreground neon-glow shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] transition-shadow hover:shadow-[0_14px_50px_-8px_hsl(var(--primary)/0.8)]"
            >
              <span>Place Order</span>
              <span>₹{total + delivery} →</span>
            </motion.button>
          </div>

          {open && (
            <Checkout
              onClose={() => setOpen(false)}
              onPlaced={(orderId) => {
                clear();
                setOpen(false);
                navigate({ to: "/order-confirmation/$orderId", params: { orderId } });
              }}
            />
          )}

        </>
      )}
    </MobileShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "neon-text" : "text-foreground"}>{value}</span>
    </div>
  );
}

type LocState =
  | { kind: "idle" }
  | { kind: "detecting" }
  | { kind: "success"; lat: number; lng: number; accuracy: number }
  | { kind: "denied" }
  | { kind: "unavailable"; message: string };

function Checkout({ onClose, onPlaced }: { onClose: () => void; onPlaced: (orderId: string) => void }) {
  const { items, total } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loc, setLoc] = useState<LocState>({ kind: "idle" });
  const [autoAsked, setAutoAsked] = useState(false);
  const reverseSeqRef = useRef(0);
  const delivery = 29;

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const seq = ++reverseSeqRef.current;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { Accept: "application/json" } },
      );
      const data = await res.json();
      if (seq !== reverseSeqRef.current) return;
      const a = data?.address ?? {};
      const parts = [
        a.house_number,
        a.road || a.pedestrian || a.footway,
        a.neighbourhood || a.suburb || a.village || a.hamlet,
        a.city || a.town || a.municipality,
        a.state_district || a.county,
        a.state,
        a.postcode,
        a.country,
      ].filter(Boolean);
      const line = parts.length ? parts.join(", ") : (data?.display_name as string | undefined);
      if (line) setAddress(line);
      else setAddress(`Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`);
    } catch {
      setAddress(`Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`);
    }
  }, []);

  const detect = useCallback(
    (silent = false) => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setLoc({ kind: "unavailable", message: "GPS is not available on this device." });
        return;
      }
      setLoc({ kind: "detecting" });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setLoc({ kind: "success", lat: latitude, lng: longitude, accuracy });
          try { localStorage.setItem(LOC_PREF_KEY, "granted"); } catch {}
          void reverseGeocode(latitude, longitude);
          if (!silent) toast.success("Current location detected");
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setLoc({ kind: "denied" });
            try { localStorage.setItem(LOC_PREF_KEY, "denied"); } catch {}
          } else {
            setLoc({ kind: "unavailable", message: "Could not get your location. Please enter it manually." });
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    },
    [reverseGeocode],
  );

  // Auto-request location once when the checkout opens.
  useEffect(() => {
    if (autoAsked) return;
    setAutoAsked(true);
    let pref: string | null = null;
    try { pref = localStorage.getItem(LOC_PREF_KEY); } catch {}
    if (pref === "denied") { setLoc({ kind: "denied" }); return; }
    detect(true);
  }, [autoAsked, detect]);

  const onPinChange = useCallback(
    (lat: number, lng: number) => {
      setLoc((prev) => {
        const accuracy = prev.kind === "success" ? prev.accuracy : 0;
        return { kind: "success", lat, lng, accuracy };
      });
      void reverseGeocode(lat, lng);
    },
    [reverseGeocode],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Please add your name and phone");
      return;
    }
    const hasGps = loc.kind === "success";
    if (!hasGps && !address.trim()) {
      toast.error("Add your address or share your location");
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      toast.error("Please sign in to place an order");
      window.location.href = "/auth";
      return;
    }
    const lat = hasGps ? loc.lat : null;
    const lng = hasGps ? loc.lng : null;
    const mapsUrl = hasGps ? `https://www.google.com/maps?q=${lat},${lng}` : null;
    const { data: inserted, error } = await supabase
      .from("orders")
      .insert({
        user_id: userData.user.id,
        customer_name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || (hasGps ? `GPS ${lat!.toFixed(5)}, ${lng!.toFixed(5)}` : ""),
        total: total + delivery,
        items: items as any,
        status: "pending",
        latitude: lat,
        longitude: lng,
        location_accuracy: hasGps ? loc.accuracy : null,
        maps_url: mapsUrl,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error || !inserted) {
      toast.error(error?.message ?? "Could not place order");
      return;
    }
    setSuccess(true);
    setTimeout(() => onPlaced(inserted.id), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-3xl"
      >
        {success ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-primary neon-glow"
            >
              <span className="text-4xl">✓</span>
            </motion.div>
            <h2 className="mt-6 text-2xl font-bold">Order placed!</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your food is being prepared.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="mx-auto mt-3 h-1 w-12 shrink-0 rounded-full bg-border" />
            <div className="flex-1 space-y-3 overflow-y-auto px-6 pt-3 pb-4">
              <h2 className="text-xl font-bold">Delivery details</h2>
              <Input label="Full name" value={name} onChange={setName} />
              <Input label="Phone" value={phone} onChange={setPhone} type="tel" />

              {/* Location block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Delivery location</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => detect(false)}
                      disabled={loc.kind === "detecting"}
                      className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
                    >
                      {loc.kind === "detecting" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : loc.kind === "success" ? (
                        <RefreshCw className="h-3.5 w-3.5" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                      {loc.kind === "detecting"
                        ? "Detecting"
                        : loc.kind === "success"
                          ? "Refresh"
                          : "Use current location"}
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {loc.kind === "detecting" && (
                    <motion.div
                      key="detecting"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="glass flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs"
                    >
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>📍 Detecting your current location…</span>
                    </motion.div>
                  )}
                  {loc.kind === "success" && (
                    <motion.div
                      key="ok"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>✅ Current location detected (±{Math.round(loc.accuracy)}m). Drag pin to adjust.</span>
                    </motion.div>
                  )}
                  {loc.kind === "denied" && (
                    <motion.div
                      key="denied"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Location permission denied. Please enter your address manually.</span>
                    </motion.div>
                  )}
                  {loc.kind === "unavailable" && (
                    <motion.div
                      key="unavail"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{loc.message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {loc.kind === "success" && (
                  <ClientOnly
                    fallback={
                      <div className="flex h-[200px] items-center justify-center rounded-2xl border border-border bg-surface">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    }
                  >
                    <Suspense
                      fallback={
                        <div className="flex h-[200px] items-center justify-center rounded-2xl border border-border bg-surface">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      }
                    >
                      <LocationPicker lat={loc.lat} lng={loc.lng} onChange={onPinChange} />
                    </Suspense>
                  </ClientOnly>
                )}

                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="House no, street, area, landmark, city, pincode…"
                  className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[10px] text-muted-foreground">
                  You can edit the auto-filled address before placing the order.
                </p>
              </div>
            </div>

            <div className="shrink-0 border-t border-border/50 px-6 pb-8 pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground neon-glow disabled:opacity-50"
              >
                {loading ? "Placing..." : `Place order · ₹${total + delivery}`}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

function Input({
  label, value, onChange, type = "text", textarea,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </label>
  );
}
