"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Copy, Check, Shield, Globe, Eye, Lock, Trash2, Code, FileCode, Clock, Layers } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";

interface VideoDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  durationSeconds?: number;
  sourceResolution?: string;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  playbackUrl?: string;
  thumbnailUrl?: string;
  renditions: { resolution: string; bitrateKbps: number; playlistUrl: string }[];
  createdAt: string;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"player" | "embed" | "renditions">("player");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE" | "UNLISTED">("PRIVATE");

  const fetchVideoDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/videos/${id}`);
      const data = await res.json();
      if (res.ok) {
        setVideo(data);
        setVisibility(data.visibility);
      }
    } catch (e) {
      console.error("Failed to load video details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoDetail();
  }, [id]);

  const handleVisibilityChange = async (newVis: "PUBLIC" | "PRIVATE" | "UNLISTED") => {
    setVisibility(newVis);
    try {
      await fetch(`/api/v1/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVis }),
      });
    } catch (e) {
      console.error("Visibility change error", e);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this video and all its transcoded renditions?")) return;
    try {
      const res = await fetch(`/api/v1/videos/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
      }
    } catch (e) {
      console.error("Delete error", e);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-96 w-full bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold">Video not found</h2>
        <Link href="/dashboard" className="text-[hsl(var(--primary))] hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const iframeEmbedCode = `<iframe src="${window.location.origin}/embed/${video.id}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`;
  const scriptEmbedCode = `<link href="https://vjs.zencdn.net/8/video-js.css" rel="stylesheet" />
<video-js id="player-${video.id}" class="vjs-big-play-centered" controls preload="auto">
  <source src="${video.playbackUrl}" type="application/x-mpegURL">
</video-js>
<script src="https://vjs.zencdn.net/8/video.js"></script>`;

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Videos
        </Link>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Delete Video
        </button>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Player & Embed Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-[hsl(var(--foreground))]">{video.title}</h1>
              {video.description && (
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{video.description}</p>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3">
              <button
                onClick={() => setActiveTab("player")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === "player"
                    ? "bg-[hsl(var(--primary))] text-white"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-black/5"
                }`}
              >
                <Play className="w-4 h-4" /> Player Preview
              </button>
              <button
                onClick={() => setActiveTab("embed")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === "embed"
                    ? "bg-[hsl(var(--primary))] text-white"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-black/5"
                }`}
              >
                <Code className="w-4 h-4" /> Embed Code
              </button>
              <button
                onClick={() => setActiveTab("renditions")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === "renditions"
                    ? "bg-[hsl(var(--primary))] text-white"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-black/5"
                }`}
              >
                <Layers className="w-4 h-4" /> Renditions ({video.renditions?.length || 0})
              </button>
            </div>

            {/* Tab 1: Bundled Video.js Player */}
            {activeTab === "player" && (
              <div>
                {video.playbackUrl ? (
                  <VideoPlayer src={video.playbackUrl} poster={video.thumbnailUrl} />
                ) : (
                  <div className="aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <Clock className="w-12 h-12 mb-2 animate-pulse text-[hsl(var(--primary))]" />
                    <p className="font-semibold text-sm">Video is currently being transcoded to HLS ladder</p>
                    <p className="text-xs text-slate-500 mt-1">Check back in a moment or refresh page</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Embed Code Snippets */}
            {activeTab === "embed" && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-[hsl(var(--primary))]" /> Responsive Iframe Embed
                    </span>
                    <button
                      onClick={() => copyToClipboard(iframeEmbedCode, "iframe")}
                      className="px-3 py-1 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] text-xs font-semibold rounded-md hover:bg-[hsl(var(--primary))]/20 transition-colors flex items-center gap-1"
                    >
                      {copiedType === "iframe" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedType === "iframe" ? "Copied" : "Copy Iframe"}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto font-mono">
                    {iframeEmbedCode}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                      <Code className="w-4 h-4 text-[hsl(var(--primary))]" /> Native Video.js HTML Snippet
                    </span>
                    <button
                      onClick={() => copyToClipboard(scriptEmbedCode, "script")}
                      className="px-3 py-1 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] text-xs font-semibold rounded-md hover:bg-[hsl(var(--primary))]/20 transition-colors flex items-center gap-1"
                    >
                      {copiedType === "script" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedType === "script" ? "Copied" : "Copy HTML"}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto font-mono">
                    {scriptEmbedCode}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Transcoded Renditions Ladder */}
            {activeTab === "renditions" && (
              <div className="space-y-4">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Adaptive bitrate renditions packaged into fMP4 / HLS streams:
                </p>
                <div className="divide-y divide-[hsl(var(--border))]">
                  {video.renditions.map((rend) => (
                    <div key={rend.resolution} className="py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-bold px-2.5 py-1 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] rounded-lg">
                          {rend.resolution}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                          {rend.bitrateKbps} kbps bitrate
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(rend.playlistUrl, rend.resolution)}
                        className="text-xs text-[hsl(var(--primary))] hover:underline font-medium"
                      >
                        {copiedType === rend.resolution ? "Copied URL" : "Copy Playlist URL"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Metadata & Controls Sidebar */}
        <div className="space-y-6">
          {/* Visibility Switcher Card */}
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
            <h3 className="font-bold text-sm text-[hsl(var(--foreground))] uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[hsl(var(--primary))]" /> Visibility Settings
            </h3>

            <div className="space-y-2">
              {[
                { id: "PUBLIC", label: "Public", icon: Globe, desc: "Accessible via direct CDN URL" },
                { id: "UNLISTED", label: "Unlisted", icon: Eye, desc: "Accessible only with link" },
                { id: "PRIVATE", label: "Private", icon: Lock, desc: "Requires signed playback URL" },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = visibility === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleVisibilityChange(item.id as any)}
                    className={`w-full p-3 rounded-xl text-left border transition-all flex items-start gap-3 ${
                      isSelected
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10"
                        : "border-[hsl(var(--border))] hover:bg-black/5"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 ${isSelected ? "text-[hsl(var(--primary))]" : "text-slate-400"}`} />
                    <div>
                      <p className="font-bold text-xs text-[hsl(var(--foreground))]">{item.label}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset Info Card */}
          <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-3 text-xs">
            <h3 className="font-bold text-sm text-[hsl(var(--foreground))] uppercase tracking-wider mb-2">
              Asset Metadata
            </h3>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Video ID</span>
              <span className="font-mono text-[hsl(var(--foreground))]">{video.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Source Resolution</span>
              <span className="font-semibold text-[hsl(var(--foreground))]">{video.sourceResolution || "Probing"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Uploaded On</span>
              <span className="text-[hsl(var(--foreground))]">{new Date(video.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
