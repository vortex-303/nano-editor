/**
 * Inspects and clears the browser caches that hold downloaded AI models.
 * Two sources:
 *  - `nano-local-models` (our Cache API store for LaMa / MI-GAN / plugin ONNX)
 *  - Transformers.js cache (default name "transformers-cache") for HF models
 * PWA/Workbox caches are intentionally excluded so clearing models never
 * breaks the offline app shell.
 */

const MODEL_CACHE_MATCHERS = [/transformers/i, /nano-local-models/i, /onnx/i];

const isModelCache = (name: string): boolean => MODEL_CACHE_MATCHERS.some((re) => re.test(name));

export interface CachedModel {
  cacheName: string;
  url: string;
  /** Short display label derived from the URL (HF repo id or filename) */
  label: string;
  bytes: number | null;
}

export interface ModelStorageInfo {
  models: CachedModel[];
  totalBytes: number;
  /** navigator.storage.estimate() — total origin usage & quota */
  usageBytes: number | null;
  quotaBytes: number | null;
}

const labelForUrl = (url: string): string => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('huggingface.co')) {
      // /<org>/<model>/resolve/<rev>/<file> → org/model · file
      const parts = u.pathname.split('/').filter(Boolean);
      const repo = parts.slice(0, 2).join('/');
      const file = parts[parts.length - 1];
      return `${repo} · ${file}`;
    }
    return u.pathname.split('/').filter(Boolean).slice(-2).join('/') || u.hostname;
  } catch {
    return url.slice(0, 60);
  }
};

const responseBytes = async (response: Response): Promise<number | null> => {
  const len = response.headers.get('content-length');
  if (len) return Number(len);
  try {
    const blob = await response.clone().blob();
    return blob.size;
  } catch {
    return null;
  }
};

export const listCachedModels = async (): Promise<ModelStorageInfo> => {
  const models: CachedModel[] = [];
  let totalBytes = 0;

  if (typeof caches !== 'undefined') {
    const names = (await caches.keys()).filter(isModelCache);
    for (const cacheName of names) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      for (const req of requests) {
        const res = await cache.match(req);
        const bytes = res ? await responseBytes(res) : null;
        if (bytes) totalBytes += bytes;
        models.push({ cacheName, url: req.url, label: labelForUrl(req.url), bytes });
      }
    }
  }

  let usageBytes: number | null = null;
  let quotaBytes: number | null = null;
  if (navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      usageBytes = est.usage ?? null;
      quotaBytes = est.quota ?? null;
    } catch {
      /* ignore */
    }
  }

  models.sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
  return { models, totalBytes, usageBytes, quotaBytes };
};

export const deleteCachedModel = async (cacheName: string, url: string): Promise<void> => {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(cacheName);
  await cache.delete(url);
};

export const clearAllModels = async (): Promise<void> => {
  if (typeof caches === 'undefined') return;
  const names = (await caches.keys()).filter(isModelCache);
  await Promise.all(names.map((n) => caches.delete(n)));
};

export const formatBytes = (bytes: number | null): string => {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
};
