/**
 * Pembangun perintah ESC/POS untuk printer 58 mm (BluePrint BP-ECO58D dan sejenis).
 */

const ESC = 0x1b
const GS = 0x1d

function u8(...bytes) {
  return new Uint8Array(bytes)
}

function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function textLine(str = '') {
  return new TextEncoder().encode(`${str}\n`)
}

function initPrinter() {
  return u8(ESC, 0x40)
}

function align(mode) {
  // 0 left, 1 center, 2 right
  return u8(ESC, 0x61, mode)
}

function bold(on) {
  return u8(ESC, 0x45, on ? 1 : 0)
}

function feed(lines = 3) {
  return u8(ESC, 0x64, Math.min(Math.max(lines, 0), 255))
}

function cutPartial() {
  return u8(GS, 0x56, 0x42, 0x00)
}

/**
 * QR Code model 2 (GS ( k ), umum di printer thermal ESC/POS.
 */
function qrCode(data, moduleSize = 5) {
  const encoded = new TextEncoder().encode(data)
  const size = Math.min(Math.max(moduleSize, 2), 8)

  const storeLen = encoded.length + 3
  const pL = storeLen & 0xff
  const pH = (storeLen >> 8) & 0xff

  const model = u8(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00)
  const mod = u8(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size)
  const err = u8(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x33) // level H

  const storeHeader = u8(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30)
  const store = concat(storeHeader, encoded)
  const print = u8(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30)

  return concat(model, mod, err, store, print)
}

export function bytesToBase64(bytes) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

/**
 * Susun struk suara 58 mm: header, QR payload, footer.
 */
export function buildBallotReceiptBytes({
  villageLine,
  tpsLine,
  qrPayload,
  ballotId,
  footerLine,
}) {
  return concat(
    initPrinter(),
    align(1),
    bold(true),
    textLine('SURAT SUARA'),
    bold(false),
    textLine(villageLine),
    textLine(tpsLine),
    textLine(''),
    qrCode(qrPayload, 5),
    textLine(''),
    align(1),
    textLine(ballotId || ''),
    textLine(''),
    align(1),
    textLine(footerLine || 'Simulasi: bukan surat suara sah.'),
    feed(4),
    cutPartial(),
  )
}

export function buildTestReceiptBytes() {
  return concat(
    initPrinter(),
    align(1),
    bold(true),
    textLine('TES CETAK'),
    bold(false),
    textLine('Simulasi Pilkades'),
    textLine('BluePrint BP-ECO58D'),
    textLine(''),
    qrCode('SPV1|TEST|printer|ok', 5),
    textLine(''),
    textLine('Printer terhubung.'),
    feed(4),
    cutPartial(),
  )
}
