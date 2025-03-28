const fs = require("fs");
const { createCanvas } = require("canvas");

// Icon sizes
const sizes = [16, 32, 48, 128];

// Generate icons
sizes.forEach((size) => {
  // Create canvas
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Fill background with Discord blurple color
  ctx.fillStyle = "#5865F2";
  ctx.fillRect(0, 0, size, size);

  // Add text
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Adjust font size based on icon size
  const fontSize = Math.max(size / 3, 8);
  ctx.font = `bold ${fontSize}px Arial`;

  // Add TXT text
  ctx.fillText("TXT", size / 2, size / 2);

  // Save to file
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(`src/icons/icon${size}.png`, buffer);

  console.log(`Generated icon${size}.png`);
});

console.log("All icons generated successfully!");
