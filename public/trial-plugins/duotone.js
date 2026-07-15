// Duotone — example tier-2 scripted node for Nano Editor.
// Runs in a sandboxed Worker: no DOM, no app storage, no network (permissions.net: []).
self.nanoNode = {
  async process(inputs, params, ctx) {
    if (!inputs.image) throw new Error('Connect an image input');
    ctx.progress('Loading image...');

    const hex = (h) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim());
      if (!m) return null;
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const shadow = hex(params.shadow) || [16, 24, 64];      // deep blue
    const highlight = hex(params.highlight) || [255, 214, 92]; // warm yellow

    const blob = await (await fetch(inputs.image)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const c = canvas.getContext('2d');
    c.drawImage(bitmap, 0, 0);

    ctx.progress('Applying duotone...');
    const img = c.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      d[i] = shadow[0] + (highlight[0] - shadow[0]) * lum;
      d[i + 1] = shadow[1] + (highlight[1] - shadow[1]) * lum;
      d[i + 2] = shadow[2] + (highlight[2] - shadow[2]) * lum;
    }
    c.putImageData(img, 0, 0);

    ctx.progress('Encoding...');
    const out = await canvas.convertToBlob({ type: 'image/png' });
    const dataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(out);
    });
    return { kind: 'image', value: dataUrl };
  },
};
