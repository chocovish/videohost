import Link from "next/link";
import { Video, ArrowRight, Play, Zap, ShieldCheck, Code, Layers, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] relative overflow-hidden flex flex-col justify-between">
      {/* Dynamic Lime Glow Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-[hsl(var(--primary))] opacity-25 blur-3xl rounded-full pointer-events-none" />

      {/* Header Navigation */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-md">
            <Video className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">VideoHost</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[hsl(var(--foreground))] hover:bg-black/5 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[hsl(var(--primary))] text-white shadow-md hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl w-full mx-auto px-6 py-16 text-center relative z-10 space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))] text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Mux-Style Video Platform Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Next-gen video hosting & <br />
          <span className="text-[hsl(var(--primary))] underline decoration-[hsl(var(--primary))]/40">
            adaptive HLS streaming
          </span>
        </h1>

        <p className="text-lg text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto leading-relaxed">
          Powered by Cloudflare R2 zero-egress storage, BullMQ queue-based FFmpeg transcoding (480p to 4K), Auth.js multi-tenancy, and bundled Video.js embeds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 bg-[hsl(var(--primary))] text-white font-extrabold text-base rounded-2xl shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-3 group"
          >
            Start Free (200 Video Mins)
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 glass-card font-extrabold text-base rounded-2xl border border-[hsl(var(--border))] hover:bg-black/5 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" /> Live Demo Dashboard
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="glass-card p-6 rounded-2xl border border-[hsl(var(--border))] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base">R2 Presigned Uploads</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Videos stream directly from browser to Cloudflare R2 bucket without touching your app server.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[hsl(var(--border))] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base">Queue-based FFmpeg</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              BullMQ + Redis transcode pipeline generates 480p, 720p, 1080p, 1440p, 4K HLS ladders & thumbnails.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-[hsl(var(--border))] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center mb-3">
              <Code className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base">Developer REST API</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Issue API keys, configure HMAC webhooks, and manage video assets via `/v1/videos`.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-6 text-center text-xs text-[hsl(var(--muted-foreground))] relative z-10">
        © 2026 VideoHost Platform. Built with Next.js 15, Auth.js, Cloudflare R2, and Video.js.
      </footer>
    </div>
  );
}
