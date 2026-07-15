export type ProgressCallback = (message: string) => void;

const MODEL_CACHE = 'nano-local-models';

/** Fetch a model file with Cache API persistence (one download per browser). */
export const fetchModelCached = async (
  url: string,
  onProgress?: ProgressCallback,
  label = 'model'
): Promise<ArrayBuffer> => {
  try {
    const cache = await caches.open(MODEL_CACHE);
    const hit = await cache.match(url);
    if (hit) {
      onProgress?.(`Loading ${label} from cache...`);
      return await hit.arrayBuffer();
    }
    onProgress?.(`Downloading ${label} (one time only)...`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Model download failed (${response.status})`);
    await cache.put(url, response.clone());
    return await response.arrayBuffer();
  } catch (error) {
    // Cache API unavailable (e.g. private mode) — plain fetch
    if (error instanceof Error && error.message.includes('download failed')) throw error;
    onProgress?.(`Downloading ${label}...`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Model download failed (${response.status})`);
    return await response.arrayBuffer();
  }
};
