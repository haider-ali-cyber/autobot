"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Search, AlertCircle, Mail, Copy, CheckCircle, ChevronDown, ChevronUp, Download } from "lucide-react";

interface Email {
  step: number;
  sendTiming: string;
  subject: string;
  preheader: string;
  body: string;
  cta: string;
  goal: string;
}

interface EmailData {
  product: string;
  sequenceType: string;
  tone: string;
  emails: Email[];
  tips: string[];
}

const SEQUENCE_TYPES = [
  "Product Launch",
  "Post-Purchase",
  "Abandoned Cart",
  "Welcome Series",
  "Re-engagement",
];

const TONES = ["Professional", "Friendly", "Urgent", "Luxury", "Playful"];

function exportEmails(data: EmailData) {
  let text = `EMAIL SEQUENCE: ${data.sequenceType}\nProduct: ${data.product}\nTone: ${data.tone}\n\n`;
  for (const email of data.emails) {
    text += `═══════════════════════════════════\nEMAIL ${email.step} — ${email.sendTiming}\n═══════════════════════════════════\n`;
    text += `Subject: ${email.subject}\nPreheader: ${email.preheader}\n\n${email.body}\n\nCTA: ${email.cta}\nGoal: ${email.goal}\n\n`;
  }
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `email-sequence-${data.product.replace(/\s+/g, "-")}.txt`; a.click();
  URL.revokeObjectURL(url);
}

export default function EmailGeneratorPage() {
  const [product, setProduct] = useState("");
  const [sequenceType, setSequenceType] = useState("Product Launch");
  const [tone, setTone] = useState("Professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmailData | null>(null);
  const [openEmail, setOpenEmail] = useState<number>(0);
  const [copied, setCopied] = useState<number | null>(null);

  async function handleGenerate() {
    const p = product.trim();
    if (!p) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/email-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: p, sequenceType, tone }),
      });
      const json = await res.json() as EmailData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setOpenEmail(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  function copyEmail(email: Email, idx: number) {
    const text = `Subject: ${email.subject}\nPreheader: ${email.preheader}\n\n${email.body}\n\nCTA: ${email.cta}`;
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Email Sequence Generator" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Config */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={product} onChange={e => setProduct(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
                placeholder='Product e.g. "Yoga Mat", "LED Lamp"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select value={sequenceType} onChange={e => setSequenceType(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              {SEQUENCE_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={tone} onChange={e => setTone(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              {TONES.map(t => <option key={t}>{t}</option>)}
            </select>
            <Button onClick={handleGenerate} loading={loading} size="sm">
              <Zap className="w-3.5 h-3.5" /> Generate
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Writing email sequence with AI...</span>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Enter a product, choose your sequence type and tone, then click Generate.
          </div>
        )}

        {!loading && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Emails */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{data.emails.length}-Email {data.sequenceType} Sequence</h3>
                  <Badge variant="blue">{data.tone}</Badge>
                </div>
                <Button size="sm" variant="secondary" onClick={() => exportEmails(data)}>
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
              </div>

              {data.emails.map((email, i) => (
                <Card key={i} className="p-0 overflow-hidden">
                  <button
                    onClick={() => setOpenEmail(openEmail === i ? -1 : i)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs text-gray-400">{email.sendTiming}</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{email.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant="outline">{email.cta}</Badge>
                      {openEmail === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {openEmail === i && (
                    <div className="border-t border-gray-100 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-400 mb-0.5">Subject Line</p>
                          <p className="text-sm font-medium text-gray-900">{email.subject}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-400 mb-0.5">Preheader</p>
                          <p className="text-sm text-gray-700">{email.preheader}</p>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Email Body</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{email.body}</p>
                        <div className="mt-3 inline-block bg-blue-600 text-white text-xs font-bold px-5 py-2 rounded-full">
                          {email.cta.toUpperCase()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-blue-600 flex items-center gap-1">
                          <span className="text-gray-400">Goal:</span> {email.goal}
                        </p>
                        <Button size="sm" variant="secondary" onClick={() => copyEmail(email, i)}>
                          {copied === i ? <><CheckCircle className="w-3 h-3 text-green-600" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Email</>}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Right: Tips + Timeline */}
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Sequence Timeline</h3>
                <div className="space-y-3">
                  {data.emails.map((email, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-blue-600">{i + 1}</span>
                        </div>
                        {i < data.emails.length - 1 && <div className="w-px h-6 bg-gray-200 mt-1" />}
                      </div>
                      <div className="pb-1">
                        <p className="text-xs font-medium text-gray-900">{email.sendTiming}</p>
                        <p className="text-xs text-gray-400 truncate">{email.goal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {data.tips.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Expert Tips</h3>
                  <ul className="space-y-2.5">
                    {data.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">✓</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <Card className="bg-blue-50 border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-2">What is this sequence for?</p>
                <p className="text-xs text-blue-600">{sequenceType} sequence for <span className="font-semibold">{data.product}</span> — {data.emails.length} emails ready to send.</p>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
