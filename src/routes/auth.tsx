import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Mail, ArrowRight } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cd, setCd] = useState(0);
  const cooldownRef = useRef<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/account" });
    });
  }, [navigate]);

  useEffect(() => {
    if (!cd) return;
    const id = setInterval(() => setCd((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cd]);

  const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const emailIsValid = validEmail(email);

  const sendCode = async (isResend = false) => {
    setError(null);
    const trimmed = email.trim();
    console.log("[auth] sendCode invoked", { email: trimmed, isResend });

    if (!validEmail(trimmed)) {
      console.warn("[auth] invalid email, aborting", trimmed);
      setError("Please enter a valid email address");
      return;
    }
    if (!supabase || !supabase.auth || typeof supabase.auth.signInWithOtp !== "function") {
      console.error("[auth] Supabase client not initialized correctly", supabase);
      setError("Authentication service unavailable. Please refresh and try again.");
      toast.error("Authentication service unavailable.");
      return;
    }
    if (Date.now() < cooldownRef.current) {
      console.log("[auth] cooldown active, skipping send");
      return;
    }

    setLoading(true);
    try {
      console.log("[auth] calling supabase.auth.signInWithOtp...");
      const { data, error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true },
      });
      console.log("[auth] signInWithOtp response", { data, error });

      if (error) {
        console.error("[auth] Supabase OTP error:", error);
        setError(error.message);
        toast.error(error.message);
        return;
      }
      cooldownRef.current = Date.now() + 60_000;
      setCd(60);
      setStep("otp");
      setOtp("");
      toast.success("Verification code sent to your email.");
    } catch (err: any) {
      console.error("[auth] Unexpected error sending OTP:", err);
      setError(err?.message ?? "Failed to send verification code");
      toast.error(err?.message ?? "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: "email",
      });
      if (error) {
        setError(error.message || "Invalid or expired code");
        toast.error(error.message || "Invalid or expired code");
        setOtp("");
        return;
      }
      toast.success("Signed in!");
      navigate({ to: "/" });
    } finally {
      setLoading(false);
    }
  };

  const onOtpChange = (v: string) => {
    setOtp(v);
    setError(null);
    if (v.length === 6 && !loading) verify(v);
  };

  return (
    <MobileShell hideNav>
      <header className="flex items-center gap-3 px-5 pt-6 pb-2">
        <Link to="/" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Welcome to CRAVINGS</h1>
      </header>

      <div className="px-5 pt-4">
        <button
          type="button"
          onClick={async () => {
            const res = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin + "/account",
            });
            if (res.error) toast.error(res.error.message || "Google sign-in failed");
          }}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-black shadow-lg active:scale-[0.98] transition"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="flex items-center gap-2 py-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {step === "email" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCode(false);
            }}
            className="space-y-3 glass-strong rounded-3xl p-5"
          >
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> Sign in with email code
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@example.com"
                className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !emailIsValid}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? "Sending code..." : "Send 6-digit code"}
            </button>
            <p className="pt-1 text-center text-[10px] text-muted-foreground">
              We'll email you a 6-digit verification code. No password needed.
            </p>
          </form>
        ) : (
          <div className="space-y-4 glass-strong rounded-3xl p-5">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> Enter verification code
              </div>
              <p className="text-xs text-muted-foreground">
                Sent to <span className="font-semibold text-foreground">{email}</span>
              </p>
            </div>

            <div className="flex justify-center py-2">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={onOtpChange}
                disabled={loading}
                autoFocus
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-12 w-11 rounded-xl border border-border bg-background/40 text-lg font-bold"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
              </div>
            )}
            {error && <p className="text-center text-xs text-destructive">{error}</p>}

            <button
              type="button"
              onClick={() => verify(otp)}
              disabled={loading || otp.length < 6}
              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & sign in"}
            </button>

            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Change email
              </button>
              <button
                type="button"
                onClick={() => sendCode(true)}
                disabled={cd > 0 || loading}
                className="text-primary disabled:text-muted-foreground disabled:opacity-60"
              >
                {cd > 0 ? `Resend in ${cd}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l6-5.8C34.6 3.3 29.8 1 24 1 14.8 1 6.9 6.3 3.1 14l7 5.5C12.1 13.5 17.5 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.6-4.9 7.3l7.5 5.8c4.4-4.1 7.2-10.1 7.2-17.4z"/>
      <path fill="#FBBC05" d="M10.1 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7-5.5C1.4 17 0 20.4 0 24s1.4 7 3.1 10l7-5.5z"/>
      <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2 1.4-4.6 2.3-8.4 2.3-6.5 0-12-4.4-13.9-10.3l-7 5.5C6.9 41.7 14.8 47 24 47z"/>
    </svg>
  );
}
