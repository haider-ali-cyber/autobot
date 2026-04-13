import Link from "next/link";
import { Search, BarChart2, FileText, Package, Calculator, Eye, TrendingUp, CheckCircle, ArrowRight, Star } from "lucide-react";

const tools = [
  { icon: Search,      label: "Product Research",    desc: "Find profitable products using real sales data, BSR trends and market demand." },
  { icon: BarChart2,   label: "Competitor Analysis",  desc: "Track competitor pricing, rank history and estimated monthly revenue." },
  { icon: FileText,    label: "Listing Builder",      desc: "Write optimized titles, bullets and descriptions for Amazon & Shopify." },
  { icon: TrendingUp,  label: "Trend Finder",         desc: "Discover rising products before they peak using search trend data." },
  { icon: Package,     label: "Supplier Finder",      desc: "Find verified Alibaba suppliers with MOQ, cost and lead time comparison." },
  { icon: Calculator,  label: "Profit Calculator",    desc: "Calculate exact landed cost including freight, duties and platform fees." },
  { icon: Eye,         label: "Ad Intelligence",      desc: "See which ads are running, how long, and what angles are working." },
  { icon: Star,        label: "Review Analysis",      desc: "Mine competitor reviews to find product improvement opportunities." },
];

const plans = [
  {
    name: "Starter",
    price: "$19",
    period: "/month",
    desc: "For new sellers just getting started",
    features: ["25 products tracked", "Product Research", "Keyword Research", "Listing Builder", "Profit Calculator", "1 store"],
    cta: "Start with Starter",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$49",
    period: "/month",
    desc: "Most popular for scaling sellers",
    features: ["100 products tracked", "All 16 tools included", "Competitor Analysis", "Ad Intelligence", "3 stores", "Priority support"],
    cta: "Start with Growth",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    desc: "For serious 6–7 figure sellers",
    features: ["Unlimited products", "API access", "Brand Protection", "5 stores", "Dedicated manager", "Custom reports"],
    cta: "Start with Pro",
    highlight: false,
  },
];

const testimonials = [
  { name: "Usman Tariq", role: "Amazon FBA Seller — UK", text: "Found 3 winning products in my first week. Sellora saved me from months of manual research.", stars: 5 },
  { name: "Sara Ahmed", role: "Shopify Store Owner — UAE", text: "The profit calculator alone is worth it. I finally know my actual margins before ordering.", stars: 5 },
  { name: "Bilal Khan", role: "TikTok Shop Seller — Pakistan", text: "Ad Intelligence showed me exactly which angles competitors were running. My ROAS doubled.", stars: 5 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">

      {/* Nav */}
      <nav className="border-b border-[#21262d] px-6 h-14 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-semibold text-[#e6edf3]">Sellora</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-[#8b949e]">
          <Link href="#tools" className="hover:text-[#e6edf3] transition-colors">Tools</Link>
          <Link href="#pricing" className="hover:text-[#e6edf3] transition-colors">Pricing</Link>
          <Link href="#" className="hover:text-[#e6edf3] transition-colors">Docs</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm text-[#8b949e] hover:text-[#e6edf3] px-3 py-1.5 transition-colors">
            Sign in
          </Link>
          <Link href="/login" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 border border-[#30363d] rounded-full px-3 py-1 mb-6 text-xs text-[#8b949e]">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          Trusted by 2,400+ sellers across Pakistan, UAE & UK
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#e6edf3] leading-tight mb-5">
          The all-in-one toolkit for<br />
          <span className="text-blue-400">Amazon & Shopify sellers</span>
        </h1>
        <p className="text-lg text-[#8b949e] max-w-2xl mx-auto mb-8 leading-relaxed">
          Research products, track competitors, build listings, find suppliers and manage orders — all from one dashboard. No switching between 5 different tools.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/dashboard" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-md transition-colors text-sm">
            Open Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/dashboard/product-hunter" className="inline-flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#e6edf3] font-medium px-5 py-2.5 rounded-md transition-colors text-sm">
            Try Product Research
          </Link>
        </div>
        <p className="text-xs text-[#484f58] mt-4">No credit card required · 14-day free trial</p>
      </section>

      {/* Stats bar */}
      <section className="border-y border-[#21262d] bg-[#161b22]">
        <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: "2,400+", label: "Active sellers" },
            { value: "15", label: "Research tools" },
            { value: "$4.2M+", label: "Revenue tracked" },
            { value: "99.7%", label: "Uptime" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-[#e6edf3]">{s.value}</p>
              <p className="text-sm text-[#8b949e] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section id="tools" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-[#e6edf3] mb-2">15 tools. One subscription.</h2>
          <p className="text-[#8b949e]">Everything you need to find, launch and scale products — without switching tabs.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tools.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-[#161b22] border border-[#30363d] rounded-md p-4 hover:border-[#484f58] transition-colors">
              <Icon className="w-5 h-5 text-blue-400 mb-3" />
              <h3 className="text-sm font-semibold text-[#e6edf3] mb-1">{label}</h3>
              <p className="text-xs text-[#8b949e] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {["Image Editor", "Brand Protection", "Order Management", "Compliance Checker"].map(name => (
            <div key={name} className="bg-[#161b22] border border-[#30363d] rounded-md p-4 hover:border-[#484f58] transition-colors">
              <div className="w-5 h-5 bg-[#21262d] rounded mb-3" />
              <h3 className="text-sm font-semibold text-[#e6edf3]">{name}</h3>
              <p className="text-xs text-[#484f58] mt-1">Included in Pro plan</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[#e6edf3] mb-2">Sellers love Sellora</h2>
          <p className="text-[#8b949e]">Join 2,400+ sellers across Pakistan, UAE & UK</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {testimonials.map(t => (
            <div key={t.name} className="bg-[#161b22] border border-[#30363d] rounded-md p-5">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-[#8b949e] leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
              <div>
                <p className="text-sm font-semibold text-[#e6edf3]">{t.name}</p>
                <p className="text-xs text-[#484f58]">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[#e6edf3] mb-2">Simple, transparent pricing</h2>
          <p className="text-[#8b949e]">Cancel anytime. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.name} className={`rounded-md p-5 border flex flex-col ${plan.highlight ? "bg-blue-600/10 border-blue-500/40" : "bg-[#161b22] border-[#30363d]"}`}>
              {plan.highlight && (
                <span className="text-xs font-medium text-blue-400 bg-blue-600/20 border border-blue-500/30 rounded-full px-2 py-0.5 self-start mb-3">Most popular</span>
              )}
              <h3 className="font-semibold text-[#e6edf3]">{plan.name}</h3>
              <p className="text-xs text-[#8b949e] mt-0.5 mb-3">{plan.desc}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-[#e6edf3]">{plan.price}</span>
                <span className="text-sm text-[#484f58]">{plan.period}</span>
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#8b949e]">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard" className={`block text-center py-2 rounded-md text-sm font-medium transition-colors ${plan.highlight ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d]"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#21262d] px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-sm font-medium text-[#e6edf3]">Sellora</span>
          </div>
          <p className="text-xs text-[#484f58]">© 2025 Sellora. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-[#484f58]">
            <Link href="#" className="hover:text-[#8b949e]">Privacy</Link>
            <Link href="#" className="hover:text-[#8b949e]">Terms</Link>
            <Link href="#" className="hover:text-[#8b949e]">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
