import { desaLabel } from './format.js'
import { buildBallotReceiptBytes, buildTestReceiptBytes } from './escpos.js'
import { isNativePrinterAvailable, printRawBytes } from './bluetoothPrinter.js'
import { formatJam, formatTanggal } from '../store'

function buildLines(ballot, payload, session) {
  const issuedAt = new Date(ballot.issuedAt)
  const villageLine = `PEMILIHAN KEPALA DESA ${desaLabel(session.village).toUpperCase()}`
  const tpsLine = `TPS ${session.tps || '1'} / BILIK ${session.bilik || '1'}`
  const footerLine = `Simulasi: bukan surat suara sah. ${formatTanggal(issuedAt)} ${formatJam(issuedAt)}`

  return {
    villageLine,
    tpsLine,
    qrPayload: payload,
    ballotId: ballot.id,
    footerLine,
  }
}

/**
 * Cetak struk suara: Bluetooth ESC/POS di APK, window.print di browser dev.
 */
export async function printBallotReceipt({ ballot, payload, session }) {
  if (!ballot || !payload) {
    return { ok: false, message: 'Data struk tidak lengkap.' }
  }

  if (isNativePrinterAvailable()) {
    const bytes = buildBallotReceiptBytes(buildLines(ballot, payload, session))
    return printRawBytes(bytes)
  }

  window.print()
  return { ok: true, fallback: 'print' }
}

export async function printTestReceipt() {
  if (isNativePrinterAvailable()) {
    const bytes = buildTestReceiptBytes()
    return printRawBytes(bytes)
  }
  return { ok: false, message: 'Tes cetak Bluetooth hanya tersedia di APK Android.' }
}
