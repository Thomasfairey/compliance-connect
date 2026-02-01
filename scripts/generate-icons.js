// Script to generate PWA icons
// Run with: node scripts/generate-icons.js

const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, "..", "public", "icons");

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a simple SVG icon and save as files
const createSvgIcon = (size) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">C</text>
</svg>`;
  return svg;
};

// Generate icons
sizes.forEach((size) => {
  const svgContent = createSvgIcon(size);
  const filePath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filePath, svgContent);
  console.log(`Created: icon-${size}x${size}.svg`);
});

// Create shortcut icons
const shortcutIcons = [
  { name: "shortcut-today", emoji: "📅" },
  { name: "shortcut-calendar", emoji: "📆" },
  { name: "shortcut-earnings", emoji: "💰" },
];

shortcutIcons.forEach(({ name, emoji }) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="19" fill="#3b82f6"/>
  <text x="50%" y="55%" font-size="48" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
</svg>`;
  fs.writeFileSync(path.join(iconsDir, `${name}.svg`), svg);
  console.log(`Created: ${name}.svg`);
});

// Create badge icon
const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <circle cx="36" cy="36" r="36" fill="#3b82f6"/>
  <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">C</text>
</svg>`;
fs.writeFileSync(path.join(iconsDir, "badge-72x72.svg"), badgeSvg);
console.log("Created: badge-72x72.svg");

console.log("\nIcons generated successfully!");
console.log("Note: For production, convert these SVGs to PNGs using a tool like sharp or imagemagick.");
