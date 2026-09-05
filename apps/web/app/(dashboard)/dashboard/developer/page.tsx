"use client";

import { useState, useEffect } from "react";
import { Key, Webhook, Plus, Copy, Check, ShieldAlert, Sparkles, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
    ]);

    setWebhooks([
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
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Developer API & Webhooks
        </h1>
        <p className="text-sm text-muted-foreground">
          Programmatic access token keys and realtime HMAC-signed webhooks
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto whitespace-nowrap">
        <Button
          variant={activeTab === "apikeys" ? "default" : "ghost"}
          onClick={() => setActiveTab("apikeys")}
          className="shrink-0"
        >
          <Key className="w-4 h-4 mr-2" /> API Keys
        </Button>
        <Button
          variant={activeTab === "webhooks" ? "default" : "ghost"}
          onClick={() => setActiveTab("webhooks")}
          className="shrink-0"
        >
          <Webhook className="w-4 h-4 mr-2" /> Webhook Subscriptions
        </Button>
      </div>

      {/* TAB 1: API KEYS */}
      {activeTab === "apikeys" && (
        <div className="space-y-6">
          {/* Create Key Card */}
          <Card>
            <CardHeader>
              <CardTitle>Create New API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateApiKey} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  required
                  placeholder="Key Description (e.g. Mobile App Backend)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-1.5" /> Generate Secret Key
                </Button>
              </form>

              {/* Display raw secret ONCE */}
              {createdRawKey && (
                <Alert>
                  <AlertTitle className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 shrink-0" /> Secret Key Created — Save It Now!
                  </AlertTitle>
                  <div className="absolute top-2.5 right-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(createdRawKey)}
                      className="gap-1 font-semibold cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey ? "Copied" : "Copy Secret"}
                    </Button>
                  </div>
                  <pre className="bg-muted text-foreground border border-border p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {createdRawKey}
                  </pre>
                  <AlertDescription className="text-xs">
                    This key will never be shown again. It is securely hashed at rest in our database.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Active Keys Table */}
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border space-y-4">
            <h3 className="font-bold text-base text-foreground">Active API Keys</h3>
            <div className="divide-y divide-border">
              {apiKeys.map((key) => (
                <div key={key.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-foreground">{key.name}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5 break-all">
                      Prefix: {key.prefix}••••••••••••
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setApiKeys(apiKeys.filter((k) => k.id !== key.id))}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Delete Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border space-y-4">
            <h3 className="font-bold text-base text-foreground">Register Webhook Endpoint</h3>

            {webhookMsg && (
              <Alert className="border-primary/30 bg-primary/10">
                <Check />
                <AlertTitle className="text-primary">{webhookMsg}</AlertTitle>
              </Alert>
            )}

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Payload URL
                </label>
                <Input
                  type="url"
                  required
                  placeholder="https://your-domain.com/webhooks"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Subscribe to Events
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {["video.processing", "video.ready", "video.failed", "usage.limit_reached"].map((ev) => (
                    <label
                      key={ev}
                      className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${selectedEvents.includes(ev)
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev)}
                        onChange={() => toggleEvent(ev)}
                        className="rounded accent-primary"
                      />
                      <span className="truncate">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto gap-2"
              >
                <Plus className="w-4 h-4" /> Add Webhook Subscription
              </Button>
            </form>
          </div>

          {/* Active Webhooks List */}
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border space-y-4">
            <h3 className="font-bold text-base text-foreground">Configured Webhooks</h3>
            <div className="divide-y divide-border">
              {webhooks.map((wh) => (
                <div key={wh.id} className="py-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="font-mono text-xs sm:text-sm font-semibold text-foreground break-all">{wh.url}</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => alert(`Test webhook ping sent to ${wh.url}`)}
                      className="gap-1 shrink-0"
                    >
                      <Send className="w-3 h-3" /> Test Ping
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground break-all">Secret: {wh.secret}</span>
                    {wh.events.map((ev) => (
                      <Badge key={ev} variant="secondary">
                      </Badge>
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
