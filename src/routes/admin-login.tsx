import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-login")({ component: AdminLoginPage });

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      return toast.error(error?.message ?? "Login failed");
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const hasAccess = !!roles?.find((r) => r.role === "admin" || r.role === "staff");
    setLoading(false);
    if (!hasAccess) {
      await supabase.auth.signOut();
      return toast.error("You don't have admin access");
    }
    toast.success("Welcome back");
    navigate({ to: "/admin" });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] hero-radial opacity-70" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

      <Link
        to="/"
        className="absolute left-5 top-5 z-10 glass flex h-10 w-10 items-center justify-center rounded-full"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[440px] flex-col items-center justify-center px-6 py-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary neon-glow">
          <ShieldCheck className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Admin Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cravings staff & admin only</p>

        <form onSubmit={submit} className="mt-8 w-full space-y-3 glass-strong rounded-3xl p-6">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Sign in to dashboard"}
          </button>
          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            Customer login is on the{" "}
            <Link to="/auth" className="text-primary underline">main login page</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
