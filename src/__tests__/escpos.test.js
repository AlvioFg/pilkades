import { describe, expect, it } from 'vitest'
import { buildBallotReceiptBytes, buildTestReceiptBytes } from '../lib/escpos.js'

function hasQrMarkers(bytes) {
  const text = [...bytes].map((b) => String.fromCharCode(b)).join('')
  return text.includes('1A') || bytes.includes(0x28)
}

describe('escpos receipts', () => {
  it('builds ballot receipt with init and QR command', () => {
    const bytes = buildBallotReceiptBytes({
      villageLine: 'PEMILIHAN KEPALA DESA DAYEUHKOLOT',
      tpsLine: 'TPS 1 / BILIK 1',
      qrPayload: 'SPV1|abc|ballot|1',
      ballotId: 'x7k2abcd',
      footerLine: 'Simulasi',
    })
    expect(bytes.length).toBeGreaterThan(80)
    expect(bytes[0]).toBe(0x1b)
    expect(bytes[1]).toBe(0x40)
    const joined = new TextDecoder().decode(bytes)
    expect(joined).toContain('SURAT SUARA')
    expect(joined).toContain('DAYEUHKOLOT')
    expect(joined).toContain('x7k2abcd')
    expect(bytes.includes(0x28)).toBe(true)
    expect(hasQrMarkers(bytes)).toBe(true)
  })

  it('builds test receipt', () => {
    const bytes = buildTestReceiptBytes()
    const joined = new TextDecoder().decode(bytes)
    expect(joined).toContain('TES CETAK')
  })
})
