# Nano Editor

**The open-source, browser-native image studio.** Node-based AI image workflows that run **100% client-side** — no backend, no accounts, no database, no uploads.

Live: **https://nano-editor.app** · License: MIT · Plugins: [PLUGINS.md](PLUGINS.md)

- **AI generation/editing** via [fal.ai](https://fal.ai) with your own API key (BYOK): Nano Banana / Nano Banana Pro image models, ESRGAN upscaling, LLM features (campaign strategy, HTML components, URL context).
- **Free local AI** running in your browser (Transformers.js + WebGPU): background removal (RMBG-1.4), 2x super-resolution (Swin2SR), image captioning (Florence-2), depth maps (Depth Anything V2), click-to-cut-out segmentation (SlimSAM).
- **Persistence** in your browser: projects/workflows/snippets in IndexedDB, API keys in localStorage. ZIP export/import for portable backups.
- Optional stock photo search with your own Unsplash Access Key.
- **Plugin system** — community nodes as safe declarative manifests; paste any Transformers.js-compatible Hugging Face model URL and get a working node. See [PLUGINS.md](PLUGINS.md).

## Run locally

```sh
npm install
npm run dev   # → http://localhost:8080
```

On first run the app asks for a fal.ai API key (create one at https://fal.ai/dashboard/keys). The key is stored only in your browser.

## Build & deploy

```sh
npm run build   # static output in dist/
```

The build is a plain static SPA — host it anywhere (Vercel, Cloudflare Pages, GitHub Pages, any web server). No environment variables needed.

## Stack

Vite · React 18 · TypeScript · Tailwind + shadcn/ui · @xyflow/react (node editor) · @fal-ai/client · @huggingface/transformers · idb-keyval
