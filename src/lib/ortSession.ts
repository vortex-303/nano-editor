import * as ort from 'onnxruntime-web';
import { fetchModelCached, type ProgressCallback } from './modelCache';

// Single-threaded WASM: avoids needing cross-origin isolation (SharedArrayBuffer)
ort.env.wasm.numThreads = 1;
// Vite doesn't serve ort's .wasm/.mjs runtime files (the SPA fallback returns
// index.html, which fails the wasm magic-word check) — load them from the CDN,
// pinned to the installed package version.
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

const sessionPromises = new Map<string, Promise<ort.InferenceSession>>();

/** Shared, cached ONNX session per model URL (model bytes cached via Cache API). */
export const getOrtSession = (url: string, onProgress?: ProgressCallback, label = 'model'): Promise<ort.InferenceSession> => {
  if (!sessionPromises.has(url)) {
    const promise = (async () => {
      const buffer = await fetchModelCached(url, onProgress, label);
      onProgress?.('Initializing engine...');
      return await ort.InferenceSession.create(buffer, { executionProviders: ['wasm'] });
    })().catch((error) => {
      sessionPromises.delete(url);
      throw error;
    });
    sessionPromises.set(url, promise);
  }
  return sessionPromises.get(url)!;
};

export { ort };
