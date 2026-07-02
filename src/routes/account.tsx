import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, Package, Shield, User as UserIcon, Camera, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({ component: Account });

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  items: any;
}

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const resolveAvatar = async (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };

  const loadUser = async (u: User) => {
    const [{ data: roles }, { data: prof }, { data: ord }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.id),
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      supabase.from("orders").select("id,total,status,created_at,items").order("created_at", { ascending: false }).limit(10),
    ]);
    setIsAdmin(!!roles?.find((r) => r.role === "admin"));
    const p = (prof as Profile | null) ?? null;
    setProfile(p);
    setFullName(p?.full_name ?? (u.user_metadata?.full_name as string) ?? "");
    setPhone(p?.phone ?? (u.user_metadata?.phone as string) ?? "");
    setAvatarUrl(await resolveAvatar(p?.avatar_url ?? null));
    setOrders((ord || []) as Order[]);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) await loadUser(data.user);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email, full_name: fullName.trim(), phone: phone.trim(), updated_at: new Date().toISOString() });
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    await loadUser(user);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Image must be under 3MB");
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("profiles").upsert({ id: user.id, avatar_url: path, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success("Photo updated");
      await loadUser(user);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOrders([]);
    toast.success("Signed out");
  };

  return (
    <MobileShell>
      <header className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link to="/" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Account</h1>
      </header>

      {loading ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading...</p>
      ) : !user ? (
        <div className="px-5 pt-8">
          <div className="glass-strong rounded-3xl p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <UserIcon className="h-7 w-7 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-bold">Sign in to track orders</h2>
            <p className="mt-1 text-sm text-muted-foreground">Save your address, view order history, get faster checkout.</p>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="mt-5 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow"
            >
              Sign in / Sign up
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 px-5 pt-4">
          <div className="glass-strong rounded-3xl p-5">
            <div className="flex items-center gap-4">
              <label className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full bg-primary/15">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-primary">
                    <UserIcon className="h-7 w-7" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/60 py-0.5 text-[9px] font-bold text-white">
                  {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Camera className="mr-0.5 h-2.5 w-2.5" />Edit</>}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{profile?.full_name || user.email}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Member since {new Date(profile?.created_at || user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Full name</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="glass w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  className="glass w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground neon-glow disabled:opacity-50"
              >
                {savingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save profile
              </button>
            </div>
          </div>


          {isAdmin && (
            <Link to="/admin" className="glass-strong flex items-center gap-3 rounded-2xl p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Admin Dashboard</p>
                <p className="text-xs text-muted-foreground">Manage menu & orders</p>
              </div>
              <span className="text-primary">→</span>
            </Link>
          )}

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Package className="h-4 w-4 text-primary" /> Recent orders
            </h3>
            {orders.length === 0 ? (
              <p className="glass rounded-2xl p-4 text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <Link
                    key={o.id}
                    to="/track/$orderId"
                    params={{ orderId: o.id }}
                    className="glass block rounded-2xl p-4 transition-transform active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()}
                      </p>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      {Array.isArray(o.items) ? o.items.length : 0} items · <span className="font-bold neon-text">₹{Number(o.total)}</span>
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-primary">Track live →</p>
                  </Link>
                ))}

              </div>
            )}
          </div>

          <button
            onClick={signOut}
            className="glass flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </MobileShell>
  );
}
