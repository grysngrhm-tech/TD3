const sharp = require('sharp');
const path = require('path');

const BRAND_COLOR = '#950606';
const TEXT_COLOR = '#FFFFFF';

async function generateIcon(size, outputPath, fontSize, borderRadius) {
  // Create SVG with TD3 text
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${borderRadius}" fill="${BRAND_COLOR}"/>
      <text
        x="50%"
        y="55%"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="${TEXT_COLOR}"
        font-family="Inter, Arial, sans-serif"
        font-weight="700"
        font-size="${fontSize}px"
      >TD3</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${outputPath}`);
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');

  // Generate all required icons
  await generateIcon(32, path.join(publicDir, 'favicon.png'), 11, 6);
  await generateIcon(180, path.join(publicDir, 'apple-touch-icon.png'), 48, 36);
  await generateIcon(192, path.join(publicDir, 'icon-192.png'), 64, 38);
  await generateIcon(512, path.join(publicDir, 'icon-512.png'), 160, 102);

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
