import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../public')
const svgPath = path.join(publicDir, 'favicon.svg')

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
]

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath)
  
  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, name))
    console.log(`Generated ${name}`)
  }
  
  const largeSvg = await sharp(svgBuffer).resize(400, 400).toBuffer()
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([{ input: largeSvg, gravity: 'center' }])
  .png()
  .toFile(path.join(publicDir, 'og-image.png'))
  console.log('Generated og-image.png')
}

generate().catch(console.error)