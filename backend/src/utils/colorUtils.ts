import { ColorFamily } from '../types';

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function getColorFamily(hex: string): ColorFamily {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'monochrome';
  
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  if (s < 10) {
    if (l < 15) return 'gray';
    if (l > 85) return 'monochrome';
    return 'gray';
  }

  if (h < 15 || h >= 345) return 'red';
  if (h < 45) return 'orange';
  if (h < 75) return 'yellow';
  if (h < 150) return 'green';
  if (h < 195) return 'cyan';
  if (h < 255) return 'blue';
  if (h < 285) return 'purple';
  if (h < 345) return 'pink';
  
  return 'monochrome';
}

export function getDominantColorFamily(colors: string[]): ColorFamily {
  if (colors.length === 0) return 'monochrome';
  
  const counts: Record<string, number> = {};
  for (const color of colors) {
    const family = getColorFamily(color);
    counts[family] = (counts[family] || 0) + 1;
  }
  
  let maxFamily: ColorFamily = 'monochrome';
  let maxCount = 0;
  for (const [family, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxFamily = family as ColorFamily;
    }
  }
  return maxFamily;
}

export function extractPrimaryColorsFromDataUrl(dataUrl: string, colorCount: number = 5): string[] {
  try {
    const base64 = dataUrl.split(',')[1];
    if (!base64) return [];
    
    const buffer = Buffer.from(base64, 'base64');
    const header = buffer.slice(0, 8).toString('hex');
    
    if (header.startsWith('89504e47')) {
      return extractFromPng(buffer, colorCount);
    }
    
    return generateFallbackColors(colorCount);
  } catch {
    return generateFallbackColors(colorCount);
  }
}

function extractFromPng(buffer: Buffer, colorCount: number): string[] {
  try {
    const colors = new Map<string, number>();
    let offset = 8;
    
    while (offset < buffer.length) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.slice(offset + 4, offset + 8).toString('ascii');
      
      if (type === 'IHDR') {
        offset += 12 + length;
        continue;
      }
      
      if (type === 'IDAT') {
        const sampleStep = Math.max(1, Math.floor(length / 500));
        for (let i = 0; i < length && i < buffer.length - offset - 8; i += sampleStep * 3) {
          const pos = offset + 8 + i;
          if (pos + 2 < buffer.length) {
            const r = buffer[pos];
            const g = buffer[pos + 1];
            const b = buffer[pos + 2];
            const hex = rgbToHex(r, g, b);
            colors.set(hex, (colors.get(hex) || 0) + 1);
          }
        }
      }
      
      offset += 12 + length;
      
      if (colors.size >= colorCount * 10) break;
    }
    
    const sorted = Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, colorCount)
      .map(([color]) => color);
    
    return sorted.length > 0 ? sorted : generateFallbackColors(colorCount);
  } catch {
    return generateFallbackColors(colorCount);
  }
}

function generateFallbackColors(count: number): string[] {
  const palettes = [
    ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
    ['#A8E6CF', '#DCEDC1', '#FFD3B6', '#FFAAA5', '#FF8B94'],
    ['#6C5B7B', '#C06C84', '#F67280', '#F8B500', '#355C7D']
  ];
  return palettes[Math.floor(Math.random() * palettes.length)].slice(0, count);
}

export function getColorHarmonySuggestions(baseColor: string): {
  suggestions: { color: string; type: 'complementary' | 'analogous' | 'triadic' | 'split-complementary'; harmonyScore: number }[]
} {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return { suggestions: [] };
  
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  const suggestions: { color: string; type: 'complementary' | 'analogous' | 'triadic' | 'split-complementary'; harmonyScore: number }[] = [];
  
  const complementary = hslToRgb((h + 180) % 360, s, l);
  suggestions.push({
    color: rgbToHex(complementary.r, complementary.g, complementary.b),
    type: 'complementary',
    harmonyScore: 95
  });
  
  const analog1 = hslToRgb((h + 30) % 360, s, l);
  const analog2 = hslToRgb((h - 30 + 360) % 360, s, l);
  suggestions.push({
    color: rgbToHex(analog1.r, analog1.g, analog1.b),
    type: 'analogous',
    harmonyScore: 85
  });
  suggestions.push({
    color: rgbToHex(analog2.r, analog2.g, analog2.b),
    type: 'analogous',
    harmonyScore: 85
  });
  
  const triad1 = hslToRgb((h + 120) % 360, s, l);
  const triad2 = hslToRgb((h + 240) % 360, s, l);
  suggestions.push({
    color: rgbToHex(triad1.r, triad1.g, triad1.b),
    type: 'triadic',
    harmonyScore: 75
  });
  suggestions.push({
    color: rgbToHex(triad2.r, triad2.g, triad2.b),
    type: 'triadic',
    harmonyScore: 75
  });
  
  const split1 = hslToRgb((h + 150) % 360, s, l);
  const split2 = hslToRgb((h + 210) % 360, s, l);
  suggestions.push({
    color: rgbToHex(split1.r, split1.g, split1.b),
    type: 'split-complementary',
    harmonyScore: 80
  });
  suggestions.push({
    color: rgbToHex(split2.r, split2.g, split2.b),
    type: 'split-complementary',
    harmonyScore: 80
  });
  
  return { suggestions: suggestions.sort((a, b) => b.harmonyScore - a.harmonyScore) };
}

export function calculateColorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return Infinity;
  
  const rmean = (rgb1.r + rgb2.r) / 2;
  const r = rgb1.r - rgb2.r;
  const g = rgb1.g - rgb2.g;
  const b = rgb1.b - rgb2.b;
  
  return Math.sqrt(
    (2 + rmean / 256) * r * r +
    4 * g * g +
    (2 + (255 - rmean) / 256) * b * b
  );
}
