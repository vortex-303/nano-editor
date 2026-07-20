# Nano Editor — STATUS

Updated: 2026-07-20

## ▶ RESUME HERE (read this first)

**Project**: `/Users/n/nano-art-studio (1)` — open source at github.com/vortex-303/nano-editor (MIT), live at **nano-editor.app**.
**Deploy**: git push to `main` auto-deploys via Vercel (verified). Local dev: `npm run dev` → localhost:8080. Build: `npm run build` (static, no env vars).
**PWA note**: after a deploy, the FIRST load serves the cached bundle, NEXT load has the update (autoUpdate SW) — normal, not a bug.

**State**: Everything through "launch assets" is DONE, committed, pushed, and verified live. The product + launch kit are ready to go.

**Full history**: below in this file (reverse-chronological-ish by date). Short version of what's shipped:
de-Lovable refactor → fal.ai BYOK + local Transformers.js/ONNX AI → batch 4 (BEN2, MI-GAN, video/GIF export) → plugin framework (tier-1 manifests + tier-2 sandbox) → open-sourced → PWA + full SEO + 5 tool landing pages → Vercel Analytics → designer credibility (undo/redo, shortcuts, Models manager) → 15 workflow templates → launch assets (README + LAUNCH.md + demo GIF + Sponsor links).

