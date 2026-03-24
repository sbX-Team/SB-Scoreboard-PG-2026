/**
 * One-time script: crop banking.png → shield + "Soccer at Schools" → resources/icon.ico
 * Run: node build-icon.js
 */

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SOURCE = 'C:/SB-Scoreboard/banking.png'
const RESOURCES_DIR = path.join(__dirname, 'resources')

// Image is 1920x1080.
// Crop: shield top → below "at Schools" underline, excluding "BANK OF AMERICA" row.
// Estimated bounds (adjust if output looks off):
const CROP = { left: 160, top: 40, width: 1600, height: 760 }

const SIZES = [16, 32, 48, 64, 128, 256]

async function main () {
  // Verify source exists
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source not found: ${SOURCE}`)
    process.exit(1)
  }

  // Crop to content region, then extend top/bottom with white to make it square
  const squareSide = CROP.width
  const padTotal = squareSide - CROP.height
  const padTop = Math.floor(padTotal / 2)
  const padBottom = padTotal - padTop

  const squareBuffer = await sharp(SOURCE)
    .extract(CROP)
    .extend({
      top: padTop,
      bottom: padBottom,
      left: 0,
      right: 0,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toBuffer()

  // Save 512x512 PNG (used by macOS / Linux builds)
  const png512 = await sharp(squareBuffer).resize(512, 512).png().toBuffer()
  fs.writeFileSync(path.join(RESOURCES_DIR, 'icons', '512x512.png'), png512)
  console.log('Wrote resources/icons/512x512.png')

  // Generate a PNG buffer for each ICO size
  const pngBuffers = await Promise.all(
    SIZES.map(size =>
      sharp(squareBuffer).resize(size, size).png().toBuffer()
    )
  )

  // Build ICO (modern format: embeds PNG blobs directly)
  const ico = buildIco(pngBuffers, SIZES)
  fs.writeFileSync(path.join(RESOURCES_DIR, 'icon.ico'), ico)
  console.log('Wrote resources/icon.ico')

  console.log('Done — rebuild the app to pick up the new icon.')
}

function buildIco (pngBuffers, sizes) {
  const count = sizes.length
  const headerSize = 6
  const dirEntrySize = 16
  const dirSize = headerSize + count * dirEntrySize

  const offsets = []
  let offset = dirSize
  for (const buf of pngBuffers) {
    offsets.push(offset)
    offset += buf.length
  }

  const ico = Buffer.alloc(offset)
  let pos = 0

  // ICONDIR header
  ico.writeUInt16LE(0, pos); pos += 2 // reserved
  ico.writeUInt16LE(1, pos); pos += 2 // type = icon
  ico.writeUInt16LE(count, pos); pos += 2

  // ICONDIRENTRY for each size
  for (let i = 0; i < count; i++) {
    const s = sizes[i]
    ico.writeUInt8(s === 256 ? 0 : s, pos); pos++ // width  (0 means 256)
    ico.writeUInt8(s === 256 ? 0 : s, pos); pos++ // height
    ico.writeUInt8(0, pos); pos++                  // colorCount
    ico.writeUInt8(0, pos); pos++                  // reserved
    ico.writeUInt16LE(1, pos); pos += 2            // planes
    ico.writeUInt16LE(32, pos); pos += 2           // bitCount
    ico.writeUInt32LE(pngBuffers[i].length, pos); pos += 4
    ico.writeUInt32LE(offsets[i], pos); pos += 4
  }

  // PNG image data
  for (const buf of pngBuffers) {
    buf.copy(ico, pos)
    pos += buf.length
  }

  return ico
}

main().catch(err => { console.error(err); process.exit(1) })
