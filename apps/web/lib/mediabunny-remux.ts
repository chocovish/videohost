import {
  Input,
  Output,
  MkvOutputFormat,
  BufferTarget,
  BlobSource,
  ALL_FORMATS,
  Conversion,
  InputTrack,
} from "mediabunny";

export interface UnsupportedTrackInfo {
  type: string;
  codec: string;
  reason: string;
  friendlyReason: string;
}

export class UnsupportedTracksError extends Error {
  readonly unsupportedTracks: UnsupportedTrackInfo[];
  readonly rawSummary: string;

  constructor(unsupportedTracks: UnsupportedTrackInfo[]) {
    const rawSummary = unsupportedTracks
      .map((t) => `${t.type}: ${t.codec ?? "unknown codec"} (${t.friendlyReason})`)
      .join("\n");

    super(
      "Cannot containerize video to MKV for browser playback.\n\n" +
        "Unsupported / Unplayable tracks:\n" +
        (rawSummary || "Unknown track")
    );

    this.name = "UnsupportedTracksError";
    this.unsupportedTracks = unsupportedTracks;
    this.rawSummary = rawSummary;
  }
}

export function formatDiscardReason(reason: string, codec: string, type: string = "track"): string {
  switch (reason) {
    case "browser_unplayable":
      return `The ${type} codec '${codec}' cannot be decoded or played natively by web browsers.`;
    case "undecodable_source_codec":
      return `The codec '${codec}' cannot be decoded by the browser.`;
    case "unknown_source_codec":
      return `Unrecognized stream codec ('${codec}'). Cannot play in browser or copy without re-encoding.`;
    case "no_encodable_target_codec":
      return `The codec '${codec}' is not supported for direct stream encapsulation in MKV (-c copy).`;
    case "discarded_by_user":
      return "Track was excluded by user configuration.";
    case "max_track_count_reached":
      return "Maximum allowed track count for MKV container was exceeded.";
    case "max_track_count_of_type_reached":
      return "Container cannot accommodate additional tracks of this type.";
    case "no_media_tracks":
      return "The video file does not contain any readable video or audio tracks.";
    case "unsupported_container":
      return "The file container format is not recognized or supported by the browser.";
    default:
      return reason || "Track cannot be played by the browser or copied to MKV container without re-encoding.";
  }
}

/**
 * Extracts codec name safely from a Mediabunny track.
 */
async function getTrackCodecName(track: InputTrack): Promise<string> {
  try {
    const c = await track.getCodec();
    if (c) return String(c);
  } catch {
    // fallback
  }

  try {
    const param = await track.getCodecParameterString();
    if (param) return String(param);
  } catch {
    // fallback
  }

  try {
    const internalId = await track.getInternalCodecId();
    if (internalId) return String(internalId);
  } catch {
    // fallback
  }

  if ((track as any).codec) {
    return String((track as any).codec);
  }

  return "unknown codec";
}

/**
 * Probes the input video file and checks whether all its tracks can be played by the browser
 * and copied as-is into MKV using Mediabunny's strict -c copy pipeline.
 */
export async function validateTracksStrictCopy(
  fileOrBlob: File | Blob
): Promise<{ isValid: boolean; unsupportedTracks: UnsupportedTrackInfo[] }> {
  try {
    const input = new Input({
      source: new BlobSource(fileOrBlob),
      formats: ALL_FORMATS,
    });

    const canRead = await input.canRead();
    if (!canRead) {
      return {
        isValid: false,
        unsupportedTracks: [
          {
            type: "container",
            codec: "unknown",
            reason: "unsupported_container",
            friendlyReason: "The container format is not supported or recognized by the browser.",
          },
        ],
      };
    }

    const unsupportedTracks: UnsupportedTrackInfo[] = [];

    // 1. Check all tracks in the input for browser playback / decodability
    const tracks = await input.getTracks();
    if (tracks.length === 0) {
      return {
        isValid: false,
        unsupportedTracks: [
          {
            type: "media",
            codec: "none",
            reason: "no_media_tracks",
            friendlyReason: "The video file does not contain any readable video or audio tracks.",
          },
        ],
      };
    }

    for (const track of tracks) {
      const trackType = track.type || "media";
      const codec = await getTrackCodecName(track);

      let canDecode = false;
      try {
        canDecode = await track.canDecode();
      } catch {
        canDecode = false;
      }

      if (!canDecode) {
        unsupportedTracks.push({
          type: trackType,
          codec,
          reason: "browser_unplayable",
          friendlyReason: formatDiscardReason("browser_unplayable", codec, trackType),
        });
      }
    }

    // 2. Check MKV container strict stream copy compatibility
    const output = new Output({
      format: new MkvOutputFormat(),
      target: new BufferTarget(),
    });

    const conversion = await Conversion.init({
      input,
      output,
    });

    if (!conversion.isValid && conversion.discardedTracks.length > 0) {
      for (const discarded of conversion.discardedTracks) {
        const track = discarded.track;
        const trackType = track.type || "unknown";
        const codec = await getTrackCodecName(track);

        const alreadyExists = unsupportedTracks.some(
          (t) => t.type === trackType && t.codec === codec
        );

        if (!alreadyExists) {
          unsupportedTracks.push({
            type: trackType,
            codec,
            reason: discarded.reason,
            friendlyReason: formatDiscardReason(discarded.reason, codec, trackType),
          });
        }
      }
    }

    if (unsupportedTracks.length > 0) {
      return {
        isValid: false,
        unsupportedTracks,
      };
    }

    return { isValid: true, unsupportedTracks: [] };
  } catch (err: any) {
    return {
      isValid: false,
      unsupportedTracks: [
        {
          type: "container",
          codec: "unknown",
          reason: "parser_error",
          friendlyReason: err?.message || "Failed to inspect container streams.",
        },
      ],
    };
  }
}

