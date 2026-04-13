"use client";
import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload, Wand2, Download, Layers, Zap, CheckCircle } from "lucide-react";

const enhancements = [
  { id: "bg-remove", label: "Background Remover", desc: "White/transparent background (Amazon compliant)", icon: Layers },
  { id: "lifestyle", label: "Lifestyle Image AI", desc: "Place product in room/lifestyle scene", icon: ImageIcon },
  { id: "infographic", label: "Infographic Creator", desc: "Add feature callouts & badges", icon: Zap },
  { id: "enhance", label: "Photo Enhancer", desc: "Fix lighting, sharpness & colors", icon: Wand2 },
];

const templates = [
  { name: "White Background", platform: "Amazon", desc: "Pure white, 85% fill", popular: true },
  { name: "Lifestyle Room", platform: "Shopify", desc: "Modern living room scene", popular: false },
  { name: "TikTok Thumbnail", platform: "TikTok", desc: "Bold text + product overlay", popular: true },
  { name: "Infographic 6-Feature", platform: "Amazon", desc: "6 feature callout boxes", popular: false },
  { name: "Comparison Chart", platform: "All", desc: "Your product vs competitors", popular: false },
  { name: "Lifestyle Office", platform: "All", desc: "Clean desk workspace scene", popular: false },
];

export default function PhotoEnhancerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>(["bg-remove"]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  function selectFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return;

    setDone(false);
    setProcessing(false);
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
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

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function process() {
    if (!imageUrl) return;
    setProcessing(true);
    setDone(false);
    setTimeout(() => { setProcessing(false); setDone(true); }, 2200);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Image Editor" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Upload + Controls */}
          <div className="space-y-4">
            {/* Upload */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" /> Upload Photo
              </h3>
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
                className={`border-2 border-dashed rounded-md h-40 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer group mb-3 ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-500"}`}
              >
                {imageUrl ? (
                  <>
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white">
                      <NextImage
                        src={imageUrl}
                        alt="Uploaded preview"
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <p className="text-sm text-gray-700">Photo selected</p>
                    <p className="text-xs text-gray-400">Click or drop another image to replace</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-md bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                      <ImageIcon className="w-6 h-6 text-gray-500 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="text-sm text-gray-500">Drop image or click to upload</p>
                    <p className="text-xs text-gray-400">PNG, JPG, WebP up to 10MB</p>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 text-center">Single image realtime preview enabled</p>
            </Card>

            {/* Enhancement Options */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Enhancements</h3>
              <div className="space-y-2">
                {enhancements.map(e => (
                  <button key={e.id} onClick={() => toggle(e.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${selected.includes(e.id) ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200 hover:border-gray-200"}`}
                  >
                    <e.icon className={`w-4 h-4 mt-0.5 shrink-0 ${selected.includes(e.id) ? "text-blue-600" : "text-gray-500"}`} />
                    <div>
                      <p className={`text-sm font-medium ${selected.includes(e.id) ? "text-blue-600" : "text-gray-900"}`}>{e.label}</p>
                      <p className="text-xs text-gray-400">{e.desc}</p>
                    </div>
                    {selected.includes(e.id) && <CheckCircle className="w-4 h-4 text-blue-600 ml-auto shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
              <Button onClick={process} loading={processing} className="w-full mt-3" disabled={!imageUrl}>
                <Wand2 className="w-4 h-4" />
                {processing ? "Processing..." : `Apply ${selected.length} Enhancement${selected.length !== 1 ? "s" : ""}`}
              </Button>
            </Card>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Before/After */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Before / After Preview</h3>
                {done && (
                  <div className="flex gap-2">
                    <Badge variant="success">Ready to Download</Badge>
                    <Button size="sm" variant="success">
                      <Download className="w-3.5 h-3.5" /> Download All
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Before */}
                <div>
                  <p className="text-xs text-gray-500 text-center mb-2">Original</p>
                  <div className="bg-white rounded-md h-52 flex items-center justify-center relative overflow-hidden">
                    {imageUrl ? (
                      <NextImage
                        src={imageUrl}
                        alt="Original upload"
                        fill
                        sizes="(max-width: 1024px) 50vw, 33vw"
                        className="object-contain bg-gray-50"
                        unoptimized
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-linear-to-br from-[#21262d] to-[#0d1117]" />
                        <div className="relative text-center">
                          <div className="w-20 h-20 rounded-md bg-gray-100 mx-auto mb-2 flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-gray-500" />
                          </div>
                          <p className="text-xs text-gray-500">Upload image to preview</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* After */}
                <div>
                  <p className="text-xs text-gray-500 text-center mb-2">Enhanced</p>
                  <div className={`rounded-md h-52 flex items-center justify-center relative overflow-hidden transition-all ${done ? "bg-white" : "bg-gray-100"}`}>
                    {!imageUrl ? (
                      <p className="text-xs text-gray-400">Upload image to generate preview</p>
                    ) : !done ? (
                      <>
                        <div className="absolute inset-0 bg-linear-to-br from-[#21262d] to-[#0d1117]" />
                        <div className="relative text-center">
                          {processing ? (
                            <>
                              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-xs text-blue-600">Processing...</p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-400">Preview will appear here</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-full h-full relative">
                          <NextImage
                            src={imageUrl}
                            alt="Enhanced preview"
                            fill
                            sizes="(max-width: 1024px) 50vw, 33vw"
                            className="object-contain bg-white"
                            unoptimized
                          />
                          <div className="absolute bottom-2 left-2">
                            <Badge variant="success" className="text-xs">White BG Applied ✓</Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Templates */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Image Templates</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {templates.map(t => (
                  <button key={t.name}
                    className="relative p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-500/50 transition-colors text-left cursor-pointer group"
                  >
                    <div className="h-16 rounded-lg bg-gray-100 group-hover:bg-gray-100 transition-colors mb-2 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    {t.popular && <Badge variant="purple" className="absolute top-2 right-2">Popular</Badge>}
                    <p className="text-xs font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.desc}</p>
                    <Badge variant={t.platform === "Amazon" ? "warning" : t.platform === "TikTok" ? "blue" : t.platform === "Shopify" ? "success" : "outline"} className="mt-1">
                      {t.platform}
                    </Badge>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
