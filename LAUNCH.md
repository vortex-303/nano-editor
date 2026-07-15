# Nano Editor — launch kit

## Positioning

**Nano Editor is the design toolbox that lives in your browser.**

Every day designers bounce between a background remover on one site, an upscaler on another, a captioner somewhere else, a generator behind a paywall, an object eraser that watermarks the result. Nano Editor puts all of it on one canvas — generate, edit, cut out, erase, upscale, describe, animate — and most of it runs **for free, locally, in your browser**. No account. No uploads. No subscription.

One-liners (pick per channel):
- "All the scattered AI image tools you juggle across five tabs — in one free canvas."
- "Your design toolbox and creative sidekick, running entirely in the browser."
- "Generate, edit, cut out, upscale, animate. One place. No account. No uploads."
- "The parts of Photoshop + remove.bg + an upscaler + a generator you actually use — free and private."

Pillars:
- **One place** — a node canvas that chains tools instead of round-tripping between sites.
- **Free & local** — background removal, object erase, upscaling, depth, captioning, segmentation run on-device (WebGPU). Cloud generation is optional with your own key.
- **Private** — your images never leave your machine for the local tools. No account, ever.
- **Open & extensible** — MIT, and anyone can add a node (paste a Hugging Face model URL, or ship a plugin).

---

## Show HN

**Title:** Show HN: Nano Editor – a free, in-browser AI image toolbox (no account, no uploads)

**Body:**

Nano Editor is a node-based image studio that runs entirely in your browser. It's the thing I kept wishing existed while bouncing between a background remover, an upscaler, a captioner, and a generator — each on a different site, half of them behind a signup or a watermark.

It puts those on one canvas:
- **Free & local (WebGPU, nothing uploaded):** background removal (BEN2/BiRefNet/RMBG), object eraser (Segment Anything + LaMa/MI-GAN inpainting — click or *describe* what to remove), 2×/4× upscaling, depth maps, click/text segmentation, image captioning, and a photo→2.5D-parallax-video node with MP4/GIF export.
- **Cloud, bring-your-own-key:** image generation & editing via fal.ai (Nano Banana), so you pay the provider directly with no markup.
- **Extensible:** community nodes are safe declarative JSON manifests, or sandboxed scripts. You can paste any Transformers.js-compatible Hugging Face model URL and it generates a working node.

It's a static SPA — no backend at all. Projects live in your browser (IndexedDB), keys in localStorage. Installable as a PWA and works offline once models are cached.

Live: https://nano-editor.app
Source (MIT): https://github.com/vortex-303/nano-editor

Tech: Vite + React + @xyflow/react, Transformers.js + onnxruntime-web on WebGPU, Mediabunny/WebCodecs for video export. Happy to go deep on the local-AI and plugin-sandbox pieces.

**First comment (seed the technical discussion):**
A few things that were fun to get working in-browser: running Segment Anything + LaMa for object removal fully client-side; a WebGPU→WASM fallback so a model that's too heavy for a given GPU still runs; and a tier-2 plugin sandbox (opaque-origin iframe + Worker with a CSP network allowlist) so community scripts can't phone home. Ask me anything.

---

## Product Hunt

**Tagline:** The free AI image toolbox that runs in your browser

**Description:**
Nano Editor brings the scattered tools designers juggle — background removal, object erasing, upscaling, generation, captioning, depth & parallax — onto one node canvas. Most of it runs free and locally on your device (nothing uploaded); cloud generation is optional with your own API key. No account, open source (MIT), installable as an app.

**First comment:**
Hi PH 👋 I built Nano Editor because I was tired of round-tripping between five different single-purpose sites (and hitting a signup or watermark on each). Everything local is genuinely free and private — your images never leave your browser. It's also open source and extensible: you can add a node from any compatible Hugging Face model URL. Would love your feedback on which tools/nodes to add next.

---

## X / short-form (tweet + Reel/TikTok script)

**Tweet:**
Everything you bounce between five tabs for — background removal, object eraser, upscaler, generator, captioner — on one canvas. Free. In your browser. Nothing uploaded. Open source.
→ nano-editor.app

**Reel/TikTok (15–20s, no voice needed, text overlays):**
1. "You for one image edit:" → montage of 5 browser tabs (remove.bg, an upscaler, a generator, …)
2. "Or…" → Nano Editor canvas
3. Drag a photo in → click the dog → it's cut out (transparent) — *"cut out anything, free"*
4. Type "the car" → it vanishes — *"erase by describing it"*
5. One click → photo turns into a moving 2.5D parallax clip — *"animate a still"*
6. End card: "All free. In your browser. nano-editor.app"

---

## Channels & order
1. Ship the GIFs + README (done in repo).
2. Post Show HN (Tue–Thu morning US). Seed first comment immediately.
3. Product Hunt (same or next day).
4. r/webdev, r/StableDiffusion, r/graphic_design (lead with the eraser/parallax GIF, not a sales pitch).
5. A Hugging Face Space + a note in transformers.js-examples discussions (credibility with the ML crowd).
6. One Reel/TikTok of the eraser + parallax (they demo best visually).
7. LATAM: lead messaging with "gratis, privado, sin cuenta" — the free-local angle lands hardest where USD SaaS pricing stings.
