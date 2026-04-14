"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload, Wand2, Download, AlertCircle, Sparkles } from "lucide-react";

interface AdCopy {
  productName: string;
  headline: string;
  tagline: string;
  cta: string;
  features: string[];
  bgColor: string;
  textColor: string;
  accentColor: string;
  badgeText: string;
  targetAudience: string;
  platform: string;
}

const TEMPLATES = [
  { id: "amazon",    label: "Amazon",    color: "#232f3e", accent: "#ff9900", desc: "Amazon product listing" },
  { id: "tiktok",    label: "TikTok",    color: "#010101", accent: "#fe2c55", desc: "TikTok viral style" },
  { id: "shopify",   label: "Shopify",   color: "#1a1a2e", accent: "#5c6bc0", desc: "Shopify store ad" },
  { id: "instagram", label: "Instagram", color: "#833ab4", accent: "#fd1d1d", desc: "Instagram story/feed" },
];

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawAd(canvas: HTMLCanvasElement, img: HTMLImageElement, ad: AdCopy) {
  const W = 1080, H = 1080;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bg = ad.bgColor || "#1a1a2e";
  const fg = ad.textColor || "#ffffff";
  const accent = ad.accentColor || "#5c6bc0";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, W * 0.8);
  grad.addColorStop(0, hexToRgba(accent, 0.25));
  grad.addColorStop(1, hexToRgba(bg, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const imgSize = 480;
  const imgX = (W - imgSize) / 2;
  const imgY = 200;
  const aspect = img.naturalWidth / img.naturalHeight;
  let dw = imgSize, dh = imgSize;
  if (aspect > 1) { dh = imgSize / aspect; } else { dw = imgSize * aspect; }
  const dx = imgX + (imgSize - dw) / 2;
  const dy = imgY + (imgSize - dh) / 2;

  ctx.shadowColor = hexToRgba(accent, 0.5);
  ctx.shadowBlur = 60;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.shadowBlur = 0;

  const badgePad = 18;
  const badgeH = 38;
  const badgeText = ad.badgeText.toUpperCase();
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  const badgeW = ctx.measureText(badgeText).width + badgePad * 2;
  const badgeX = 54;
  const badgeY = 54;
  ctx.fillStyle = accent;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.font = `bold 68px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = fg;
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 8;
  const headline = ad.headline.toUpperCase();
  wrapText(ctx, headline, W / 2, 716, W - 100, 76);
  ctx.shadowBlur = 0;

  ctx.font = `26px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = hexToRgba(fg, 0.82);
  wrapText(ctx, ad.tagline, W / 2, 832, W - 120, 32);

  const featY = 900;
  const features = ad.features.slice(0, 3);
  const featSpacing = (W - 120) / features.length;
  features.forEach((feat, i) => {
    const fx = 60 + i * featSpacing + featSpacing / 2;
    ctx.font = `bold 20px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = accent;
    ctx.fillText("✓", fx - ctx.measureText(feat).width / 2 - 14, featY);
    ctx.fillStyle = hexToRgba(fg, 0.9);
    ctx.font = `18px system-ui, -apple-system, sans-serif`;
    ctx.fillText(feat, fx + 6, featY);
  });

  const ctaW = 260, ctaH = 56;
  const ctaX = (W - ctaW) / 2;
  const ctaY = 964;
  ctx.fillStyle = accent;
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 28);
  ctx.font = `bold 22px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ad.cta.toUpperCase(), W / 2, ctaY + ctaH / 2);

  ctx.textAlign = "left";
  ctx.font = `18px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = hexToRgba(fg, 0.4);
  ctx.textBaseline = "top";
  ctx.fillText(ad.productName, 60, H - 44);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineH;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, curY);
}

export default function PhotoAdPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [template, setTemplate] = useState("amazon");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ad, setAd] = useState<AdCopy | null>(null);

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); };
  }, [imageUrl]);

  const renderAdOnCanvas = useCallback((adData: AdCopy, file: File) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => { drawAd(canvas, img, adData); };
    img.src = URL.createObjectURL(file);
  }, []);

  function selectFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) { setError("File too large (max 10MB)"); return; }
    setAd(null);
    setError(null);
    setImageFile(file);
    setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragOver(false); selectFile(e.dataTransfer.files?.[0]);
  }

  async function generateAd() {
    if (!imageFile) return;
    setGenerating(true);
    setError(null);
    setAd(null);
    try {
      const base64 = await fileToBase64(imageFile);
      const res = await fetch("/api/ai/photo-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: imageFile.type, template }),
      });
      const json = await res.json() as { ok?: boolean; ad?: AdCopy; error?: string };
      if (!res.ok || !json.ad) throw new Error(json.error ?? "Failed to generate ad");
      setAd(json.ad);
      renderAdOnCanvas(json.ad, imageFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function downloadAd() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `sellora-ad-${template}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const selectedTpl = TEMPLATES.find(t => t.id === template) ?? TEMPLATES[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="AI Ad Creator" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Upload + Settings */}
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" /> Upload Product Photo
              </h3>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { selectFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl h-44 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-500 hover:bg-blue-50/30"}`}
              >
                {imageUrl ? (
                  <>
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                      <NextImage src={imageUrl} alt="Product" fill sizes="96px" className="object-contain" unoptimized />
                    </div>
                    <p className="text-xs text-gray-500">Photo selected · Click to replace</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                      <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-500">Drop product image here</p>
                    <p className="text-xs text-gray-400">PNG, JPG, WebP · Max 10MB</p>
                  </>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Ad Template</h3>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setTemplate(t.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${template === t.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
                  >
                    <div className="w-full h-8 rounded mb-1.5 flex items-center justify-center" style={{ background: t.color }}>
                      <div className="w-4 h-1.5 rounded-full" style={{ background: t.accent }} />
                    </div>
                    <p className={`text-xs font-medium ${template === t.id ? "text-blue-600" : "text-gray-800"}`}>{t.label}</p>
                    <p className="text-xs text-gray-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </Card>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
              </div>
            )}

            <Button onClick={generateAd} loading={generating} disabled={!imageFile} className="w-full">
              <Sparkles className="w-4 h-4" />
              {generating ? "Analyzing & Generating Ad..." : "Generate Professional Ad"}
            </Button>
          </div>

          {/* Right: Canvas Preview */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {ad ? `${ad.productName} · ${selectedTpl.label} Ad` : "Ad Preview"}
                </h3>
                {ad && (
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Ready</Badge>
                    <Button size="sm" variant="success" onClick={downloadAd}>
                      <Download className="w-3.5 h-3.5" /> Download PNG
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center" style={{ minHeight: "420px" }}>
                {generating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-blue-400">AI analyzing product...</p>
                    <p className="text-xs text-gray-500 mt-1">Gemini Vision is reading your image</p>
                  </div>
                )}

                {!ad && !generating && (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-8">
                    <Wand2 className="w-12 h-12 text-gray-600 mb-3" />
                    <p className="text-sm text-gray-400">Upload a product photo and click</p>
                    <p className="text-sm text-gray-300 font-medium">Generate Professional Ad</p>
                    <p className="text-xs text-gray-500 mt-2">Gemini Vision AI will analyze your product<br/>and create a platform-optimized ad</p>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  className={`w-full h-auto rounded-xl ${ad ? "block" : "hidden"}`}
                  style={{ maxHeight: "600px", objectFit: "contain" }}
                />
              </div>
            </Card>

            {ad && (
              <Card>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" /> AI-Generated Ad Copy
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Headline", value: ad.headline },
                    { label: "Tagline", value: ad.tagline },
                    { label: "CTA", value: ad.cta },
                    { label: "Badge", value: ad.badgeText },
                    { label: "Target Audience", value: ad.targetAudience },
                    { label: "Platform", value: ad.platform },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                {ad.features.length > 0 && (
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-2">Key Features</p>
                    <div className="flex gap-2 flex-wrap">
                      {ad.features.map((f, i) => <Badge key={i} variant="blue">{f}</Badge>)}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
