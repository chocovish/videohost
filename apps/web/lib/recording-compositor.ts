export type WebcamCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type WebcamShape = "circle" | "squircle" | "square";
export type WebcamSize = "small" | "medium" | "large";
export type ResolutionPreset = "native" | "720p" | "1080p" | "4k";

export interface CompositorOptions {
  webcamCorner?: WebcamCorner;
  webcamShape?: WebcamShape;
  webcamSize?: WebcamSize;
  isWebcamEnabled?: boolean;
}

export class RecordingCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement;
  private webcamVideo: HTMLVideoElement;

  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private worker: Worker | null = null;
  private workerUrl: string | null = null;

  public webcamCorner: WebcamCorner = "bottom-left";
  public webcamShape: WebcamShape = "circle";
  public webcamSize: WebcamSize = "medium";
  public isWebcamEnabled: boolean = true;

  constructor(options?: CompositorOptions) {
    this.canvas = document.createElement("canvas");
    // Default 1080p canvas resolution, dynamically updated when screen video starts
    this.canvas.width = 1920;
    this.canvas.height = 1080;

    const context = this.canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Failed to initialize 2D context for recording canvas");
    }
    this.ctx = context;

    this.screenVideo = document.createElement("video");
    this.screenVideo.autoplay = true;
    this.screenVideo.muted = true;
    this.screenVideo.playsInline = true;

    this.webcamVideo = document.createElement("video");
    this.webcamVideo.autoplay = true;
    this.webcamVideo.muted = true;
    this.webcamVideo.playsInline = true;

    if (options?.webcamCorner) this.webcamCorner = options.webcamCorner;
    if (options?.webcamShape) this.webcamShape = options.webcamShape;
    if (options?.webcamSize) this.webcamSize = options.webcamSize;
    if (options?.isWebcamEnabled !== undefined) this.isWebcamEnabled = options.isWebcamEnabled;
  }

  public setScreenStream(stream: MediaStream | null) {
    if (stream) {
      this.screenVideo.srcObject = stream;
      this.screenVideo.play().catch((err) => console.warn("Screen video play warning:", err));
    } else {
      this.screenVideo.srcObject = null;
    }
  }

  public setWebcamStream(stream: MediaStream | null) {
    if (stream) {
      this.webcamVideo.srcObject = stream;
      this.webcamVideo.play().catch((err) => console.warn("Webcam video play warning:", err));
    } else {
      this.webcamVideo.srcObject = null;
    }
  }

  public start(fps: number = 30): MediaStream {
    this.isRunning = true;
    this.startWorkerTimer(fps);
    this.renderLoop();
    return this.canvas.captureStream(fps);
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.stopWorkerTimer();

    this.screenVideo.pause();
    this.screenVideo.srcObject = null;
    this.webcamVideo.pause();
    this.webcamVideo.srcObject = null;
  }

  private startWorkerTimer(fps: number) {
    if (typeof window === "undefined" || typeof Worker === "undefined") return;

    try {
      const code = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data.action === "start") {
            const interval = Math.max(10, Math.floor(1000 / (e.data.fps || 30)));
            if (timerId) clearInterval(timerId);
            timerId = setInterval(() => {
              self.postMessage("tick");
            }, interval);
          } else if (e.data.action === "stop") {
            if (timerId) {
              clearInterval(timerId);
              timerId = null;
            }
          }
        };
      `;
      const blob = new Blob([code], { type: "application/javascript" });
      this.workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(this.workerUrl);

      this.worker.onmessage = () => {
        if (this.isRunning && typeof document !== "undefined" && document.hidden) {
          this.renderFrame();
        }
      };

      this.worker.postMessage({ action: "start", fps });
    } catch (e) {
      console.warn("Failed to initialize background worker timer:", e);
    }
  }

  private stopWorkerTimer() {
    if (this.worker) {
      try {
        this.worker.postMessage({ action: "stop" });
        this.worker.terminate();
      } catch (e) {
        console.warn("Error stopping worker timer:", e);
      }
      this.worker = null;
    }

    if (this.workerUrl) {
      try {
        URL.revokeObjectURL(this.workerUrl);
      } catch (e) {
        console.warn("Error revoking worker URL:", e);
      }
      this.workerUrl = null;
    }
  }

  private renderLoop = () => {
    if (!this.isRunning) return;

    if (typeof document === "undefined" || !document.hidden) {
      this.renderFrame();
    }
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  private renderFrame() {
    const { canvas, ctx, screenVideo, webcamVideo } = this;

    // Dynamically adjust canvas dimensions to screen video dimensions if available
    if (screenVideo.videoWidth > 0 && screenVideo.videoHeight > 0) {
      if (canvas.width !== screenVideo.videoWidth || canvas.height !== screenVideo.videoHeight) {
        canvas.width = screenVideo.videoWidth;
        canvas.height = screenVideo.videoHeight;
      }
    }

    const W = canvas.width;
    const H = canvas.height;

    // Clear canvas background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, W, H);

    // 1. Draw Screen Capture Stream
    if (screenVideo.readyState >= 2 && screenVideo.videoWidth > 0) {
      ctx.drawImage(screenVideo, 0, 0, W, H);
    } else {
      // Placeholder state while waiting for stream frame
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for Screen Capture Stream...", W / 2, H / 2);
    }

    // 2. Draw Webcam Stream Overlay (if enabled & active)
    if (
      this.isWebcamEnabled &&
      webcamVideo.readyState >= 2 &&
      webcamVideo.videoWidth > 0 &&
      webcamVideo.videoHeight > 0
    ) {
      this.drawWebcamOverlay(W, H);
    }
  }

  private drawWebcamOverlay(W: number, H: number) {
    const { ctx, webcamVideo, webcamCorner, webcamShape, webcamSize } = this;

    // Determine size scale based on canvas dimension
    const baseSize = Math.min(W, H);
    let overlaySizeScale = 0.22; // medium default (22%)
    if (webcamSize === "small") overlaySizeScale = 0.16;
    if (webcamSize === "large") overlaySizeScale = 0.30;

    const overlayW = Math.round(baseSize * overlaySizeScale);
    const overlayH = overlayW; // Keep 1:1 ratio for circle / square / squircle

    const padding = Math.round(baseSize * 0.03); // 3% margin from corner

    // Calculate (x, y) coordinates based on chosen corner
    let x = padding;
    let y = padding;

    if (webcamCorner === "top-right") {
      x = W - overlayW - padding;
      y = padding;
    } else if (webcamCorner === "bottom-left") {
      x = padding;
      y = H - overlayH - padding;
    } else if (webcamCorner === "bottom-right") {
      x = W - overlayW - padding;
      y = H - overlayH - padding;
    }

    ctx.save();

    // Draw ambient drop shadow around webcam container
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    // Outer border ring & clip shape setup
    ctx.beginPath();
    let cornerRadius = 0;

    if (webcamShape === "circle") {
      const centerX = x + overlayW / 2;
      const centerY = y + overlayH / 2;
      const radius = overlayW / 2;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    } else if (webcamShape === "squircle") {
      cornerRadius = Math.round(overlayW * 0.28);
      this.drawRoundedRectPath(ctx, x, y, overlayW, overlayH, cornerRadius);
    } else {
      // square / sleek rounded rect
      cornerRadius = Math.round(overlayW * 0.12);
      this.drawRoundedRectPath(ctx, x, y, overlayW, overlayH, cornerRadius);
    }

    // Fill white backdrop for ring border
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Reset drop shadow before clipping camera video
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Apply clip path for webcam frame
    ctx.save();
    ctx.beginPath();
    if (webcamShape === "circle") {
      const centerX = x + overlayW / 2;
      const centerY = y + overlayH / 2;
      const radius = overlayW / 2 - 3; // 3px white ring border
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    } else if (webcamShape === "squircle") {
      this.drawRoundedRectPath(ctx, x + 3, y + 3, overlayW - 6, overlayH - 6, Math.max(0, cornerRadius - 3));
    } else {
      this.drawRoundedRectPath(ctx, x + 3, y + 3, overlayW - 6, overlayH - 6, Math.max(0, cornerRadius - 3));
    }
    ctx.clip();

    // Aspect-fill webcam video into square box
    const camW = webcamVideo.videoWidth;
    const camH = webcamVideo.videoHeight;
    const scale = Math.max(overlayW / camW, overlayH / camH);
    const cropW = overlayW / scale;
    const cropH = overlayH / scale;
    const cropX = (camW - cropW) / 2;
    const cropY = (camH - cropH) / 2;

    ctx.drawImage(webcamVideo, cropX, cropY, cropW, cropH, x, y, overlayW, overlayH);

    ctx.restore(); // Restore clip
    ctx.restore(); // Restore full state
  }

  private drawRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }
  }
}
