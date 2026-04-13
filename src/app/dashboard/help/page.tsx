"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search, ChevronDown, ChevronUp, Zap, BarChart2, Eye,
  FileText, Package, Calculator, ShoppingCart, MessageCircle,
  Link2, Shield, TrendingUp, Star, Megaphone, ImageIcon, CheckSquare,
  KeyRound, ExternalLink
} from "lucide-react";

const faqs = [
  {
    q: "Ye platform actually kya karta hai?",
    a: "Sellora ek all-in-one e-commerce intelligence tool hai Amazon aur Shopify sellers ke liye. Product research, keyword analysis, competitor tracking, profit calculation, supplier finding — sab ek jagah. Abhi demo mode mein hai, production mein real API data hoga."
  },
  {
    q: "Data real hai ya fake?",
    a: "Abhi sab mock/demo data hai. Real data ke liye Integrations page pe apna Amazon ya Shopify account connect karna hoga. Connect hone ke baad dashboard pe real orders, revenue, aur inventory data nazar aayega."
  },
  {
    q: "Amazon account kese connect karein?",
    a: "Integrations page pe jao → Amazon Seller Central card → 'Connect' press karo → setup steps follow karo. Amazon SP-API use hoti hai — sirf read-only access liya jata hai, koi changes nahi ho sakte."
  },
  {
    q: "Profit Calculator mein FBA fee kese calculate hoti hai?",
    a: "Platform FBA select karo, selling price daalo — calculator automatically Amazon ki 15% referral fee aur $4.50 FBA fulfillment fee add karta hai. Shipping to FBA aur import duty alag se enter karo."
  },
  {
    q: "Social Inbox mein messages kahan se aate hain?",
    a: "Meta (Facebook/Instagram) aur WhatsApp Business API se. Pehle Integrations page pe in platforms ko connect karna hoga. Connect hone ke baad customers ke real messages directly inbox mein nazar aayenge."
  },
  {
    q: "Listing Builder real listing generate karta hai?",
    a: "Abhi demo mein ek fixed mock listing show hoti hai. Production mein yeh real AI (OpenAI GPT) call karega aur aapki product details ke hisaab se unique title, bullets, aur description generate karega."
  },
  {
    q: "Brand Protection kaisa kaam karta hai?",
    a: "Ye Amazon pe aapke ASIN ko monitor karta hai hijackers, counterfeit sellers, aur unauthorized listings ke liye. Alert milne pe seedha Amazon Brand Registry pe report bhej sakte ho."
  },
  {
    q: "Plans aur pricing kya hain?",
    a: "3 plans hain: Starter ($19/mo), Growth ($49/mo), Pro ($99/mo). Settings → Plan & Billing pe details dekh sakte ho. Abhi demo mein sab features freely accessible hain."
  },
];

const features = [
  { icon: Search,      label: "Product Research",   href: "/dashboard/product-hunter",    desc: "Winning products dhundo" },
  { icon: KeyRound,    label: "Keyword Research",    href: "/dashboard/keyword-research",  desc: "High-volume keywords" },
  { icon: TrendingUp,  label: "Trend Predictor",     href: "/dashboard/trend-predictor",   desc: "Viral products ka pata lagao" },
  { icon: Eye,         label: "Competitor Analysis", href: "/dashboard/competitor-spy",    desc: "Competitors track karo" },
  { icon: Star,        label: "Review Intelligence", href: "/dashboard/review-intelligence", desc: "Customer feedback analyze karo" },
  { icon: Megaphone,   label: "Ad Intelligence",     href: "/dashboard/ad-spy",            desc: "Winning ads dekho" },
  { icon: FileText,    label: "Listing Builder",     href: "/dashboard/listing-generator", desc: "Optimized listings banao" },
  { icon: ImageIcon,   label: "Image Editor",        href: "/dashboard/photo-enhancer",    desc: "Product photos enhance karo" },
  { icon: Package,     label: "Supplier Finder",     href: "/dashboard/supplier-finder",   desc: "Alibaba suppliers dhundo" },
  { icon: Calculator,  label: "Profit Calculator",   href: "/dashboard/profit-calculator", desc: "Exact profit calculate karo" },
  { icon: CheckSquare, label: "Compliance Checker",  href: "/dashboard/compliance",        desc: "Import rules check karo" },
  { icon: Shield,      label: "Brand Protection",    href: "/dashboard/brand-protection",  desc: "Brand ko protect karo" },
  { icon: BarChart2,   label: "Analytics",           href: "/dashboard/analytics",         desc: "Revenue aur orders" },
  { icon: ShoppingCart,label: "Order Management",    href: "/dashboard/order-management",  desc: "Saare orders ek jagah" },
  { icon: Link2,       label: "Integrations",        href: "/dashboard/integrations",      desc: "Platforms connect karo" },
  { icon: MessageCircle, label: "Social Inbox",      href: "/dashboard/inbox",             desc: "FB/IG/WhatsApp messages" },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredFaqs = faqs.filter(f =>
    search === "" ||
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Help & Guide" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Hero search */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h2 className="text-lg font-bold mb-1">Kya help chahiye?</h2>
          <p className="text-sm text-blue-100 mb-4">FAQs search karo ya niche features guide dekho</p>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='e.g. "profit calculator", "Amazon connect"...'
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-blue-300 focus:outline-none focus:border-white/50 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* FAQ */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-900">Frequently Asked Questions</h3>
              <Badge variant="outline">{filteredFaqs.length} results</Badge>
            </div>

            {filteredFaqs.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 text-center py-4">Koi result nahi mila. Kuch aur search karo.</p>
              </Card>
            ) : (
              filteredFaqs.map((faq, i) => (
                <Card key={i} className="cursor-pointer hover:border-blue-200 transition-colors">
                  <button
                    className="w-full flex items-start justify-between gap-3 text-left cursor-pointer"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-3 h-3 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">{faq.q}</p>
                    </div>
                    {openFaq === i
                      ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    }
                  </button>
                  {openFaq === i && (
                    <p className="text-sm text-gray-500 mt-3 pl-7 leading-relaxed border-t border-gray-100 pt-3">
                      {faq.a}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Quick start */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" /> Quick Start
              </h3>
              <div className="space-y-2">
                {[
                  { step: "1", text: "Integrations pe store connect karo", href: "/dashboard/integrations" },
                  { step: "2", text: "Product Research se niche dhundo", href: "/dashboard/product-hunter" },
                  { step: "3", text: "Profit Calculator se viability check karo", href: "/dashboard/profit-calculator" },
                  { step: "4", text: "Supplier Finder se quote lo", href: "/dashboard/supplier-finder" },
                  { step: "5", text: "Listing Builder se listing banao", href: "/dashboard/listing-generator" },
                ].map(s => (
                  <a key={s.step} href={s.href}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-blue-50 transition-colors group">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {s.step}
                    </span>
                    <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors">{s.text}</span>
                  </a>
                ))}
              </div>
            </Card>

            {/* Contact */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Aur madad chahiye?</h3>
              <p className="text-xs text-gray-500 mb-3">Koi bhi issue ya feature request ke liye directly contact karo.</p>
              <a
                href="mailto:support@sellora.io"
                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                support@sellora.io
              </a>
            </Card>
          </div>
        </div>

        {/* All Features Directory */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">All Features</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {features.map(f => (
              <a key={f.href} href={f.href}
                className="flex items-start gap-2.5 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group">
                <div className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                  <f.icon className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">{f.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{f.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
