"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { CheckCircle, RefreshCw } from "lucide-react";

const CODE_LENGTH = 6;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const password = searchParams.get("pw") ?? "";
  const devCode = searchParams.get("devCode") ?? "";

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    if (devCode) {
      const parts = devCode.split("");
      setDigits(parts.concat(Array(CODE_LENGTH - parts.length).fill("")));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  

  function handleChange(i: number, val: string) {
    const cleaned = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    setError("");
    if (cleaned && i < CODE_LENGTH - 1) {
      inputRefs.current[i + 1]?.focus();
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) { setError("Enter all 6 digits"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Verification failed"); return; }

      setVerified(true);

      if (password) {
        const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
        if (result?.url) { router.push(result.url); return; }
      }
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResent(false);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({})) as { devCode?: string };
      if (data.devCode) {
        const parts = data.devCode.split("");
        setDigits(parts.concat(Array(CODE_LENGTH - parts.length).fill("")));
        setResent(true);
      } else {
        setResent(true);
        setTimeout(() => setResent(false), 4000);
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-base">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Sellora</span>
          </Link>
          {verified ? (
            <>
              <div className="flex items-center justify-center mb-3">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Email verified!</h1>
              <p className="text-sm text-gray-500 mt-1">Signing you in…</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
              <p className="text-sm text-gray-500 mt-1">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-gray-700">{email || "your email"}</span>
              </p>
            </>
          )}
        </div>

        {!verified && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`w-11 h-12 text-center text-lg font-semibold border rounded-xl focus:outline-none transition-colors ${
                    d ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-900"
                  } focus:border-blue-500`}
                />
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-center">
                {error}
              </p>
            )}

            {devCode && (
              <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
                <p className="font-semibold text-amber-800 mb-0.5">⚙️ Dev mode — SMTP not configured</p>
                <p className="text-amber-700">Code auto-filled: <span className="font-mono font-bold tracking-widest">{devCode}</span></p>
              </div>
            )}

            {resent && (
              <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4 text-center">
                {digits.join("").length === CODE_LENGTH ? "✓ Code auto-filled — click Verify Email" : "New code sent to your email!"}
              </p>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || digits.join("").length < CODE_LENGTH}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl py-2.5 text-sm transition-colors cursor-pointer"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : "Verify Email"}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-4">
              <span className="text-xs text-gray-400">Didn&apos;t receive it?</span>
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Sending…" : "Resend code"}
              </button>
            </div>
          </div>
        )}

        <p className="text-center mt-5">
          <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
