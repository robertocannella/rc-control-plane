// Verifies every theme's text/accent tokens meet a basic WCAG contrast floor
// against that theme's own background, using the standard relative-luminance
// contrast formula. Not a substitute for the dataviz skill's full CVD-safe
// palette validator (which checks perceptual hue distinguishability between
// chart series, not just text-vs-background contrast) — run that too when
// adding/changing categorical chart colors, if available.
//
// Usage: node scripts/check-theme-contrast.js

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function relLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
function contrastRatio(hexA, hexB) {
  const lA = relLuminance(hexToRgb(hexA));
  const lB = relLuminance(hexToRgb(hexB));
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

const themes = {
  light: {
    background: "#ffffff",
    foreground: "#202124",
    "muted-foreground": "#6b7280",
    accent: "#1a73e8",
  },
  dark: {
    background: "#131314",
    foreground: "#e8eaed",
    "muted-foreground": "#9aa0a6",
    accent: "#8ab4f8",
  },
  nord: {
    background: "#2e3440",
    foreground: "#d8dee9",
    "muted-foreground": "#81a1c1",
    accent: "#88c0d0",
  },
  dracula: {
    background: "#282a36",
    foreground: "#f8f8f2",
    "muted-foreground": "#6272a4",
    accent: "#bd93f9",
  },
};

const FLOORS = { foreground: 4.5, "muted-foreground": 3, accent: 3 };

let failed = false;
for (const [theme, tokens] of Object.entries(themes)) {
  console.log(`\n${theme}`);
  for (const [name, hex] of Object.entries(tokens)) {
    if (name === "background") continue;
    const ratio = contrastRatio(hex, tokens.background);
    const floor = FLOORS[name];
    const ok = ratio >= floor;
    if (!ok) failed = true;
    console.log(
      `  ${name.padEnd(18)} ${hex}  ${ratio.toFixed(2)}:1  ${ok ? "OK" : `FAIL (need >= ${floor}:1)`}`,
    );
  }
}

if (failed) {
  console.error("\nOne or more tokens failed the contrast floor.");
  process.exit(1);
}
console.log("\nAll tokens pass.");
