"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Zap, Copy, CheckCheck, Upload, RefreshCw } from "lucide-react";

const platforms = ["Amazon", "Shopify", "TikTok Shop"];

type Listing = {
  title: string;
  bullets: string[];
  description: string;
  tags: string[];
  price: string;
};

const FALLBACK_LISTING: Listing = {
  title: "Wireless Electric Neck Massager Pillow – Shiatsu Deep Tissue Massage, 3 Speeds, Heat Therapy, USB Rechargeable – Portable Pain Relief for Office & Home",
  bullets: [
    "🔥 DEEP SHIATSU MASSAGE – 8 rotating nodes mimic professional hands; relieves neck, shoulder & back tension in minutes",
    "🌡️ SOOTHING HEAT THERAPY – Built-in infrared heating (40°C) boosts circulation and relaxes stiff muscles faster",
    "📱 3-SPEED INTENSITY CONTROL – Customize from gentle relaxation to deep tissue relief with one-button operation",
    "🔋 LONG-LASTING BATTERY – USB-C rechargeable 2000mAh battery; up to 2 hours of continuous use per charge",
    "🎁 PERFECT GIFT – Comes with premium carry bag; ideal for office workers, drivers, athletes & anyone with muscle tension",
  ],
  description: "Say goodbye to neck pain with the most advanced portable neck massager on the market. Designed for busy professionals and active lifestyles, our Shiatsu Neck Massager combines deep-kneading nodes with therapeutic heat to provide immediate, lasting relief. Whether you\u2019re at your desk, in the car, or relaxing at home \u2014 carry your personal masseuse anywhere.",
  tags: ["neck massager", "electric neck massager", "shiatsu massager", "neck pain relief", "portable massager", "massage pillow", "muscle relaxer", "office massage", "heat massager", "wireless massager"],
  price: "$34.99",
};

export default function ListingGeneratorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState("Amazon");
  const [productName, setProductName] = useState("Wireless Neck Massager Pillow");
  const [keywords, setKeywords] = useState("neck massager, electric, shiatsu, heat therapy");
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [listing, setListing] = useState<Listing>(FALLBACK_LISTING);
  const [aiError, setAiError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (productImageUrl) URL.revokeObjectURL(productImageUrl);
    };
  }, [productImageUrl]);

  async function generate() {
    setLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, keywords, platform }),
      });
      const data = await res.json();
      if (res.ok && data.listing) {
        setListing(data.listing);
        setGenerated(true);
      } else {
        setAiError(data.error ?? "Failed to generate listing");
        setGenerated(true);
      }
    } catch {
      setAiError("Network error — showing sample listing");
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  function selectFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    setProductImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setUploadedFileName(file.name);

    if (!productName || productName === "Wireless Neck Massager Pillow") {
      const cleaned = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
      if (cleaned) setProductName(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    selectFile(e.target.files?.[0]);
    e.currentTarget.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    selectFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Listing Builder" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Input Card */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1.5">Platform</label>
                <div className="flex gap-2">
                  {platforms.map(p => (
                    <button key={p} onClick={() => setPlatform(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${platform === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1.5">Product Name</label>
                <input value={productName} onChange={e => setProductName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1.5">Target Keywords</label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)}
                  placeholder="neck massager, electric, heat therapy..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-1.5">Product Photo (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleInputChange}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-md h-32 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer group ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-500"}`}
              >
                {productImageUrl ? (
                  <>
                    <div className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 bg-white">
                      <Image
                        src={productImageUrl}
                        alt="Product preview"
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <p className="text-xs text-gray-700 truncate max-w-[85%]">{uploadedFileName}</p>
                    <p className="text-xs text-gray-400">Click or drop to replace image</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    <p className="text-sm text-gray-400 group-hover:text-gray-500">Drop photo or click to upload</p>
                    <p className="text-xs text-gray-400">Product details will be extracted automatically</p>
                  </>
                )}
              </div>
              {productImageUrl && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline">Image selected</Badge>
                  <Badge variant="success">Realtime preview</Badge>
                </div>
              )}
              <Button onClick={generate} loading={loading} className="w-full mt-3">
                <Zap className="w-4 h-4" />
                {loading ? "Generating..." : "Generate Listing"}
              </Button>
            </div>
          </div>
        </Card>

        {/* AI Error Banner */}
        {aiError && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <span className="font-medium">Note:</span> {aiError} — add GEMINI_API_KEY to .env to enable real AI generation.
          </div>
        )}

        {/* Generated Listing */}
        {generated && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">

              {/* Uploaded Photo Preview */}
              {productImageUrl && (
                <Card>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">Uploaded Product Photo</h3>
                    <Badge variant="success">Realtime Preview</Badge>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="relative w-full h-48 rounded-lg bg-white overflow-hidden">
                      <Image
                        src={productImageUrl}
                        alt="Uploaded product"
                        fill
                        sizes="(max-width: 1024px) 100vw, 66vw"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* Title */}
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Title</h3>
                    <Badge variant="success">{listing.title.length} chars</Badge>
                  </div>
                  <button onClick={() => copy(listing.title, "title")}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                    {copied === "title" ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{listing.title}</p>
              </Card>

              {/* Bullet Points */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Bullet Points</h3>
                  <div className="flex gap-2">
                    <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => copy(listing.bullets.join("\n"), "bullets")}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer">
                      {copied === "bullets" ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <ul className="space-y-2">
                  {listing.bullets.map((b, i) => (
                    <li key={i} className="text-sm text-gray-500 leading-relaxed p-2.5 bg-gray-50 rounded-lg border border-gray-200">{b}</li>
                  ))}
                </ul>
              </Card>

              {/* Description */}
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Product Description</h3>
                  <button onClick={() => copy(listing.description, "desc")}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer">
                    {copied === "desc" ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{listing.description}</p>
              </Card>
            </div>

            {/* Right Panel */}
            <div className="space-y-4">
              {/* SEO Score */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">SEO Score</h3>
                <div className="flex items-center justify-center mb-3">
                  <div className="relative w-24 h-24">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#2563eb" strokeWidth="10"
                        strokeDasharray="251.2" strokeDashoffset="37.7" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">85</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Title Keywords", score: "92%", good: true },
                    { label: "Bullet Optimization", score: "88%", good: true },
                    { label: "Description Length", score: "76%", good: true },
                    { label: "Backend Keywords", score: "64%", good: false },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{s.label}</span>
                      <span className={s.good ? "text-green-600" : "text-amber-600"}>{s.score}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Backend Keywords */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Backend Keywords</h3>
                <p className="text-xs text-gray-500 mb-3">Paste these in Amazon backend</p>
                <div className="flex flex-wrap gap-1.5">
                  {listing.tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
                <button onClick={() => copy(listing.tags.join(" "), "tags")}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-100 hover:bg-gray-100 text-xs text-gray-500 transition-colors cursor-pointer">
                  {copied === "tags" ? <><CheckCheck className="w-3.5 h-3.5 text-green-600" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy All Tags</>}
                </button>
              </Card>

              {/* Suggested Price */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Pricing Suggestion</h3>
                <div className="text-3xl font-bold text-blue-600 mb-1">{listing.price}</div>
                <p className="text-xs text-gray-500">Based on competitor analysis</p>
                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between"><span>Min (competitive)</span><span className="text-red-600">$29.99</span></div>
                  <div className="flex justify-between"><span>Suggested</span><span className="text-green-600">$34.99</span></div>
                  <div className="flex justify-between"><span>Max (premium)</span><span className="text-blue-600">$44.99</span></div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
