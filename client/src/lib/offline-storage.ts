/**
 * Offline Audio & Track Storage Engine
 * Uses browser IndexedDB to cache full audio tracks for offline playback
 * and device downloads.
 */

const DB_NAME = "versoair_offline_music";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

export interface OfflineTrackRecord {
  id: number | string;
  title: string;
  artistName: string;
  duration?: number;
  coverArt?: string | null;
  audioBlob: Blob;
  downloadedAt: string;
  sizeBytes: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache an audio track locally in IndexedDB for offline playback
 */
export async function saveTrackOffline(
  track: {
    id: number | string;
    title: string;
    artistName: string;
    duration?: number;
    coverArt?: string | null;
  },
  audioBlob: Blob,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: OfflineTrackRecord = {
      id: String(track.id),
      title: track.title,
      artistName: track.artistName,
      duration: track.duration,
      coverArt: track.coverArt,
      audioBlob,
      downloadedAt: new Date().toISOString(),
      sizeBytes: audioBlob.size,
    };

    const req = store.put(record);
    req.onsuccess = () => {
      window.dispatchEvent(
        new CustomEvent("offline-tracks-changed", {
          detail: { trackId: track.id },
        }),
      );
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Fetch all tracks currently cached offline
 */
export async function getOfflineTracks(): Promise<OfflineTrackRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Check if a track is cached offline
 */
export async function isTrackOffline(
  trackId: number | string,
): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(trackId));
      req.onsuccess = () => resolve(Boolean(req.result));
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Get an offline Object URL for playing the track without network
 */
export async function getOfflineAudioUrl(
  trackId: number | string,
): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(trackId));
      req.onsuccess = () => {
        if (req.result?.audioBlob) {
          resolve(URL.createObjectURL(req.result.audioBlob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Remove a track from offline cache
 */
export async function removeOfflineTrack(
  trackId: number | string,
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(String(trackId));
      req.onsuccess = () => {
        window.dispatchEvent(
          new CustomEvent("offline-tracks-changed", { detail: { trackId } }),
        );
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    // silent
  }
}

/**
 * Download track stream into device / browser filesystem and cache it
 */
export async function downloadTrackToDevice(
  trackId: number | string,
  title: string,
  artistName = "Artist",
  coverArt?: string | null,
  duration?: number,
): Promise<Blob> {
  const streamUrl = `/api/music/tracks/${trackId}/stream`;
  const res = await fetch(streamUrl, { credentials: "include" });
  if (!res.ok) throw new Error(`Stream download failed: HTTP ${res.status}`);

  const blob = await res.blob();

  // Save to IndexedDB cache
  await saveTrackOffline(
    {
      id: trackId,
      title,
      artistName,
      coverArt,
      duration,
    },
    blob,
  );

  // Trigger browser download file dialog
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[/\\?%*:|"<>]/g, "_")} - ${artistName.replace(/[/\\?%*:|"<>]/g, "_")}.mp3`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return blob;
}

/**
 * Get total offline storage usage and quota estimate in bytes
 */
export async function getOfflineStorageEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  trackCount: number;
}> {
  const tracks = await getOfflineTracks();
  const trackCount = tracks.length;
  const usageBytes = tracks.reduce((sum, t) => sum + (t.sizeBytes || 0), 0);

  let quotaBytes = 1024 * 1024 * 1024; // 1GB default fallback
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) quotaBytes = estimate.quota;
    } catch {
      // fallback
    }
  }

  return { usageBytes, quotaBytes, trackCount };
}

/**
 * Batch download multiple tracks sequentially with progress callback
 */
export async function downloadBatchTracks(
  tracks: Array<{
    id: number | string;
    title: string;
    artistName?: string;
    coverArt?: string | null;
    duration?: number;
  }>,
  onProgress?: (
    completed: number,
    total: number,
    currentTrackTitle: string,
  ) => void,
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const artist = t.artistName || "Artist";
    if (onProgress) onProgress(i, tracks.length, t.title);

    try {
      const isCached = await isTrackOffline(t.id);
      if (!isCached) {
        const streamUrl = `/api/music/tracks/${t.id}/stream`;
        const res = await fetch(streamUrl, { credentials: "include" });
        if (res.ok) {
          const blob = await res.blob();
          await saveTrackOffline(
            {
              id: t.id,
              title: t.title,
              artistName: artist,
              coverArt: t.coverArt,
              duration: t.duration,
            },
            blob,
          );
          successful++;
        } else {
          failed++;
        }
      } else {
        successful++;
      }
    } catch {
      failed++;
    }
  }

  if (onProgress) onProgress(tracks.length, tracks.length, "Done");
  return { successful, failed };
}
