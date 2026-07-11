const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

// Simple average-color extraction, not a proper "dominant cluster" (e.g.
// k-means) — good enough for a card-tint suggestion and avoids pulling in
// any native/WASM image library, since pure-JS jpeg-js/pngjs decode without
// a compile step (safer for the Docker build than something like sharp).
function averageRgba(data, channels) {
  let r = 0, g = 0, b = 0, count = 0;
  // Sampling every Nth pixel instead of every pixel keeps this fast on
  // large photos without meaningfully changing the average.
  const step = Math.max(1, Math.floor(data.length / channels / 20000));
  for (let i = 0; i + channels <= data.length; i += channels * step) {
    const alpha = channels === 4 ? data[i + 3] : 255;
    if (alpha < 16) continue; // skip near-fully-transparent pixels
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (count === 0) return null;
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}

function toHex({ r, g, b }) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Returns a '#rrggbb' string, or null if the buffer isn't a JPEG/PNG we can
// decode (webp/heic covers, corrupt files, etc.) — callers should treat
// null as "no suggestion available", not an error.
function extractDominantColor(buffer, mimetype) {
  try {
    if (mimetype === 'image/jpeg') {
      const { data, width, height } = jpeg.decode(buffer, { maxMemoryUsageInMB: 256 });
      if (!width || !height) return null;
      const avg = averageRgba(data, 4);
      return avg ? toHex(avg) : null;
    }
    if (mimetype === 'image/png') {
      const png = PNG.sync.read(buffer);
      const avg = averageRgba(png.data, 4);
      return avg ? toHex(avg) : null;
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = { extractDominantColor };
