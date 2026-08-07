"use client";

import { useState, useEffect } from "react";
import { Key, Webhook, Plus, Copy, Check, ShieldAlert, Sparkles, Trash2, Send } from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface WebhookItem {
  id: string;
  url: string;
  secret: string;
  events: string[];
  createdAt: string;
}

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<"apikeys" | "webhooks">("apikeys");

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["video.ready", "video.failed"]);
  const [webhookMsg, setWebhookMsg] = useState("");

  useEffect(() => {
    // Initial mock API Keys & Webhooks data
    setApiKeys([
      {
        id: "key_1",
        name: "Production Backend",
        prefix: "vk_live_8f12",
        createdAt: new Date().toISOString(),
      },
    ]);

    setWebhooks([
      {
        id: "wh_1",
        url: "https://api.myapp.com/webhooks/video-events",
        secret: "whsec_994a1b028ce3728f",
        events: ["video.ready", "video.failed"],
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;

    // Simulate API key generation
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const rawKey = `vk_live_${randomHex}`;
    const prefix = `vk_live_${randomHex.substring(0, 4)}`;

    const newKey: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      prefix,
      createdAt: new Date().toISOString(),
    };

    setApiKeys((prev) => [newKey, ...prev]);
    setCreatedRawKey(rawKey);
    setNewKeyName("");
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl) return;

    const secret = `whsec_${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
    const newWh: WebhookItem = {
      id: `wh_${Date.now()}`,
      url: webhookUrl,
      secret,
      events: selectedEvents,
      createdAt: new Date().toISOString(),
    };

    setWebhooks((prev) => [newWh, ...prev]);
    setWebhookUrl("");
    setWebhookMsg("Webhook endpoint successfully registered!");
    setTimeout(() => setWebhookMsg(""), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const toggleEvent = (ev: string) => {
    if (selectedEvents.includes(ev)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== ev));
    } else {
      setSelectedEvents([...selectedEvents, ev]);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
          Developer API & Webhooks
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Programmatic access token keys and realtime HMAC-signed webhooks
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3">
        <button
          onClick={() => setActiveTab("apikeys")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "apikeys"
              ? "bg-[hsl(var(--primary))] text-white shadow-xs"
              : "text-[hsl(var(--muted-foreground))] hover:bg-black/5"
          }`}
        >
          <Key className="w-4 h-4" /> API Keys
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            activeTab === "webhooks"
              ? "bg-[hsl(var(--primary))] text-white shadow-xs"
              : "text-[hsl(var(--muted-foreground))] hover:bg-black/5"
          }`}
        >
          <Webhook className="w-4 h-4" /> Webhook Subscriptions
        </button>
      </div>

      {/* TAB 1: API KEYS */}
      {activeTab === "apikeys" && (
        <div className="space-y-6">
          {/* Create Key Card */}
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
            <h3 className="font-bold text-base text-[hsl(var(--foreground))]">Create New API Key</h3>
            <form onSubmit={handleCreateApiKey} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                placeholder="Key Description (e.g. Mobile App Backend)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Generate Secret Key
              </button>
            </form>

            {/* Display raw secret ONCE */}
            {createdRawKey && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" /> Secret Key Created — Save It Now!
                  </span>
                  <button
                    onClick={() => copyToClipboard(createdRawKey)}
                    className="px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded-md hover:bg-amber-700 transition-colors flex items-center gap-1"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey ? "Copied" : "Copy Secret"}
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                  {createdRawKey}
                </pre>
                <p className="text-[11px] text-amber-700">
                  This key will never be shown again. It is securely hashed at rest in our database.
                </p>
              </div>
            )}
          </div>

          {/* Active Keys Table */}
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
            <h3 className="font-bold text-base text-[hsl(var(--foreground))]">Active API Keys</h3>
            <div className="divide-y divide-[hsl(var(--border))]">
              {apiKeys.map((key) => (
                <div key={key.id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-[hsl(var(--foreground))]">{key.name}</p>
                    <p className="text-xs font-mono text-[hsl(var(--muted-foreground))] mt-0.5">
                      Prefix: {key.prefix}••••••••••••
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setApiKeys(apiKeys.filter((k) => k.id !== key.id))}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEBHOOKS */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
            <h3 className="font-bold text-base text-[hsl(var(--foreground))]">Register Webhook Endpoint</h3>

            {webhookMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
                {webhookMsg}
              </div>
            )}

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                  Payload URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://your-domain.com/webhooks"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                  Subscribe to Events
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["video.processing", "video.ready", "video.failed", "usage.limit_reached"].map((ev) => (
                    <label
                      key={ev}
                      className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                        selectedEvents.includes(ev)
                          ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 text-[hsl(var(--foreground))]"
                          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev)}
                        onChange={() => toggleEvent(ev)}
                        className="rounded accent-[hsl(var(--primary))]"
                      />
                      {ev}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Webhook Subscription
              </button>
            </form>
          </div>

          {/* Active Webhooks List */}
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
            <h3 className="font-bold text-base text-[hsl(var(--foreground))]">Configured Webhooks</h3>
            <div className="divide-y divide-[hsl(var(--border))]">
              {webhooks.map((wh) => (
                <div key={wh.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm font-semibold text-[hsl(var(--foreground))]">{wh.url}</p>
                    <button
                      onClick={() => alert(`Test webhook ping sent to ${wh.url}`)}
                      className="px-3 py-1 bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-xs font-semibold rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" /> Test Ping
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">Secret: {wh.secret}</span>
                    {wh.events.map((ev) => (
                      <span
                        key={ev}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
