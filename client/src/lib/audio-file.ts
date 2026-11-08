// Shared rules for picking audio files in the browser.
//
// iOS (Safari and the home-screen PWA) greys out valid files such as .mp3 when
// an <input type="file"> carries accept="audio/*" or a mime list, because it
// filters by the file's UTI and drops files whose type it cannot resolve. On
// those devices the input must have NO accept attribute and the file is
// validated after it is picked. The server (server/routes/music.ts) validates
// again, so this is only about a clear message and a working picker.

export const AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "flac",
  "aiff",
  "aif",
  "ogg",
  "m4a",
] as const;

// Must match the multer fileSize limit in server/routes/music.ts.
export const MAX_AUDIO_UPLOAD_BYTES = 100 * 1024 * 1024;
export const MAX_AUDIO_UPLOAD_LABEL = "100 MB";

export const AUDIO_ACCEPT = `${AUDIO_EXTENSIONS.map((e) => `.${e}`).join(",")},audio/*`;

const AUDIO_EXT_RE = new RegExp(`\\.(${AUDIO_EXTENSIONS.join("|")})$`, "i");

interface PlatformInfo {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}

export function isIosLike(info?: PlatformInfo): boolean {
  const nav: PlatformInfo | undefined =
    info ?? (typeof navigator !== "undefined" ? navigator : undefined);
  if (!nav) return false;
  const ua = nav.userAgent ?? "";
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  // iPadOS reports itself as a Mac but has a touch screen.
  return nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1;
}

// Value for the `accept` attribute, or undefined when it must be omitted.
export function audioInputAccept(info?: PlatformInfo): string | undefined {
  return isIosLike(info) ? undefined : AUDIO_ACCEPT;
}

export function isAcceptedAudioFile(file: {
  name: string;
  type?: string;
}): boolean {
  return /^audio\//i.test(file.type ?? "") || AUDIO_EXT_RE.test(file.name);
}

// Returns an error message, or null when the file can be uploaded.
export function audioFileProblem(file: {
  name: string;
  type?: string;
  size: number;
}): string | null {
  if (!isAcceptedAudioFile(file)) {
    return `"${file.name}" is not a supported audio file. Use MP3, WAV, FLAC, AIFF, OGG or M4A.`;
  }
  if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
    return `"${file.name}" is larger than ${MAX_AUDIO_UPLOAD_LABEL}.`;
  }
  return null;
}
