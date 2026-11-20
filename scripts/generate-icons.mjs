/**
 * Generate ikon launcher Android dari public/logo.png.
 *
 * Jalankan: npm run icons
 *
 * Menghasilkan (di android/app/src/main/res/mipmap-<density>/):
 *   ic_launcher.png            launcher standar
 *   ic_launcher_round.png      launcher bulat
 *   ic_launcher_foreground.png adaptive, kanvas 108dp
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const SRC = 'public/logo.png'
const RES_DIR = 'android/app/src/main/res'

// density -> ukuran ikon standar dalam px (48dp = mdpi)
const DENSITIES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
}

async function main() {
  await mkdir(path.dirname(SRC), { recursive: true })

  for (const [dir, size] of Object.entries(DENSITIES)) {
    const out = path.join(RES_DIR, dir)
    await mkdir(out, { recursive: true })

    await sharp(SRC).resize(size, size, { fit: 'cover' }).png().toFile(path.join(out, 'ic_launcher.png'))
    await sharp(SRC).resize(size, size, { fit: 'cover' }).png().toFile(path.join(out, 'ic_launcher_round.png'))

    // Adaptive foreground: kanvas 108dp-equivalent. Logo dipotong (cover)
    // supaya tidak gepeng, lalu dikecilkan ke ~62% kanvas supaya aman
    // dari pemotongan shape launcher (lingkaran/pil).
    const fg = Math.round((size * 108) / 48)
    const inner = Math.round(fg * 0.62)
    const logo = await sharp(SRC).resize(inner, inner, { fit: 'cover' }).png().toBuffer()

    await sharp({
      create: {
        width: fg,
        height: fg,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: logo,
          left: Math.round((fg - inner) / 2),
          top: Math.round((fg - inner) / 2),
        },
      ])
      .png()
      .toFile(path.join(out, 'ic_launcher_foreground.png'))

    console.log(`${dir}: ${size}px`)
  }

  console.log('Ikon selesai.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
