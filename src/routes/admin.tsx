import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MenuItem, Category } from "@/lib/types";

export const Route = createFileRoute("/admin")({ component: AdminPage });

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  status: string;
  created_at: string;
  items: any;
}

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<"menu" | "orders">("menu");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const admin = !!roles?.find((r) => r.role === "admin");
      setAuthorized(admin);
      setChecking(false);
      if (admin) refresh();
    })();
  }, [navigate]);

  const refresh = async () => {
    const [{ data: m }, { data: o }] = await Promise.all([
      supabase.from("menu_items").select("*").order("category").order("name"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setItems((m || []) as MenuItem[]);
    setOrders((o || []) as Order[]);
  };

  const toggleAvailable = async (item: MenuItem) => {
    const { error } = await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  const save = async (item: Partial<MenuItem>) => {
    if (!item.name || !item.price || !item.category) {
      toast.error("Fill name, price, category");
      return;
    }
    const payload = {
      name: item.name,
      description: item.description ?? "",
      price: Number(item.price),
      category: item.category,
      image_url: item.image_url ?? null,
      is_available: item.is_available ?? true,
      is_bestseller: item.is_bestseller ?? false,
      is_special: item.is_special ?? false,
    };
    const { error } = item.id
      ? await supabase.from("menu_items").update(payload).eq("id", item.id)
      : await supabase.from("menu_items").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    refresh();
  };

  const updateOrder = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  if (checking) return <MobileShell><p className="px-5 pt-10 text-center text-sm text-muted-foreground">Checking access...</p></MobileShell>;
  if (!authorized) {
    return (
      <MobileShell>
        <div className="flex items-center gap-3 px-5 pt-6 pb-2">
          <Link to="/account" className="glass flex h-10 w-10 items-center justify-center rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold">Admin</h1>
        </div>
        <div className="glass m-5 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold">You don't have admin access.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            To grant yourself admin: open the backend, go to the user_roles table and insert a row with your user_id and role = "admin".
          </p>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link to="/account" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Admin</h1>
      </header>

      <div className="mx-5 mt-3 grid grid-cols-2 gap-2 rounded-2xl glass p-1">
        {(["menu", "orders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "menu" && (
        <div className="space-y-3 px-5 pt-4">
          <button
            onClick={() => setEditing({ category: "meals", is_available: true })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground neon-glow"
          >
            <Plus className="h-4 w-4" strokeWidth={3} /> Add new item
          </button>

          {items.map((it) => (
            <div key={it.id} className="glass flex gap-3 rounded-2xl p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xl">🍛</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-semibold">{it.name}</p>
                  <span className="text-xs neon-text">₹{Number(it.price)}</span>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.category}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => toggleAvailable(it)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      it.is_available ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {it.is_available ? "Available" : "Out of stock"}
                  </button>
                  <button onClick={() => setEditing(it)} className="rounded-full bg-surface-elevated p-1.5">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button onClick={() => remove(it.id)} className="rounded-full bg-surface-elevated p-1.5 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-3 px-5 pt-4">
          {orders.length === 0 && <p className="text-center text-sm text-muted-foreground">No orders.</p>}
          {orders.map((o) => (
            <div key={o.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.phone}</p>
                </div>
                <p className="text-sm font-bold neon-text">₹{Number(o.total)}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{o.address}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {Array.isArray(o.items) ? o.items.map((i: any) => `${i.name} x${i.qty}`).join(", ") : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["pending", "preparing", "out_for_delivery", "delivered", "cancelled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateOrder(o.id, s)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                      o.status === s ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
                    }`}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <EditModal item={editing} onClose={() => setEditing(null)} onSave={save} />}
    </MobileShell>
  );
}

function EditModal({
  item, onClose, onSave,
}: { item: Partial<MenuItem>; onClose: () => void; onSave: (i: Partial<MenuItem>) => void }) {
  const [draft, setDraft] = useState<Partial<MenuItem>>(item);
  const set = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="glass-strong w-full max-w-[480px] rounded-t-3xl p-5 pb-10">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{item.id ? "Edit item" : "New item"}</h2>
          <button onClick={onClose} className="p-1"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
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
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Toggle label="Available" value={draft.is_available ?? true} onChange={(v) => set("is_available", v)} />
            <Toggle label="Bestseller" value={draft.is_bestseller ?? false} onChange={(v) => set("is_bestseller", v)} />
            <Toggle label="Special" value={draft.is_special ?? false} onChange={(v) => set("is_special", v)} />
          </div>
          <button
            onClick={() => onSave(draft)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow"
          >
            <Check className="h-4 w-4" strokeWidth={3} /> Save
          </button>
        </div>
      </div>
    </div>
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
    >
      {label}
    </button>
  );
}
