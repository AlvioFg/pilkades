import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store'

/**
 * Test proteksi tiket & integritas suara.
 *
 * Skenario yang harus aman:
 *  - satu tiket hanya bisa dipakai sekali
 *  - satu tiket hanya menghasilkan satu ballot
 *  - QR suara dari sesi lain ditolak
 *  - QR suara yang dimanipulasi ditolak
 */

function resetStore() {
  // Zustand persist memakai localStorage; di environment test (node) fungsi
  // ini mungkin tidak tersedia, tapi yang penting state di-reset.
  useStore.setState({
    view: 'home',
    session: {
      code: '',
      seed: '',
      startedAt: null,
      village: 'DESA DAYEUHKOLOT',
      regency: 'KABUPATEN INDRAMAYU',
      kecamatan: 'KECAMATAN INDRAMAYU',
      tps: '1',
      bilik: '1',
      officerName: 'Petugas',
      officerRole: 'Ketua KPPS',
      countMode: 'auto',
    },
    tickets: [],
    ballots: [],
    ui: { activeTicketId: null, lastBallotId: null },
  })
}

describe('alur pemungutan suara', () => {
  beforeEach(() => {
    resetStore()
    const s = useStore.getState()
    s.startSession({
      village: 'DESA DAYEUHKOLOT',
      regency: 'KABUPATEN INDRAMAYU',
      kecamatan: 'KECAMATAN INDRAMAYU',
      tps: '1',
      bilik: '1',
      officerName: 'Petugas',
      officerRole: 'Ketua KPPS',
    })
    useStore.getState().generateDemoTickets(5)
  })

  it('memvalidasi tiket terdaftar dan menampilkan nama warga', () => {
    const result = useStore.getState().admitTicket('TKT-2026-000001')
    expect(result.ok).toBe(true)
    expect(result.ticket.name).toBeTruthy()
  })

  it('menolak tiket yang tidak terdaftar', () => {
    const result = useStore.getState().admitTicket('TKT-2026-999999')
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/tidak terdaftar/i)
  })

  it('menolak tiket yang sudah dipakai memilih', () => {
    useStore.getState().admitTicket('TKT-2026-000001')
    useStore.getState().castVote(2)
    const result = useStore.getState().admitTicket('TKT-2026-000001')
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/sudah digunakan/i)
  })

  it('menolak voting tanpa tiket yang terdaftar', () => {
    const result = useStore.getState().castVote(1)
    expect(result.ok).toBe(false)
  })

  it('satu tiket menghasilkan tepat satu ballot', () => {
    useStore.getState().admitTicket('TKT-2026-000001')
    const first = useStore.getState().castVote(3)
    expect(first.ok).toBe(true)
    expect(useStore.getState().ballots).toHaveLength(1)
    expect(useStore.getState().ballots[0].candidateNo).toBe(3)

    // Voter mencoba memilih lagi di tiket yang sama
    const second = useStore.getState().castVote(5)
    expect(second.ok).toBe(false)
    expect(useStore.getState().ballots).toHaveLength(1)
  })

  it('menolak nomor kandidat di luar daftar', () => {
    useStore.getState().admitTicket('TKT-2026-000001')
    const result = useStore.getState().castVote(9)
    expect(result.ok).toBe(false)
    expect(useStore.getState().ballots).toHaveLength(0)
  })

  it('undo mengembalikan tiket ke status belum dipakai', () => {
    useStore.getState().admitTicket('TKT-2026-000001')
    useStore.getState().undoAdmit()
    const result = useStore.getState().admitTicket('TKT-2026-000001')
    expect(result.ok).toBe(true)
  })
})

describe('pemindaian kotak suara', () => {
  beforeEach(() => {
    resetStore()
    useStore.getState().startSession({
      village: 'DESA DAYEUHKOLOT',
      regency: 'KABUPATEN INDRAMAYU',
      kecamatan: 'KECAMATAN INDRAMAYU',
      tps: '1',
      bilik: '1',
      officerName: 'Petugas',
      officerRole: 'Ketua KPPS',
    })
    useStore.getState().generateDemoTickets(3)
    useStore.getState().admitTicket('TKT-2026-000001')
    useStore.getState().castVote(4)
  })

  function payloadFor(ballotId, candidateNo, seed) {
    return `SPV1|${seed}|${ballotId}|${candidateNo}`
  }

  it('menghitung struk yang valid', () => {
    const state = useStore.getState()
    const ballot = state.ballots[0]
    const result = state.countBoxScan(payloadFor(ballot.id, 4, state.session.seed))
    expect(result.ok).toBe(true)
    expect(result.status).toBe('counted')
    expect(useStore.getState().ballots[0].scannedAt).not.toBeNull()
  })

  it('memindai struk yang sama dua kali tidak menambah suara', () => {
    const state = useStore.getState()
    const ballot = state.ballots[0]
    const payload = payloadFor(ballot.id, 4, state.session.seed)

    useStore.getState().countBoxScan(payload)
    const second = useStore.getState().countBoxScan(payload)

    expect(second.status).toBe('duplicate')
    expect(useStore.getState().ballots).toHaveLength(1)
  })

  it('menolak QR dari sesi lain', () => {
    const state = useStore.getState()
    const ballot = state.ballots[0]
    const result = state.countBoxScan(payloadFor(ballot.id, 4, 'aaaaaaaa'))
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/sesi lain/i)
  })

  it('menolak QR dengan nomor kandidat yang tidak cocok', () => {
    const state = useStore.getState()
    const ballot = state.ballots[0]
    const result = state.countBoxScan(payloadFor(ballot.id, 2, state.session.seed))
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/tidak sesuai/i)
  })

  it('menolak QR dengan ballotId yang tidak dikenal', () => {
    const state = useStore.getState()
    const result = state.countBoxScan(payloadFor('tidakknown', 4, state.session.seed))
    expect(result.ok).toBe(false)
  })
})