**NEXT — pick up here (all are user-gated decisions, nothing half-built):**
1. **SEO guide pages** (`/guides/*`) — PENDING USER GO. Proposed set in the last message: how-to-remove-background, remove-object, upscale-to-4k, photo-to-parallax, run-AI-models-in-browser. Would be static HTML like the tool pages + HowTo/Article JSON-LD, cross-linked to tool pages. Highest-leverage remaining SEO work.
2. **Launch** (user's move): post Show HN (Tue–Thu US AM) + Product Hunt using `LAUNCH.md`; film eraser/parallax Reel (script in LAUNCH.md).
3. **Phase 1 monetization** — hosted "no-key" credits proxy (Vercel fns + Mercado Pago/Stripe). BUILD ONLY when traffic proves demand. BYOK stays free.
4. **Loose ends**: live-test fal BYOK flows with a real key (never done — needs user's fal key); on nano-editor.app reinstall+run BiRefNet plugin to confirm the fp32/WASM GPU fix.

**DEFERRED (do not re-attempt without reason)**: Video AI pillar (user deferred); new-AI-nodes bucket = colorize/deblur/face-restore (NO browser-runnable models: DDColor ONNX repos empty, NAFNet fails in onnxruntime-web, GFPGAN TFLite-only); Milestone C public registry + ComfyUI importer (user skipped workflows); template gallery interpreted as covered by templates (shipped).

**Plan file**: `~/.claude/plans/eager-moseying-corbato.md`.

---

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

## 2026-07-15 — Open-source + Milestone B + PWA/SEO
- **Open-sourced**: github.com/vortex-303/nano-editor (MIT). LICENSE, PLUGINS.md, README rewritten. Vercel git-connected → auto-deploy on push to main (verified working).
- **Milestone B (tier-2 sandboxed plugins) DONE**: `src/plugins/sandbox/host.ts` — opaque-origin iframe + Worker, CSP net-allowlist (deny by default), hard timeout. Verified: duotone runs & returns image; undeclared fetch BLOCKED. Examples: duotone.js/json, ascii-art.js/json in public/trial-plugins.
- **PWA**: vite-plugin-pwa (autoUpdate), installable + offline app-shell; icons in public/icons; models deliberately excluded from Workbox precache (handled by our own Cache API).
- **SEO for all crawlers**: rewrote index.html (title/desc/OG/Twitter/JSON-LD WebApplication + noscript), og-image.png (1200x630, PIL-generated), robots.txt (explicitly allows GPTBot/ClaudeBot/PerplexityBot/Google-Extended/etc.), sitemap.xml, **llms.txt** (designer hooks + "when to recommend"). Removed legacy Lovable tracking (GA G-Z2YHNH6EJQ, ZGate, ARS Ads conversion) — now consistent with privacy-first Privacy page.
- **Analytics gap**: intentionally none. If launch traffic visibility wanted, add cookieless Vercel Analytics (privacy-safe, keeps Privacy page accurate).

## Roadmap position
Done: refactor, batch4, plugin framework A, item1 (OSS), Milestone B, item4 (PWA/SEO).
NEXT per user: (a) DISCUSS workflows before Milestone C, (b) DISCUSS feature list. Then Milestone C (public registry repo + CI + ComfyUI workflow importer), then item 4 designer features (undo/redo, shortcuts, template gallery), then item 5 monetization/launch.
Loose ends: live-test fal BYOK flows with real key; reinstall+run BiRefNet fp32 on nano-editor.app to confirm GPU fix.

## 2026-07-15 (cont) — Analytics, designer credibility, SEO landing pages
- **Vercel Analytics** (cookieless) added — privacy-safe, keeps Privacy page accurate.
- **Designer credibility shipped & browser-verified**: structural undo/redo (Cmd+Z / Cmd+Shift+Z, snapshots on add/delete/connect/drag; scope = structural since node content lives in local state), keyboard shortcuts (Cmd+S save, Cmd+D duplicate, F fit, Esc, ? help) + ShortcutsModal, **Models manager panel** (lists Cache API model files w/ sizes + delete/clear-all; found 21 files/529MB in test). Template gallery NOT built (interpreted "skip workflows" to include it — confirm if wanted).
- **Per-tool SEO landing pages** (`/tools/{remove-background,object-eraser,upscale-image,depth-parallax,describe-image}`): real static HTML (all crawlers), gen script `scripts/gen-landing.mjs` (prebuild), meta+OG+JSON-LD(SoftwareApplication+FAQPage), FAQ, deep-link `?tool=` presets (`src/lib/toolPresets.ts`) that preload Image Input→target connected. Verified live in prod.
- **Routing gotcha fixed**: `cleanUrls:true` broke SPA fallback (extensionless routes 404). Final `vercel.json`: `/tools/:name → :name.html` rewrite + `/(.*) → /index.html` catch-all, NO cleanUrls. All SPA routes + all tool pages verified 200 in prod.
- **New local-AI nodes bucket = DEFERRED (honest)**: DDColor colorization has no accessible browser ONNX (Xenova/onnx-community repos are empty stubs); NAFNet deblur ONNX exists (87MB) but its SCA/Pad ops fail in onnxruntime-web (`{1,64,0,0}` shape collapse) — validated my onnx runtime works, model is incompatible; GFPGAN is TFLite-only + needs face detect/align/paste. These need real per-model porting (re-export fixed shapes / custom pipelines), not quick adds.
- **REMAINING**: Video AI pillar (task 24) — large distinct effort (WebCodecs decode→process→encode + mediabunny mux, MediaPipe/RVM matting, per-frame upscale). Warrants user confirmation of scope before big investment.

## 2026-07-15 (cont) — Workflow templates
- **15 pre-wired templates** (`src/lib/templates.ts`): 10 fully-local/free + 5 BYOK. Each build() returns a connected {nodes,edges} graph with correct handle ids; presets node params via node.data (e.g. Effects selectedEffect='removeBackgroundHQ', Upscale upscaleEngine='local', prompt text). Verified: applying "Cutout + Upscale" loaded ImageInput→Effects→Upscale→ImageOutput with edges + presets rendered.
- **UI**: TemplatesModal (gallery, grouped local/BYOK) + TemplateStarter (empty-canvas overlay, 6 featured) + Menu→Templates. applyTemplate in NodeEditor (snapshots for undo, seeds nodeData, fitView). Verified live on nano-editor.app (starter shows after SW update).
- Note: `.react-flow__edge-path` DOM selector reads 0 in automation but edges render correctly (visual + preset data confirmed) — automation quirk, not a bug.
- PWA autoUpdate: post-deploy first load serves cached bundle, next load = new. Expected.

## Roadmap status (2026-07-15 end)
DONE: refactor, batch4, plugin framework (A+B), OSS(item1), PWA+SEO+landing pages, analytics, designer credibility (undo/redo, shortcuts, Models manager), 15 workflow templates.
DEFERRED: new-AI-nodes bucket (no browser-runnable colorize/deblur/restore models), Video AI pillar (user deferred), Milestone C (public registry + ComfyUI import — user skipped).
NEXT candidates: item 5 (monetization/launch strategy), live-test fal BYOK w/ real key, or revisit video/new-nodes if models improve.

## 2026-07-15 (cont) — Launch assets (item 5, Phase 0)
- Positioning locked: "the design toolbox that lives in your browser" — consolidates the scattered single-purpose sites (generate/edit/cutout/erase/upscale) into one free canvas. NO Lovable origin story.
- **LAUNCH.md**: positioning + one-liners, Show HN post (+ seed comment), Product Hunt copy, tweet, Reel/TikTok script, channel order. LATAM angle = "gratis, privado, sin cuenta".
- **README rebuilt**: og-image hero + template-pipeline GIF (docs/nano-template-pipeline.gif) + feature grid + why-different + tech. Images verified reachable on GitHub raw.
- **App footer**: added GitHub + "sponsor development" links (github.com/sponsors/vortex-303), removed stale "Nodetools.org" credit.
- Demo GIF: recorded template→pipeline flow via browser gif_creator → docs/. Eraser/parallax "wow" GIFs left for founder-filmed screen recording (Reel script in LAUNCH.md — real recording beats automated).
- **Monetization plan (from strategy discussion)**: Phase 0 = free, grow via free-tools SEO + Show HN/PH/HF (now ready). Phase 1 = hosted "no-key" credits tier (thin fal proxy on Vercel functions + Mercado Pago/Stripe) — BUILD ONLY when traffic proves demand; BYOK stays free. Phase 2 = plugin marketplace + team features. MIT means revenue must come from hosted services a fork can't replicate.
