import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Mail, Phone, KeyRound } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { PasswordStrength, isPasswordStrong } from "@/components/auth/PasswordStrength";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type Tab = "password" | "email-otp" | "phone-otp";
type PwMode = "in" | "up" | "forgot";

// Simple client-side rate limit for password login
const ATTEMPTS_KEY = "cravings_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

function getLock(): number {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return 0;
    const { count, ts } = JSON.parse(raw);
    if (count >= MAX_ATTEMPTS && Date.now() - ts < LOCK_MS) return LOCK_MS - (Date.now() - ts);
  } catch {}
  return 0;
}
function bumpAttempts(reset = false) {
  if (reset) return localStorage.removeItem(ATTEMPTS_KEY);
  const raw = localStorage.getItem(ATTEMPTS_KEY);
  const cur = raw ? JSON.parse(raw) : { count: 0, ts: Date.now() };
  cur.count += 1;
  cur.ts = Date.now();
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(cur));
}

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("password");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/account" });
    });
  }, [navigate]);

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

        <div className="glass mt-2 grid grid-cols-3 gap-1 rounded-2xl p-1">
          {(
            [
              { k: "password", i: <KeyRound className="h-3.5 w-3.5" />, l: "Password" },
              { k: "email-otp", i: <Mail className="h-3.5 w-3.5" />, l: "Email OTP" },
              { k: "phone-otp", i: <Phone className="h-3.5 w-3.5" />, l: "Phone OTP" },
            ] as { k: Tab; i: React.ReactNode; l: string }[]
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold transition ${
                tab === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t.i} {t.l}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "password" && <PasswordForm />}
          {tab === "email-otp" && <EmailOtpForm />}
          {tab === "phone-otp" && <PhoneOtpForm />}
        </div>
      </div>
    </MobileShell>
  );
}

