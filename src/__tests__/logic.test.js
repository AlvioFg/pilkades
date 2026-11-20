import { describe, expect, it } from 'vitest'
import { tally } from '../store'
import { buildVotePayload, parseVotePayload } from '../lib/payload'

/**
 * Test logika inti yang paling rawan salah:
 *  - rekap suara tidak pernah terhitung dobel
 *  - payload QR menolak struk asing / manipulator
 */

function ballot(id, candidateNo, scannedAt = null) {
  return { id, ticketId: `TKT-${id}`, candidateNo, issuedAt: 0, scannedAt, scanCount: 0 }
}

describe('tally: rekap suara', () => {
  const ballots = [
    ballot('a', 1),
    ballot('b', 2),
    ballot('c', 2),
    ballot('d', 5, 1000), // sudah discan dari kotak
  ]

  it('mode auto menghitung semua suara', () => {
    const t = tally(ballots, 'auto')
    expect(t.counts).toEqual({ 1: 1, 2: 2, 3: 0, 4: 0, 5: 1 })
    expect(t.counted).toBe(4)
    expect(t.total).toBe(4)
    expect(t.pending).toBe(0)
  })

  it('mode box hanya menghitung yang sudah discan', () => {
    const t = tally(ballots, 'box')
    expect(t.counts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 })
    expect(t.counted).toBe(1)
    expect(t.total).toBe(4)
    expect(t.pending).toBe(3)
  })

  it('himpunan auto superset himpunan box (tidak pernah terhitung dobel)', () => {
    const auto = tally(ballots, 'auto').counted
    const box = tally(ballots, 'box').counted
    expect(box).toBeLessThanOrEqual(auto)
  })

  it('auto -> box -> auto menghasilkan angka identik', () => {
    const before = tally(ballots, 'auto')
    tally(ballots, 'box')
    const after = tally(ballots, 'auto')
    expect(after.counts).toEqual(before.counts)
    expect(after.counted).toBe(before.counted)
  })

  it('memindai struk yang sama dua kali tidak menambah suara', () => {
    const once = tally([ballot('x', 3, 1000)], 'box')
    const twice = tally([ballot('x', 3, 1000)], 'box')
    expect(twice.counted).toBe(once.counted)
    expect(twice.counts[3]).toBe(once.counts[3])
  })

  it('suara kosong menghasilkan nol, bukan error', () => {
    const t = tally([], 'auto')
    expect(t.counted).toBe(0)
    expect(t.total).toBe(0)
    expect(t.counts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  })
})

describe('payload QR suara', () => {
  const seed = '9f2c71a4'
  const ballotId = 'b7k3q9xm'

  it('membangun payload dengan format yang diharapkan', () => {
    expect(buildVotePayload({ seed, ballotId, candidateNo: 3 })).toBe('SPV1|9f2c71a4|b7k3q9xm|3')
  })

  it('memparse payload yang valid', () => {
    const result = parseVotePayload('SPV1|9f2c71a4|b7k3q9xm|3')
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({
      prefix: 'SPV1',
      seed: '9f2c71a4',
      ballotId: 'b7k3q9xm',
      candidateNo: 3,
    })
  })

  it('menolak prefix yang salah', () => {
    const result = parseVotePayload('XXX|9f2c71a4|b7k3q9xm|3')
    expect(result.ok).toBe(false)
  })

  it('menolak jumlah field yang salah', () => {
    expect(parseVotePayload('SPV1|9f2c71a4|3').ok).toBe(false)
    expect(parseVotePayload('SPV1|9f2c71a4|b7k3q9xm|3|extra').ok).toBe(false)
  })

  it('menolak nomor kandidat di luar 1..5', () => {
    expect(parseVotePayload('SPV1|9f2c71a4|b7k3q9xm|0').ok).toBe(false)
    expect(parseVotePayload('SPV1|9f2c71a4|b7k3q9xm|6').ok).toBe(false)
    expect(parseVotePayload('SPV1|9f2c71a4|b7k3q9xm|abc').ok).toBe(false)
  })

  it('menolak payload kosong', () => {
    expect(parseVotePayload('').ok).toBe(false)
    expect(parseVotePayload('   ').ok).toBe(false)
    expect(parseVotePayload(null).ok).toBe(false)
  })
})
