import { useMemo } from "react";

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
}

export function checkPassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

export function isPasswordStrong(pw: string) {
  return Object.values(checkPassword(pw)).every(Boolean);
}

export function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(() => checkPassword(password), [password]);
  const score = Object.values(checks).filter(Boolean).length;
  const label = ["Too weak", "Weak", "Okay", "Good", "Strong", "Excellent"][score];
  const color =
    score <= 1 ? "bg-destructive" : score <= 3 ? "bg-yellow-500" : "bg-primary";

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < score ? color : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Strength: <span className="font-semibold text-foreground">{label}</span>
      </p>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
        <Rule ok={checks.length} label="8+ characters" />
        <Rule ok={checks.upper} label="Uppercase" />
        <Rule ok={checks.lower} label="Lowercase" />
        <Rule ok={checks.number} label="Number" />
        <Rule ok={checks.special} label="Special char" />
      </ul>
    </div>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={ok ? "text-primary" : "text-muted-foreground"}>
      {ok ? "✓" : "○"} {label}
    </li>
  );
}
