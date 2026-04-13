"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setSent(true);
      if (data.devUrl) setDevUrl(data.devUrl);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
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
          {sent ? (
            <>
              <div className="flex items-center justify-center mb-3">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
              <p className="text-sm text-gray-500 mt-1">
                We sent a reset link to <span className="font-medium text-gray-700">{email}</span>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
              <p className="text-sm text-gray-500 mt-1">
                Enter your email and we&apos;ll send a reset link
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {sent ? (
            <div className="space-y-3">
              {devUrl && (
                <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <p className="font-semibold text-amber-800 mb-1">⚙️ Dev mode — SMTP not configured</p>
                  <Link
                    href={devUrl}
                    className="text-blue-600 underline break-all font-mono text-xs"
                  >
                    Click to reset password
                  </Link>
                </div>
              )}
              <p className="text-xs text-gray-500 text-center">
                Didn&apos;t get it?{" "}
                <button
                  onClick={() => { setSent(false); setDevUrl(""); }}
                  className="text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="ali@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-xl py-2.5 text-sm transition-colors cursor-pointer"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><span>Send reset link</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-5">
          <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
