import type { PluginManifest } from '../types';
import type { ProgressCallback } from '@/lib/localAi';
import type { RuntimeInputs, RuntimeOutput } from '../runtimes/transformersRuntime';

const RUN_TIMEOUT_MS = 60_000;

/**
 * Tier-2 sandbox: plugin code runs inside a Worker spawned from a sandboxed,
 * opaque-origin iframe (Figma-style logic isolation, standards-only version):
 * - `sandbox="allow-scripts"` → opaque origin: no cookies, no app storage
 * - iframe CSP restricts network to the manifest's `permissions.net` hosts
 *   (plus data:/blob: for image payloads) — deny by default
 * - no DOM access from the Worker; results come back as data URLs
 * - hard timeout: worker + iframe are destroyed on expiry
 * A fresh iframe is created per run so a wedged plugin can't poison later runs.
 */
export const runInSandbox = (
  manifest: PluginManifest,
  source: string,
  inputs: RuntimeInputs,
  params: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<RuntimeOutput> => {
  const allowedHosts = (manifest.permissions?.net ?? [])
    .map((h) => h.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter((h) => /^[\w.-]+$/.test(h))
    .map((h) => `https://${h}`);
  const connectSrc = ['data:', 'blob:', ...allowedHosts].join(' ');

  const bootstrap = `
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; connect-src ${connectSrc};">
    <script>
      let worker = null;
      window.addEventListener('message', (event) => {
        const { source, inputs, params } = event.data || {};
        if (typeof source !== 'string') return;
        const shim = source + "\\n;(function(){" +
          "self.onmessage = async (e) => {" +
          "  try {" +
          "    if (!self.nanoNode || typeof self.nanoNode.process !== 'function') throw new Error('Plugin must define self.nanoNode.process');" +
          "    const ctx = { progress: (m) => self.postMessage({ type: 'progress', message: String(m) }) };" +
          "    const result = await self.nanoNode.process(e.data.inputs, e.data.params, ctx);" +
          "    if (!result || (result.kind !== 'image' && result.kind !== 'text') || typeof result.value !== 'string') throw new Error('Plugin must return { kind: image|text, value: string }');" +
          "    self.postMessage({ type: 'result', result });" +
          "  } catch (err) {" +
          "    self.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });" +
          "  }" +
          "};" +
          "})();";
        try {
          const blob = new Blob([shim], { type: 'text/javascript' });
          worker = new Worker(URL.createObjectURL(blob));
          worker.onmessage = (e) => parent.postMessage(e.data, '*');
          worker.onerror = (e) => parent.postMessage({ type: 'error', message: e.message || 'Worker error' }, '*');
          worker.postMessage({ inputs, params });
        } catch (err) {
          parent.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) }, '*');
        }
      });
      parent.postMessage({ type: 'ready' }, '*');
    </script>`;

  return new Promise<RuntimeOutput>((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.srcdoc = bootstrap;

    let settled = false;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      iframe.remove();
    };
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const timeout = setTimeout(() => {
      settle(() => reject(new Error(`${manifest.name} timed out after ${RUN_TIMEOUT_MS / 1000}s and was terminated`)));
    }, RUN_TIMEOUT_MS);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data || {};
      if (data.type === 'ready') {
        iframe.contentWindow?.postMessage({ source, inputs, params }, '*');
      } else if (data.type === 'progress') {
        onProgress?.(String(data.message).slice(0, 200));
      } else if (data.type === 'result') {
        clearTimeout(timeout);
        settle(() => resolve(data.result as RuntimeOutput));
      } else if (data.type === 'error') {
        clearTimeout(timeout);
        settle(() => reject(new Error(String(data.message).slice(0, 500))));
      }
    };

    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
  });
};
