import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useCart } from "@/lib/cart";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const delivery = items.length > 0 ? 29 : 0;

  return (
    <MobileShell>
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

          <div className="fixed bottom-24 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 px-5">
            <button
              onClick={() => setOpen(true)}
              className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 text-base font-bold text-primary-foreground neon-glow active:scale-95"
            >
              <span>Checkout</span>
              <span>₹{total + delivery} →</span>
            </button>
          </div>

          {open && (
            <Checkout
              onClose={() => setOpen(false)}
              onPlaced={(orderId) => {
                clear();
                setOpen(false);
                navigate({ to: "/track/$orderId", params: { orderId } });
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

function Checkout({ onClose, onPlaced }: { onClose: () => void; onPlaced: () => void }) {
  const { items, total } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const delivery = 29;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("orders").insert({
      user_id: userData.user?.id ?? null,
      customer_name: name,
      phone,
      address,
      total: total + delivery,
      items: items as any,
      status: "pending",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSuccess(true);
    setTimeout(onPlaced, 1800);
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
        className="glass-strong w-full max-w-[480px] rounded-t-3xl p-6 pb-10"
      >
        {success ? (
          <div className="flex flex-col items-center py-10 text-center">
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
          <form onSubmit={submit} className="space-y-3">
            <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-border" />
            <h2 className="text-xl font-bold">Delivery details</h2>
            <Input label="Full name" value={name} onChange={setName} />
            <Input label="Phone" value={phone} onChange={setPhone} type="tel" />
            <Input label="Address" value={address} onChange={setAddress} textarea />
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground neon-glow disabled:opacity-50"
            >
              {loading ? "Placing..." : `Place order · ₹${total + delivery}`}
            </button>
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