/* ---------------------- Password (sign in / sign up / forgot) ---------------------- */
function PasswordForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<PwMode>("in");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lockedFor = getLock();
    if (mode === "in" && lockedFor > 0) {
      return toast.error(`Too many attempts. Try again in ${Math.ceil(lockedFor / 60000)} min.`);
    }

    setLoading(true);
    try {
      if (mode === "up") {
        if (!fullName.trim()) return toast.error("Enter your full name");
        if (!isPasswordStrong(password)) return toast.error("Password does not meet requirements");
        if (password !== confirm) return toast.error("Passwords do not match");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/account",
            data: { full_name: fullName.trim(), phone: phone.trim() },
          },
        });
        if (error) return toast.error(error.message);
        toast.success("Check your email to verify your account.");
        setMode("in");
      } else if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          bumpAttempts();
          if (error.message.toLowerCase().includes("email not confirmed")) {
            return toast.error("Please verify your email. Check your inbox.");
          }
          return toast.error(error.message);
        }
        bumpAttempts(true);
        toast.success("Welcome back!");
        navigate({ to: "/" });
      } else {
        // forgot
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) return toast.error(error.message);
        toast.success("Password reset link sent. Check your email.");
        setMode("in");
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerify = async () => {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) return toast.error(error.message);
    toast.success("Verification email sent.");
  };

  return (
    <form onSubmit={submit} className="space-y-3 glass-strong rounded-3xl p-5">
      {mode === "up" && (
        <>
          <Field label="Full name" value={fullName} onChange={setFullName} required />
          <Field label="Phone number" value={phone} onChange={setPhone} type="tel" placeholder="+91 98765 43210" />
        </>
      )}
      <Field label="Email" value={email} onChange={setEmail} type="email" required />
      {mode !== "forgot" && (
        <>
          <Field label="Password" value={password} onChange={setPassword} type="password" required minLength={8} />
          {mode === "up" && <PasswordStrength password={password} />}
          {mode === "up" && (
            <Field label="Confirm password" value={confirm} onChange={setConfirm} type="password" required minLength={8} />
          )}
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
      </button>

      <div className="flex flex-col items-center gap-1 pt-1 text-[11px]">
        {mode === "in" && (
          <>
            <button type="button" onClick={() => setMode("forgot")} className="text-primary">
              Forgot password?
            </button>
            <button type="button" onClick={() => setMode("up")} className="text-muted-foreground">
              Don't have an account? <span className="text-foreground">Sign up</span>
            </button>
            <button type="button" onClick={resendVerify} className="text-muted-foreground">
              Didn't get verification email? <span className="text-foreground">Resend</span>
            </button>
          </>
        )}
        {mode === "up" && (
          <button type="button" onClick={() => setMode("in")} className="text-muted-foreground">
            Already have an account? <span className="text-foreground">Sign in</span>
          </button>
        )}
        {mode === "forgot" && (
          <button type="button" onClick={() => setMode("in")} className="text-muted-foreground">
            Back to <span className="text-foreground">Sign in</span>
          </button>
        )}
      </div>
    </form>
  );
}

/* ---------------------- Email OTP ---------------------- */
function EmailOtpForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const cooldownRef = useRef<number>(0);
  const [cd, setCd] = useState(0);

  useEffect(() => {
    if (!cd) return;
    const id = setInterval(() => setCd((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cd]);

  const send = async () => {
    if (Date.now() < cooldownRef.current) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + "/account" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    cooldownRef.current = Date.now() + 60_000;
    setCd(60);
    setSent(true);
    toast.success("6-digit code sent to your email.");
  };

  const verify = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in!");
    navigate({ to: "/" });
  };

  return (
    <div className="space-y-3 glass-strong rounded-3xl p-5">
      <Field label="Email" value={email} onChange={setEmail} type="email" required />
      {sent && <Field label="6-digit code" value={otp} onChange={setOtp} inputMode="numeric" maxLength={6} />}
      {!sent ? (
        <button
          onClick={send}
          disabled={loading || !email}
          className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send code"}
        </button>
      ) : (
        <>
          <button
            onClick={verify}
            disabled={loading || otp.length < 6}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & sign in"}
          </button>
          <button
            onClick={send}
            disabled={cd > 0 || loading}
            className="w-full text-center text-[11px] text-muted-foreground disabled:opacity-50"
          >
            {cd > 0 ? `Resend in ${cd}s` : "Resend code"}
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------------- Phone OTP ---------------------- */
function PhoneOtpForm() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cd, setCd] = useState(0);

  useEffect(() => {
    if (!cd) return;
    const id = setInterval(() => setCd((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cd]);

  const send = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("sms") || error.message.toLowerCase().includes("provider")) {
        return toast.error("SMS provider not configured. Ask the admin to enable phone auth.");
      }
      return toast.error(error.message);
    }
    setSent(true);
    setCd(60);
    toast.success("Code sent via SMS.");
  };

  const verify = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in!");
    navigate({ to: "/" });
  };

  return (
    <div className="space-y-3 glass-strong rounded-3xl p-5">
      <Field label="Phone (with country code)" value={phone} onChange={setPhone} type="tel" placeholder="+919876543210" required />
      {sent && <Field label="6-digit code" value={otp} onChange={setOtp} inputMode="numeric" maxLength={6} />}
      {!sent ? (
        <button
          onClick={send}
          disabled={loading || !phone}
          className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send SMS code"}
        </button>
      ) : (
        <>
          <button
            onClick={verify}
            disabled={loading || otp.length < 6}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground neon-glow disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & sign in"}
          </button>
          <button
            onClick={send}
            disabled={cd > 0 || loading}
            className="w-full text-center text-[11px] text-muted-foreground disabled:opacity-50"
          >
            {cd > 0 ? `Resend in ${cd}s` : "Resend code"}
          </button>
        </>
      )}
      <p className="text-center text-[10px] text-muted-foreground">
        Requires SMS provider in backend auth settings.
      </p>
    </div>
  );
}

/* ---------------------- Bits ---------------------- */
function Field({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        {...rest}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
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
