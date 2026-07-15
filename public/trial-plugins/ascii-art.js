// ASCII Art — example tier-2 scripted node for Nano Editor (image → text).
self.nanoNode = {
  async process(inputs, params, ctx) {
    if (!inputs.image) throw new Error('Connect an image input');
    ctx.progress('Loading image...');

    const width = Math.max(20, Math.min(200, Number(params.width) || 80));
    const ramp = ' .:-=+*#%@';

    const blob = await (await fetch(inputs.image)).blob();
    const bitmap = await createImageBitmap(blob);
    // Characters are ~2x taller than wide — halve the row count
    const height = Math.max(10, Math.round((bitmap.height / bitmap.width) * width * 0.5));

    const canvas = new OffscreenCanvas(width, height);
    const c = canvas.getContext('2d');
    c.drawImage(bitmap, 0, 0, width, height);
    const { data } = c.getImageData(0, 0, width, height);

    ctx.progress('Rendering ASCII...');
    let out = '';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        out += ramp[Math.min(ramp.length - 1, Math.floor(lum * ramp.length))];
      }
      out += '\n';
    }
    return { kind: 'text', value: out };
  },
};
