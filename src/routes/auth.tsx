import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/account" },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created!");
      navigate({ to: "/account" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/account" });
    }
  };

  return (
    <MobileShell>
      <header className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link to="/account" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">{mode === "in" ? "Sign in" : "Create account"}</h1>
      </header>

      <form onSubmit={submit} className="space-y-3 px-5 pt-6">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Password</span>
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
          className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "in" ? "Sign in" : "Sign up"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="w-full py-2 text-center text-xs text-muted-foreground"
        >
          {mode === "in" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </MobileShell>
  );
}
