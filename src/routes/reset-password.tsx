import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PasswordStrength, isPasswordStrong } from "@/components/auth/PasswordStrength";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase recovery link puts a session in the URL hash and fires PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) return toast.error("Password does not meet all requirements");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    // Invalidate other sessions
    await supabase.auth.signOut({ scope: "others" as any }).catch(() => {});
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <MobileShell hideNav>
      <header className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link to="/auth" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Reset password</h1>
      </header>

      <div className="px-5 pt-6">
        {!ready ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            <Lock className="mx-auto mb-3 h-8 w-8 text-primary" />
            Open the password reset link from your email on this device to continue.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 glass-strong rounded-3xl p-5">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
              <PasswordStrength password={password} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </MobileShell>
  );
}
