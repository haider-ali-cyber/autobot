"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, AlertCircle, ExternalLink, RefreshCw,
  ShoppingBag, Store, Globe, MessageCircle, Copy, Eye, EyeOff
} from "lucide-react";

type Status = "connected" | "disconnected" | "pending";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  status: Status;
  detail: string;
  docsUrl: string;
  steps: string[];
}

const integrations: Integration[] = [
  {
    id: "amazon",
    name: "Amazon Seller Central",
    description: "Sync orders, inventory, revenue and BSR data directly from your Amazon seller account.",
    icon: ShoppingBag,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    status: "disconnected",
    detail: "Uses Amazon SP-API (Selling Partner API). Requires MWS migration to SP-API.",
    docsUrl: "https://developer-docs.amazon.com/sp-api/",
    steps: [
      "Go to Amazon Seller Central → Apps & Services → Develop Apps",
      "Create a new app and note your Client ID & Client Secret",
      "Paste the credentials below and click Connect",
      "Authorize access — Sellora will request read-only permissions",
    ],
  },
  {
    id: "shopify",
    name: "Shopify Store",
    description: "Pull real-time orders, customers, products and traffic sources from your Shopify store.",
    icon: Store,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    status: "connected",
    detail: "Connected: ali-store.myshopify.com · Last synced 2 min ago",
    docsUrl: "https://shopify.dev/docs/api",
    steps: [
      "Go to Shopify Admin → Settings → Apps and sales channels → Develop apps",
      "Create a private app, enable Orders, Products and Analytics API scopes",
      "Copy the Admin API access token",
      "Paste it below and enter your store URL (yourstore.myshopify.com)",
    ],
  },
  {
    id: "meta",
    name: "Meta (Facebook & Instagram)",
    description: "See ad performance, ad comments and leads from Facebook and Instagram campaigns in one place.",
    icon: Globe,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    status: "pending",
    detail: "Connection pending — waiting for Meta App Review approval.",
    docsUrl: "https://developers.facebook.com/docs/marketing-api/",
    steps: [
      "Go to Meta for Developers → Create App → Business type",
      "Add 'Marketing API' and 'Instagram Graph API' products",
      "Generate a long-lived Page Access Token",
      "Paste token below — Sellora syncs ad comments and messages every 5 min",
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    description: "Receive and reply to WhatsApp customer messages directly inside the Sellora Social Inbox.",
    icon: MessageCircle,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    status: "disconnected",
    detail: "Requires WhatsApp Business Platform access via Meta.",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/",
    steps: [
      "Set up a WhatsApp Business account via Meta Business Suite",
      "Get approved for the WhatsApp Business Platform (Cloud API)",
      "Copy your Phone Number ID and permanent System User Token",
      "Set the webhook URL to: https://api.sellora.io/webhooks/whatsapp",
    ],
  },
];

const statusConfig: Record<Status, { label: string; variant: "success" | "warning" | "default"; icon: React.ElementType }> = {
  connected:    { label: "Connected",    variant: "success",  icon: CheckCircle },
  pending:      { label: "Pending",      variant: "warning",  icon: AlertCircle },
  disconnected: { label: "Not connected", variant: "default", icon: AlertCircle },
};

function IntegrationCard({ integration }: { integration: Integration }) {
  const [open, setOpen] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const s = statusConfig[integration.status];

  const webhookUrl = "https://api.sellora.io/webhooks/" + integration.id;

  function copy() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className={`transition-all ${open ? "ring-1 ring-blue-200" : ""}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg ${integration.iconBg} flex items-center justify-center shrink-0`}>
          <integration.icon className={`w-5 h-5 ${integration.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{integration.description}</p>
          <p className="text-xs text-gray-400 mt-1">{integration.detail}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => window.open(integration.docsUrl, "_blank")}>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant={integration.status === "connected" ? "secondary" : "primary"}
            onClick={() => setOpen(!open)}
          >
            {integration.status === "connected" ? "Manage" : "Connect"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-700 mb-2">Setup steps</p>
          <ol className="space-y-2 mb-4">
            {integration.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-600">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-semibold text-[10px] mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>

          <div className="space-y-2">
            {(integration.id === "whatsapp" || integration.id === "meta") && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Webhook URL (copy into your Meta app)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-gray-700 truncate">{webhookUrl}</code>
                  <Button size="sm" variant="secondary" onClick={copy}>
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">API Token / Access Token</p>
              <div className="flex items-center gap-2">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Paste your token here..."
                  className="flex-1 text-xs bg-white border border-gray-300 rounded-md px-3 py-1.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <button onClick={() => setShowToken(!showToken)} className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" disabled={!token}>
                <RefreshCw className="w-3.5 h-3.5" />
                {integration.status === "connected" ? "Re-authorize" : "Connect & Test"}
              </Button>
              {integration.status === "connected" && (
                <Button size="sm" variant="danger">Disconnect</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function IntegrationsPage() {
  const connected = integrations.filter(i => i.status === "connected").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Integrations" />
      <main className="flex-1 overflow-y-auto p-5">

        {/* Status bar */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Connected",     value: connected,                           color: "text-green-600" },
            { label: "Pending",       value: integrations.filter(i=>i.status==="pending").length, color: "text-amber-600" },
            { label: "Not connected", value: integrations.filter(i=>i.status==="disconnected").length, color: "text-gray-400" },
          ].map(s => (
            <Card key={s.label} className="text-center py-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Info box */}
        <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold">Demo mode:</span> Integrations below show how the connection UI works.
            In production, connecting your store will pull live orders, revenue and customer data automatically.
            Tokens are encrypted and stored securely — Sellora only requests read-only access.
          </div>
        </div>

        {/* Integration cards */}
        <div className="space-y-3">
          {integrations.map(i => <IntegrationCard key={i.id} integration={i} />)}
        </div>

        {/* Coming soon */}
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Coming soon</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["TikTok Shop", "WooCommerce", "Daraz PK", "Etsy"].map(name => (
              <div key={name} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2 opacity-60">
                <div className="w-7 h-7 rounded bg-gray-100" />
                <span className="text-sm text-gray-500">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
