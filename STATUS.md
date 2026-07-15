# Nano Editor — STATUS

Updated: 2026-07-14 (batch 4 shipped)

## What this is
Node-based AI image workflow editor, fully client-side (no backend). De-Lovabled 2026-07-13 from the original Lovable project (still live separately at nano-art-studio.lovable.app — untouched).

## Deployment
- **Live**: https://nano-editor-wheat.vercel.app (Vercel project `nano-editor`, team nicolas-ruggieris-projects)
- **Custom domain**: nano-editor.app + www attached in Vercel, **waiting on DNS records at IONOS**:
  - A `@` → `76.76.21.21`
  - CNAME `www` → `cname.vercel-dns.com`
  - (delete IONOS's existing A/AAAA parking records on root first)
- Deploy command: `vercel build --prod && vercel deploy --prebuilt --prod`
- SPA rewrites in `vercel.json`; no env vars needed.

## Architecture
- **fal.ai BYOK** (`src/lib/falClient.ts`): image gen/edit via nano-banana (draft) / nano-banana-pro (standard+ultra), `/edit` endpoints when input images present; `fal-ai/esrgan` upscale; `openrouter/router` for text LLM (campaign hooks via `llmJson` zod-retry); results converted to data URLs.
- **Local AI** (`src/lib/localAi.ts`, Transformers.js + WebGPU/wasm): RMBG-1.4 bg removal, Swin2SR 2x/4x (Xenova ONNX ports), Florence-2 captioning (Salesforce BLIP fallback), Depth Anything V2, SlimSAM click-to-mask, OWLv2 find-by-text.
- **LaMa inpainting** (`src/lib/localInpaint.ts`): onnxruntime-web (wasm EP, wasmPaths pinned to jsdelivr CDN 1.27.0 — Vite can't serve ort's wasm), model `Carve/LaMa-ONNX` 198MB cached via Cache API, lazy-loaded chunk.
- **Persistence**: IndexedDB via idb-keyval (`src/lib/localDb.ts`); keys in localStorage (`src/lib/settingsStore.ts`: `nano.falKey`, `nano.unsplashKey`); ZIP export/import unchanged.
- **Unsplash**: optional BYOK Access Key, direct API calls + download tracking per guidelines.

## Nodes added/changed in refactor
- New: Describe Image, Depth Map, Click to Cut Out (click or find-by-text), Object Eraser (SAM+LaMa, click or text), Depth Parallax (WebGL, MP4/WebM export).
- Upscale: engine toggle Local (free 2x/4x) vs fal ESRGAN (2x/4x + face).
- Effects node's bg-removal + super-resolution now use shared localAi (old code silently did bicubic — fixed).

## Verified
- tsc clean, build passes, all HF model IDs verified against Hub API.
- NOT yet live-tested with a real fal key (Prompt→generate etc.).
- Unsplash search needs user's Access Key (AI API Keys modal).

## Plugin framework (Milestone A shipped 2026-07-15)
- Tier-1 declarative plugins: `src/plugins/` (types+zod manifest schema, registry w/ useSyncExternalStore, PluginNode auto-form renderer, transformers/fal/onnx runtimes with WebGPU→WASM fallback, loader + idb store `nano-studio-plugins`, PluginManagerModal, MissingPluginNode fallback, requiredPlugins on save).
- Typed ports + isValidConnection (permissive for unspecified builtin ports).
- Trial registry at `public/trial-plugins/` (index.json + BiRefNet-lite fp32 / ViT-GPT2 caption / NSFW check) — same format the future `nano-editor-plugins` GitHub registry will serve.
- 'Add from HF URL' manifest generator (pipeline_tag → node template).
- Verified in Chrome: install→palette→canvas→typed connect→input propagation→model download→run. Caught real issue: BiRefNet fp16 exceeded GPU storage-buffer limit → added wasm auto-fallback + fp32 manifest. Pending live re-test of full BiRefNet inference.
- Milestone B (tier-2 sandboxed scripted nodes, iframe+worker) and C (public registry repo + CI + ComfyUI workflow importer) NOT started — see plan file.

## Next
1. IONOS DNS records → nano-editor.app live (user doing manually; IONOS API was down 2026-07-14).
2. Live-test fal flows with real key + local nodes end-to-end.
3. Batch 4 SHIPPED 2026-07-14: BEN2 HQ bg-removal (Effects node), MI-GAN 27MB fast-erase engine (EraseNode default; LaMa=quality), frame-exact MP4/WebM/GIF export via mediabunny+gifenc (ParallaxNode; MediaRecorder removed). MI-GAN mask convention (255=keep) needs live-test verification. DDColor/NAFNet skipped — no hosted ONNX found.
4. Remaining candidates (from 2026-07-14 research, see memory/agent report): BEN2 bg removal (MIT, 209MB), SPAN fast 2x upscaler (~20MB), Mediabunny+WebCodecs frame-exact export + gifenc GIF for Parallax, MI-GAN 30MB fast-erase mode, DDColor colorization, NAFNet deblur, FastVLM-0.5B captioner, worker+OffscreenCanvas inference refactor, Transformers.js ModelRegistry "manage models" panel.
