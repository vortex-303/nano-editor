/**
 * Generates static, self-contained SEO landing pages for each free tool into
 * public/tools/*.html. Real HTML (no JS needed) so every crawler — search and
 * social and AI — sees full content. The CTA deep-links into the editor with
 * ?tool=<id>, which preloads a starter graph.
 *
 * Run: node scripts/gen-landing.mjs   (also wired into prebuild)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'public', 'tools');
const SITE = 'https://nano-editor.app';

const TOOLS = [
  {
    id: 'remove-background',
    h1: 'Free Background Remover',
    title: 'Free Background Remover — No Signup, No Watermark | Nano Editor',
    desc: 'Remove image backgrounds instantly in your browser. AI-powered, free, no account, no upload — your photo never leaves your device. Export a transparent PNG.',
    keywords: 'background remover, remove background free, no watermark, transparent PNG, AI background removal',
    tagline: 'Erase any background in seconds — free, private, and right in your browser.',
    steps: [
      'Add your image (drag & drop, paste, or a URL).',
      'Run the Remove Background node — a local AI model (RMBG / BEN2 / BiRefNet) cuts out the subject.',
      'Download a transparent PNG. Nothing is uploaded to a server.',
    ],
    faqs: [
      ['Is it really free?', 'Yes. Background removal runs locally in your browser with no account, no watermark, and no per-image cost.'],
      ['Do my images get uploaded?', 'No. The AI model runs on your device — your photos never leave your computer.'],
      ['What quality can I expect?', 'We use state-of-the-art open models (BEN2 / BiRefNet) with fine hair- and edge-level matting.'],
    ],
  },
  {
    id: 'object-eraser',
    h1: 'Remove Objects from Photos',
    title: 'Free Object Eraser — Remove Anything from a Photo | Nano Editor',
    desc: 'Erase unwanted objects, people, or text from photos for free, in your browser. Click or describe what to remove; AI inpainting fills the gap. No upload, no account.',
    keywords: 'object remover, remove object from photo, magic eraser free, inpainting, remove person from photo',
    tagline: 'Point at anything — or describe it in words — and make it disappear.',
    steps: [
      'Add your photo.',
      'Click the object to erase, or type what to remove (e.g. "the car"). Segmentation + AI inpainting (SAM + LaMa/MI-GAN) fill the background.',
      'Download the cleaned image — processed entirely on your device.',
    ],
    faqs: [
      ['How is this different from a clone-stamp?', 'AI inpainting reconstructs the hidden background automatically, so you do not have to manually paint over the object.'],
      ['Can I remove text or logos?', 'Yes — click or describe the region and it is erased and filled in.'],
      ['Is there a watermark or limit?', 'No watermark, no limit. It runs free and locally in your browser.'],
    ],
  },
  {
    id: 'upscale-image',
    h1: 'Free Image Upscaler',
    title: 'Free AI Image Upscaler — 2x / 4x, No Upload | Nano Editor',
    desc: 'Upscale and enhance images 2x or 4x for free with AI, directly in your browser. No account, no upload, no watermark. Runs on WebGPU with a fast local model.',
    keywords: 'image upscaler, AI upscale free, enhance image, 4x upscale, super resolution browser',
    tagline: 'Enlarge and sharpen images with AI — free, and without uploading a thing.',
    steps: [
      'Add the image you want to enlarge.',
      'Pick 2x or 4x and run the Upscale node. A local super-resolution model (Swin2SR) reconstructs detail.',
      'Download the higher-resolution result.',
    ],
    faqs: [
      ['How big can I upscale?', 'Choose 2x or 4x. The free local engine runs on your GPU via WebGPU; a cloud engine is also available with your own key.'],
      ['Are my images uploaded?', 'No. The local upscaler runs on your device — nothing is sent to a server.'],
      ['Is it free?', 'The local 2x/4x upscaler is completely free with no watermark.'],
    ],
  },
  {
    id: 'depth-parallax',
    h1: 'Turn a Photo into a 2.5D Parallax Video',
    title: 'Photo to 2.5D Parallax Video — Free Depth Animation | Nano Editor',
    desc: 'Convert any photo into a 2.5D parallax animation and export MP4, WebM, or GIF — free, in your browser. AI depth estimation, no upload, no account.',
    keywords: 'parallax video, 2.5D photo animation, depth map, photo to video free, parallax maker',
    tagline: 'Give any still photo cinematic depth and motion — then export it as video or GIF.',
    steps: [
      'Add a photo.',
      'A local model estimates its depth map, and a WebGL shader animates the parallax. Tune the strength live.',
      'Export a frame-exact MP4, WebM, or GIF.',
    ],
    faqs: [
      ['What formats can I export?', 'MP4 (H.264), WebM (VP9), or animated GIF — all rendered frame-exact in the browser.'],
      ['Do I need a depth map?', 'No — depth is computed automatically with Depth Anything V2. You can also feed your own.'],
      ['Is it free and private?', 'Yes. Everything runs locally; your photo is never uploaded.'],
    ],
  },
  {
    id: 'describe-image',
    h1: 'AI Image Describer & Captioner',
    title: 'Free AI Image Describer / Captioner — Local & Private | Nano Editor',
    desc: 'Generate a detailed description or caption for any image, free and in your browser. Great for alt text, prompts, and cataloguing. No upload, no account.',
    keywords: 'image captioner, describe image AI, alt text generator, image to text, image description free',
    tagline: 'Get an accurate, detailed caption for any image — for alt text, prompts, or search.',
    steps: [
      'Add an image.',
      'Run the Describe Image node — a local vision model (Florence-2 / ViT-GPT2) writes a caption.',
      'Copy the text, or wire it straight into a prompt for image generation.',
    ],
    faqs: [
      ['What can I use the caption for?', 'Accessibility alt text, image search/cataloguing, or as a starting prompt for AI image generation.'],
      ['Does it work offline?', 'After the model downloads once, yes — it runs fully in your browser.'],
      ['Is it free?', 'Yes, with no account and no per-image cost.'],
    ],
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const otherTools = (id) => TOOLS.filter((t) => t.id !== id);

const page = (t) => {
  const url = `${SITE}/tools/${t.id}`;
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faqs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${t.h1} — Nano Editor`,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any (web browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
    url,
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#0a0a0f" />
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}" />
<meta name="keywords" content="${esc(t.keywords)}" />
<link rel="canonical" href="${url}" />
<link rel="icon" type="image/png" href="/lovable-uploads/9aa2a972-8168-49fe-9476-6ecfd753ac01.png" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(t.title)}" />
<meta property="og:description" content="${esc(t.desc)}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(t.title)}" />
<meta name="twitter:description" content="${esc(t.desc)}" />
<meta name="twitter:image" content="${SITE}/og-image.png" />
<script type="application/ld+json">${JSON.stringify(appJsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0a0a0f;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6}
a{color:#fbbf24;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:780px;margin:0 auto;padding:0 24px}
header{padding:24px 0;border-bottom:1px solid rgba(255,255,255,.08)}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;color:#fff}
.brand span{color:#fbbf24;font-size:22px}
h1{font-size:clamp(32px,6vw,52px);line-height:1.1;margin:48px 0 12px;color:#fff}
.tagline{font-size:20px;color:#c4b5fd;margin:0 0 28px}
.cta{display:inline-block;background:#fbbf24;color:#0a0a0f;font-weight:700;padding:14px 28px;border-radius:12px;font-size:17px;margin:8px 0 8px}
.cta:hover{text-decoration:none;filter:brightness(1.05)}
.muted{color:#9ca3af;font-size:14px}
h2{font-size:26px;margin:44px 0 16px;color:#fff}
ol,ul{padding-left:22px}
li{margin:8px 0}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}
.chip{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);color:#fde68a;padding:6px 14px;border-radius:999px;font-size:14px}
.faq{border-top:1px solid rgba(255,255,255,.08);padding:18px 0}
.faq h3{margin:0 0 6px;font-size:17px;color:#fff}
.faq p{margin:0;color:#c9ccd3}
footer{border-top:1px solid rgba(255,255,255,.08);margin-top:56px;padding:28px 0 60px;color:#9ca3af;font-size:14px}
footer a{margin-right:14px}
.tools-links{margin:12px 0}
</style>
</head>
<body>
<header><div class="wrap"><a class="brand" href="/"><span>&#10022;</span> Nano Editor</a></div></header>
<main class="wrap">
<h1>${esc(t.h1)}</h1>
<p class="tagline">${esc(t.tagline)}</p>
<a class="cta" href="/?tool=${t.id}">Open the tool &rarr;</a>
<div class="muted">Free &middot; No account &middot; No upload &middot; Open source</div>

<div class="chips">
<span class="chip">100% in your browser</span>
<span class="chip">Private &mdash; no upload</span>
<span class="chip">No watermark</span>
<span class="chip">Free &amp; open source</span>
</div>

<h2>How it works</h2>
<ol>${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>

<h2>Why Nano Editor</h2>
<ul>
<li><strong>Private by design.</strong> The AI runs on your device with WebGPU &mdash; your images never leave your computer.</li>
<li><strong>Actually free.</strong> No account, no subscription, no watermark, no per-image cost.</li>
<li><strong>Part of a full studio.</strong> This tool is one node in a visual, node-based image editor &mdash; chain it with background removal, upscaling, generation and more.</li>
<li><strong>Open source.</strong> <a href="https://github.com/vortex-303/nano-editor">MIT-licensed on GitHub</a>.</li>
</ul>

<a class="cta" href="/?tool=${t.id}">Open the tool &rarr;</a>

<h2>FAQ</h2>
${t.faqs.map(([q, a]) => `<div class="faq"><h3>${esc(q)}</h3><p>${esc(a)}</p></div>`).join('')}
</main>
<footer class="wrap">
<div class="tools-links"><strong style="color:#e5e7eb">More free tools:</strong><br>
${otherTools(t.id).map((o) => `<a href="/tools/${o.id}">${esc(o.h1)}</a>`).join(' ')}
</div>
<div><a href="/">Open editor</a> <a href="https://github.com/vortex-303/nano-editor">GitHub</a> <a href="/privacy">Privacy</a></div>
</footer>
</body>
</html>`;
};

mkdirSync(outDir, { recursive: true });
for (const t of TOOLS) {
  writeFileSync(resolve(outDir, `${t.id}.html`), page(t), 'utf8');
  console.log(`generated tools/${t.id}.html`);
}

// Emit the tool ids for sitemap use
console.log('TOOL_IDS=' + TOOLS.map((t) => t.id).join(','));
