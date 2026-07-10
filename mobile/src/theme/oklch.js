// Port of the CSS oklch() -> sRGB conversion (Björn Ottosson's OKLab formulas),
// since React Native styles don't understand oklch() and the design tokens
// in Puntuaciones App.dc.html are all defined in oklch.
export function oklchToHex(l, c, h, alpha = 1) {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  let r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toSrgb = (channel) => {
    const clamped = Math.max(0, Math.min(1, channel));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  r = toSrgb(r);
  g = toSrgb(g);
  bl = toSrgb(bl);

  const toByte = (channel) => Math.round(Math.max(0, Math.min(1, channel)) * 255);
  const rB = toByte(r);
  const gB = toByte(g);
  const bB = toByte(bl);

  if (alpha >= 1) {
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(rB)}${toHex(gB)}${toHex(bB)}`;
  }
  return `rgba(${rB}, ${gB}, ${bB}, ${alpha})`;
}
