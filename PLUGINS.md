# Nano Editor Plugins ("Nano Nodes")

Nano Editor is extensible with community nodes. There are three tiers:

| Tier | What | Trust model |
|---|---|---|
| 1 — Declarative | A JSON manifest. No code. | Safe by construction — only Nano Editor's own runtimes execute. |
| 2 — Scripted | A pure `process()` function in JS. | Runs in a sandboxed opaque-origin iframe + Web Worker with a CSP network allowlist and a hard timeout. No DOM, no app storage. |
| 3 — Verified | A full React node component. | PR into this repo, reviewed, compiled in. |

Install plugins in the app: **Plugins** (top right) → Browse / Add your own. You can also paste any Transformers.js-compatible **Hugging Face model URL** and a node is generated automatically.

## Tier 1 — manifest format (`nano-node/1`)

```json
{
  "format": "nano-node/1",
  "id": "my-node",
  "name": "My Node",
  "version": "1.0.0",
  "description": "What it does (max 300 chars).",
  "author": "you",
  "homepage": "https://github.com/you/my-node",
  "icon": "🧩",
  "category": "Community",
  "badge": "Local · Free",
  "inputs":  [{ "id": "image", "type": "image" }],
  "outputs": [{ "id": "result", "type": "image" }],
  "params": [
    { "kind": "slider", "key": "strength", "label": "Strength", "min": 0, "max": 1, "step": 0.05, "default": 0.5 },
    { "kind": "select", "key": "mode", "label": "Mode", "options": [{ "value": "a", "label": "A" }], "default": "a" },
    { "kind": "text",   "key": "query", "label": "Query", "placeholder": "..." },
    { "kind": "toggle", "key": "fast", "label": "Fast mode", "default": true }
  ],
  "runtime": { ... },
  "modelSizeMB": 100
}
```

**Port types**: `image`, `images`, `text`, `context`, `batch`, `mask`, `any`. Handle ids follow the app's data-flow conventions (`image`, `prompt`, `result`, `context`, ...). Connections are type-checked.

### Runtimes

**`transformers-pipeline`** — any Transformers.js task, model runs locally in the browser (WebGPU with WASM fallback):
```json
{ "kind": "transformers-pipeline", "task": "image-to-text", "model": "org/model", "dtype": "fp32" }
```
Supported tasks: `background-removal`, `image-to-text`, `image-classification`, `depth-estimation`, `image-segmentation`, `zero-shot-image-classification`, `image-to-image`, `object-detection`, `zero-shot-object-detection`.

**`fal-endpoint`** — cloud inference with the user's own fal.ai key (BYOK):
```json
{
  "kind": "fal-endpoint",
  "endpoint": "fal-ai/some-model",
  "inputMap": { "image_url": "$image", "prompt": "$param.prompt" },
  "outputPath": "images.0.url",
  "outputKind": "image-url"
}
```
Input sources: `$image`, `$images`, `$text`, `$param.<key>`, or a literal string.

**`onnx`** — a raw ONNX image-to-image model (huggingface.co or raw.githubusercontent.com hosted):
```json
{ "kind": "onnx", "modelUrl": "https://huggingface.co/.../model.onnx", "preset": "image-float01-chw", "inputSize": 512 }
```

## Tier 2 — scripted nodes

Manifest uses `"runtime": { "kind": "script", "sourceUrl": "https://.../my-node.js" }` plus optional
`"permissions": { "net": ["api.example.com"] }` (network is **denied by default**).

The script defines a single pure function:

```js
// my-node.js — runs in a sandboxed Worker (no DOM, no app storage)
self.nanoNode = {
  /**
   * @param inputs  { image?: string(dataURL), images?: string[], text?: string }
   * @param params  values of the manifest's params
   * @param ctx     { progress(message: string): void }
   * @returns       { kind: 'image'|'text', value: string }
   */
  async process(inputs, params, ctx) {
    ctx.progress('Working...');
    const blob = await (await fetch(inputs.image)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const c = canvas.getContext('2d');
    c.drawImage(bitmap, 0, 0);
    // ... manipulate pixels ...
    const out = await canvas.convertToBlob({ type: 'image/png' });
    return { kind: 'image', value: await new Promise((res) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(out);
    }) };
  }
};
```

Sandbox guarantees: opaque origin (no cookies, no app localStorage/IndexedDB), CSP `connect-src` restricted to declared hosts + `data:`, hard execution timeout, worker terminated after each run.

## Publishing

Until the public registry repo launches, host your manifest (and tier-2 script) anywhere with CORS (a GitHub raw URL works) and share the URL — users install via **Plugins → Add your own**. Registry index format: see `public/trial-plugins/index.json`.
