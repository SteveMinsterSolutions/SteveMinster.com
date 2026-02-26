import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const faviconSvg = Buffer.from(readFileSync(resolve(root, 'public/favicon.svg')));

// Generate favicon PNGs
await sharp(faviconSvg)
  .resize(16, 16)
  .png()
  .toFile(resolve(root, 'public/favicon-16x16.png'));
console.log('Created favicon-16x16.png');

await sharp(faviconSvg)
  .resize(32, 32)
  .png()
  .toFile(resolve(root, 'public/favicon-32x32.png'));
console.log('Created favicon-32x32.png');

// Generate apple-touch-icon
await sharp(faviconSvg)
  .resize(180, 180)
  .png()
  .toFile(resolve(root, 'public/apple-touch-icon.png'));
console.log('Created apple-touch-icon.png');

// Generate OG image: logo centered on dark background
const logoSvg = Buffer.from(readFileSync(resolve(root, 'public/images/sm-logo.svg')));
const logoSize = 300;
const ogWidth = 1200;
const ogHeight = 630;

const logoPng = await sharp(logoSvg)
  .resize(logoSize, logoSize)
  .png()
  .toBuffer();

await sharp({
  create: {
    width: ogWidth,
    height: ogHeight,
    channels: 3,
    background: { r: 8, g: 13, b: 19 },
  },
})
  .composite([
    {
      input: logoPng,
      left: Math.round((ogWidth - logoSize) / 2),
      top: Math.round((ogHeight - logoSize) / 2),
    },
  ])
  .png()
  .toFile(resolve(root, 'public/images/og-image.png'));
console.log('Created og-image.png (1200x630)');

console.log('All assets generated successfully!');
