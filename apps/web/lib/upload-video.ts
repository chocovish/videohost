import { ShareAccessMode, CountryPriceItem } from "@/components/share";

export interface UploadVideoOptions {
  file: File;
  title: string;
  description?: string;
  requireHls: boolean;
  currentFolderId?: string | null;
  shareAccessMode?: ShareAccessMode;
  price?: number | null;
  currency?: string;
  countryPricing?: CountryPriceItem[];
  inviteEmails?: string[];
  metadata?: {
    durationSeconds?: number;
    sourceWidth?: number;
    sourceHeight?: number;
    thumbnailBlob?: Blob | null;
  } | null;
  onProgress?: (percent: number, statusText: string) => void;
}

export async function uploadVideoFile(options: UploadVideoOptions): Promise<{ videoId: string }> {
  const {
    file,
    title,
    description,
    requireHls,
    currentFolderId,
    shareAccessMode,
    price,
    currency,
    countryPricing,
    inviteEmails,
    metadata,
    onProgress,
  } = options;

  onProgress?.(5, "Initializing upload session...");

  // Send initialization request to /api/v1/videos
  const initRes = await fetch("/api/v1/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title.trim(),
      description: description?.trim() || undefined,
      fileName: file.name,
      contentType: file.type || (file.name.endsWith(".mkv") ? "video/x-matroska" : "video/mp4"),
      requireHls,
      shareAccessMode: shareAccessMode || "PUBLIC",
      price: price !== undefined ? price : undefined,
      currency: currency || "USD",
      countryPricing: countryPricing || undefined,
      inviteEmails: inviteEmails || undefined,
      sizeBytes: file.size,
      durationSeconds: metadata?.durationSeconds || undefined,
      sourceWidth: metadata?.sourceWidth || undefined,
      sourceHeight: metadata?.sourceHeight || undefined,
      folderId: currentFolderId || null,
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok) {
    throw new Error(initData.error || "Failed to initialize upload");
  }

  // Handle both top-level and nested .data response structures
  const videoId = initData.videoId || initData.id || initData.data?.videoId || initData.data?.id;
  const uploadUrl = initData.uploadUrl || initData.data?.uploadUrl;
  const thumbnailUploadUrl = initData.thumbnailUploadUrl || initData.data?.thumbnailUploadUrl;

  if (!uploadUrl || !videoId) {
    throw new Error("Invalid response from server during upload initialization");
  }

  onProgress?.(15, "Uploading video file to S3...");

  const xhr = new XMLHttpRequest();
  await new Promise<void>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 70) + 15;
        onProgress?.(percentComplete, "Uploading video file to S3...");
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during S3 upload"));

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || (file.name.endsWith(".mkv") ? "video/x-matroska" : "video/mp4"));
    xhr.send(file);
  });

  onProgress?.(85, "Processing thumbnail...");

  let thumbnailUploaded = false;
  if (metadata?.thumbnailBlob) {
    try {
      let targetThumbUrl = thumbnailUploadUrl;
      if (!targetThumbUrl) {
        onProgress?.(88, "Requesting thumbnail upload URL...");
        const thumbInitRes = await fetch("/api/upload/thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            contentType: "image/webp",
          }),
        });
        const thumbInitData = await thumbInitRes.json();
        targetThumbUrl = thumbInitData.uploadUrl || thumbInitData.data?.uploadUrl;
      }

      if (targetThumbUrl) {
        onProgress?.(90, "Uploading thumbnail...");
        const thumbRes = await fetch(targetThumbUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/webp" },
          body: metadata.thumbnailBlob,
        });
        if (thumbRes.ok) {
          thumbnailUploaded = true;
        }
      }
    } catch (thumbErr) {
      console.warn("Failed to upload client thumbnail:", thumbErr);
    }
  }

  if (requireHls) {
    onProgress?.(93, "Queueing HLS adaptive transcode job...");
  } else {
    onProgress?.(93, "Finalizing video upload...");
  }

  const completeRes = await fetch("/api/upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId, hasThumbnail: thumbnailUploaded }),
  });

  if (!completeRes.ok) {
    throw new Error("Failed to finalize upload");
  }

  if (requireHls) {
    onProgress?.(100, "Upload complete! Video queued for HLS processing.");
  } else {
    onProgress?.(100, "Upload complete! Video ready for playback.");
  }

  return { videoId };
}