/**
 * Performs Mediabunny's strict -c copy conversion to MKV before upload.
 * If any tracks cannot be decoded/played by the browser or copied as-is to MKV,
 * throws UnsupportedTracksError.
 */
export async function remuxVideoToMkvStrictCopy(
  file: File | Blob,
  onProgress?: (percent: number, statusText: string) => void
): Promise<File> {
  onProgress?.(2, "Initializing Mediabunny stream parser...");

  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  const canRead = await input.canRead();
  if (!canRead) {
    throw new UnsupportedTracksError([
      {
        type: "container",
        codec: "unknown",
        reason: "unsupported_container",
        friendlyReason: "The video container format cannot be read by the browser.",
      },
    ]);
  }

  onProgress?.(4, "Checking browser playback compatibility of all tracks...");

  const tracks = await input.getTracks();
  if (tracks.length === 0) {
    throw new UnsupportedTracksError([
      {
        type: "media",
        codec: "none",
        reason: "no_media_tracks",
        friendlyReason: "The video file does not contain any readable video or audio tracks.",
      },
    ]);
  }

  const unsupportedTracks: UnsupportedTrackInfo[] = [];

  // Check browser decodability for every track
  for (const track of tracks) {
    const trackType = track.type || "media";
    const codec = await getTrackCodecName(track);

    let canDecode = false;
    try {
      canDecode = await track.canDecode();
    } catch {
      canDecode = false;
    }

    if (!canDecode) {
      unsupportedTracks.push({
        type: trackType,
        codec,
        reason: "browser_unplayable",
        friendlyReason: formatDiscardReason("browser_unplayable", codec, trackType),
      });
    }
  }

  const output = new Output({
    format: new MkvOutputFormat(),
    target: new BufferTarget(),
  });

  onProgress?.(6, "Checking whether the tracks can be copied to MKV...");

  const conversion = await Conversion.init({
    input,
    output,
  });

  // STRICT -c copy & browser playback check
  if (!conversion.isValid && conversion.discardedTracks.length > 0) {
    for (const discarded of conversion.discardedTracks) {
      const track = discarded.track;
      const trackType = track.type || "unknown";
      const codec = await getTrackCodecName(track);

      const alreadyExists = unsupportedTracks.some(
        (t) => t.type === trackType && t.codec === codec
      );

      if (!alreadyExists) {
        unsupportedTracks.push({
          type: trackType,
          codec,
          reason: discarded.reason,
          friendlyReason: formatDiscardReason(discarded.reason, codec, trackType),
        });
      }
    }
  }

  if (unsupportedTracks.length > 0) {
    throw new UnsupportedTracksError(unsupportedTracks);
  }

  onProgress?.(8, "Copying media streams (-c copy → MKV)...");

  conversion.onProgress = (progress) => {
    const pct = Math.min(99, Math.round(progress * 100));
    onProgress?.(pct, `Copying streams to MKV container (${pct}%)...`);
  };

  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer || buffer.byteLength === 0) {
    throw new Error("Stream copy completed but produced empty file buffer.");
  }

  const originalName = file instanceof File ? file.name : "video.mp4";
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const mkvFileName = `${nameWithoutExt}.mkv`;

  return new File([buffer], mkvFileName, {
    type: "video/x-matroska",
    lastModified: Date.now(),
  });
}
