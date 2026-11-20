import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CANDIDATE_NOS } from './data/candidates'
import { DEMO_NAMES, DEMO_DUSUN, DEMO_RT } from './data/names'
import { buildVotePayload, parseVotePayload } from './lib/payload'

const STORAGE_KEY = 'pilkades.sim.v1'
const SCHEMA_VERSION = 1

/* ------------------------------------------------------------------ *
 * Generator acak sederhana (cukup untuk demo, tanpa dependency)
 * ------------------------------------------------------------------ */

function randomId(length = 8) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function randomHex(length = 8) {
  const alphabet = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function pad(n, width) {
  return String(n).padStart(width, '0')
}

function formatTanggal(d = new Date()) {
  return `${d.getDate()} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][d.getMonth()]} ${d.getFullYear()}`
}

function formatJam(d = new Date()) {
  return `${pad(d.getHours(), 2)}.${pad(d.getMinutes(), 2)} WIB`
}

/* ------------------------------------------------------------------ *
 * Fungsi murni: dipakai UI dan unit test
 * ------------------------------------------------------------------ */

/**
 * Hitung rekap suara.
 *
 * PENTING: jumlah selalu DITURUNKAN dari array ballots, tidak pernah
 * bertambah lewat counter. Mode hanya jadi filter saat membaca:
 *   - "auto" : semua ballot dihitung (suara masuk saat warga memilih)
 *   - "box"  : hanya ballot yang sudah discan dari kotak suara
 *
 * Karena itu auto ⊇ box, dan switching auto -> box -> auto selalu
 * mengembalikan angka yang sama. Tidak mungkin terhitung dobel.
 *
 * @param {Array<{candidateNo:number, scannedAt:number|null}>} ballots
 * @param {'auto'|'box'} mode
 */
export function tally(ballots = [], mode = 'auto') {
  const result = Object.fromEntries(CANDIDATE_NOS.map((no) => [no, 0]))
  let counted = 0

  for (const ballot of ballots) {
    const isCounted = mode === 'auto' ? true : ballot.scannedAt !== null
    if (!isCounted) continue
    if (result[ballot.candidateNo] === undefined) continue
    result[ballot.candidateNo] += 1
    counted += 1
  }

  return { counts: result, counted, total: ballots.length, pending: ballots.length - counted }
}

/** Format id tiket sederhana: TKT-2026-000142 */
function formatTicketId(index) {
  return `TKT-${new Date().getFullYear()}-${pad(index, 6)}`
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

const initialState = {
  version: SCHEMA_VERSION,
  view: 'home', // home | scan | vote | result | recap | box | tickets
  session: {
    code: '',
    seed: '',
    startedAt: null,
    village: 'DESA DAYEUHKOLOT',
    regency: 'KABUPATEN SUBANG',
    kecamatan: 'KECAMATAN SAGALAHERANG',
    tps: '',
    bilik: '',
    officerName: '',
    officerRole: '',
    countMode: 'auto', // 'auto' | 'box': FILTER TAMPIL, bukan pencacah
  },
  tickets: [],
  ballots: [],
  ui: {
    activeTicketId: null,
    lastBallotId: null,
  },
  printer: {
    savedAddress: '',
    savedName: '',
  },
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      /* ---------------- navigasi ---------------- */

      setView: (view) => set({ view }),

      /* ---------------- printer Bluetooth ---------------- */

      setPrinterDevice: (address, name) =>
        set({
          printer: {
            savedAddress: String(address || ''),
            savedName: String(name || ''),
          },
        }),

      /* ---------------- sesi ---------------- */

      /**
       * Mulai sesi: simpan info desa/TPS/petugas, buat kode sesi & seed.
       * Seed mengikat QR suara ke sesi ini (QR sesi lama akan ditolak).
       */
      startSession: (info) => {
        const now = Date.now()
        const seed = randomHex(8)
        const tpsCode = (info.tps || 'TPS 01').replace(/\s+/g, '').toUpperCase()
        const code = `${tpsCode}-${new Date().getFullYear()}${pad(new Date().getMonth() + 1, 2)}${pad(new Date().getDate(), 2)}-${randomHex(4)}`

        set((state) => ({
          view: 'scan',
          session: {
            ...state.session,
            ...info,
            code,
            seed,
            startedAt: now,
          },
        }))
      },

      /* ---------------- tiket undangan ---------------- */

      /**
       * Buat N tiket demo (untuk demo & uji coba).
       * Tiket demo dibuat dengan status "unused" dan langsung terdaftar.
       */
      generateDemoTickets: (jumlah = 40) =>
        set((state) => {
          const startIndex = state.tickets.length + 1
          const tickets = []
          const shuffled = [...DEMO_NAMES].sort(() => Math.random() - 0.5)

          for (let i = 0; i < jumlah; i += 1) {
            const seq = startIndex + i
            tickets.push({
              id: formatTicketId(seq),
              name: shuffled[i % shuffled.length],
              address: `${DEMO_DUSUN[i % DEMO_DUSUN.length]} ${DEMO_RT[i % DEMO_RT.length]}`,
              status: 'unused',
              admittedAt: null,
              ballotId: null,
            })
          }

          return { tickets: [...state.tickets, ...tickets] }
        }),

      /**
       * Ticket yang dipakai untuk scan QR code undangan.
       * @returns {{ ok: true, ticket: object } | { ok: false, message: string }}
       */
      admitTicket: (ticketId) => {
        const clean = String(ticketId ?? '').trim().toUpperCase()
        if (!clean) return { ok: false, message: 'Kode tiket tidak terbaca.' }

        const state = get()
        const ticket = state.tickets.find((t) => t.id.toUpperCase() === clean)

        if (!ticket) {
          return {
            ok: false,
            message: 'Tiket tidak terdaftar. Pastikan warga membawa undangan resmi.',
          }
        }

        if (ticket.status === 'voted') {
          return { ok: false, message: `Tiket ${ticket.id} sudah digunakan untuk memilih.` }
        }

        if (ticket.status === 'admitted') {
          return { ok: false, message: `Tiket ${ticket.id} sedang diproses, belum bisa dipakai lagi.` }
        }

        set({
          tickets: state.tickets.map((t) =>
            t.id === ticket.id ? { ...t, status: 'admitted', admittedAt: Date.now() } : t,
          ),
          ui: { ...state.ui, activeTicketId: ticket.id },
        })

        return { ok: true, ticket: { ...ticket, status: 'admitted', admittedAt: Date.now() } }
      },

      /** Batalkan kehadiran terakhir (undo). */
      undoAdmit: () =>
        set((state) => {
          const activeId = state.ui.activeTicketId
          if (!activeId) return state
          return {
            tickets: state.tickets.map((t) =>
              t.id === activeId ? { ...t, status: 'unused', admittedAt: null } : t,
            ),
            ui: { ...state.ui, activeTicketId: null },
          }
        }),

      /* ---------------- memilih kandidat ---------------- */

      /**
       * Catat suara. Satu tiket -> maksimal satu ballot.
       * Penulisan ballot + perubahan status tiket terjadi dalam satu aksi
       * sehingga tidak pernah ada state setengah jadi.
       *
       * @returns {{ ok: true, ballot: object } | { ok: false, message: string }}
       */
      castVote: (candidateNo) => {
        const state = get()
        const no = Number(candidateNo)
        const activeId = state.ui.activeTicketId

        if (!activeId) {
          return { ok: false, message: 'Belum ada warga yang terdaftar. Pindai QR code undangan dulu.' }
        }

        const ticket = state.tickets.find((t) => t.id === activeId)
        if (!ticket) {
          return { ok: false, message: 'Data tiket tidak ditemukan.' }
        }

        if (ticket.status === 'voted') {
          return { ok: false, message: 'Warga ini sudah memberikan suara.' }
        }

        if (!CANDIDATE_NOS.includes(no)) {
          return { ok: false, message: 'Kandidat tidak valid.' }
        }

        const ballot = {
          id: randomId(8),
          ticketId: activeId,
          candidateNo: no,
          issuedAt: Date.now(),
          scannedAt: null,
          scanCount: 0,
        }

        set({
          ballots: [...state.ballots, ballot],
          tickets: state.tickets.map((t) =>
            t.id === activeId ? { ...t, status: 'voted', ballotId: ballot.id } : t,
          ),
          ui: { ...state.ui, lastBallotId: ballot.id },
          view: 'result',
        })

        return { ok: true, ballot }
      },

      /** Tutup alur warga, kembali ke pemindaian untuk warga berikutnya. */
      nextVoter: () =>
        set((state) => ({
          view: 'scan',
          ui: { ...state.ui, activeTicketId: null },
        })),

      /* ---------------- rekap / penghitungan kotak ---------------- */

      setCountMode: (mode) =>
        set((state) => ({ session: { ...state.session, countMode: mode } })),

      /**
       * Hitung suara dari scan QR code di kotak suara (mode demo).
       * Idempoten: struk yang sudah dihitung tidak menambah suara.
       *
       * @returns {{ ok: true, status: 'counted'|'duplicate', ballot: object }
       *          | { ok: false, message: string }}
       */
      countBoxScan: (raw) => {
        const parsed = parseVotePayload(raw)
        if (!parsed.ok) return { ok: false, message: parsed.error }

        const { seed, ballotId, candidateNo } = parsed.data
        const state = get()

        if (seed !== state.session.seed) {
          return { ok: false, message: 'QR dari sesi lain: struk ini bukan milik sesi ini.' }
        }

        const ballot = state.ballots.find((b) => b.id === ballotId)
        if (!ballot) {
          return { ok: false, message: 'QR tidak dikenal: struk ini tidak terbit di aplikasi ini.' }
        }

        if (ballot.candidateNo !== candidateNo) {
          return { ok: false, message: 'QR tidak sesuai dengan data suara yang tercatat.' }
        }

        if (ballot.scannedAt !== null) {
          set({
            ballots: state.ballots.map((b) =>
              b.id === ballotId ? { ...b, scanCount: (b.scanCount ?? 0) + 1 } : b,
            ),
          })
          return { ok: true, status: 'duplicate', ballot }
        }

        const scannedAt = Date.now()
        set({
          ballots: state.ballots.map((b) =>
            b.id === ballotId ? { ...b, scannedAt, scanCount: (b.scanCount ?? 0) + 1 } : b,
          ),
        })

        return { ok: true, status: 'counted', ballot: { ...ballot, scannedAt } }
      },

      /* ---------------- utilitas panitia ---------------- */

      /**
       * Pindah bilik suara (dipakai di tengah sesi).
       * Semua struk yang sudah terbit tetap milik sesi yang sama: * hanya label bilik pada tampilan/struk yang berubah.
       */
      setBilik: (bilik) =>
        set((state) => ({
          session: { ...state.session, bilik: String(bilik ?? '').trim() },
        })),

      resetSession: () =>
        set({
          ...initialState,
          version: SCHEMA_VERSION,
        }),

      /** Reset hanya data suara & tiket, tetap pertahankan info sesi. */
      resetVotes: () =>
        set((state) => ({
          ballots: [],
          tickets: state.tickets.map((t) => ({
            ...t,
            status: 'unused',
            admittedAt: null,
            ballotId: null,
          })),
          ui: { activeTicketId: null, lastBallotId: null },
        })),

      exportJson: () => {
        const state = get()
        const blob = new Blob([JSON.stringify(state, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pilkades-${state.session.code || 'backup'}.json`
        a.click()
        URL.revokeObjectURL(url)
      },

      importJson: (text) => {
        try {
          const parsed = JSON.parse(text)
          if (!parsed || typeof parsed !== 'object' || !parsed.session) {
            return { ok: false, message: 'Berkas bukan cadangan yang valid.' }
          }
          set({
            ...initialState,
            ...parsed,
            version: SCHEMA_VERSION,
            view: 'home',
            ui: { activeTicketId: null, lastBallotId: null },
          })
          return { ok: true }
        } catch {
          return { ok: false, message: 'Berkas tidak dapat dibaca.' }
        }
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      partialize: (state) => ({
        version: state.version,
        session: state.session,
        tickets: state.tickets,
        ballots: state.ballots,
        ui: state.ui,
        printer: state.printer,
      }),
    },
  ),
)

/* ------------------------------------------------------------------ *
 * Selector turunan
 * ------------------------------------------------------------------ */

/**
 * Selector rekap suara.
 *
 * PENTING: fungsi ini harus mengembalikan objek yang STABIL antar render.
 * Zustand v5 memakai perbandingan `Object.is` untuk deciding apakah
 * komponen perlu render ulang. Kalau selector selalu membuat objek baru,
 * setiap `getSnapshot()` menghasilkan nilai berbeda → React menganggap
 * state berubah → render loop ("Maximum update depth exceeded").
 *
 * Solusi: cache hasil dan kembalikan objek yang sama selama input
 * (ballots + countMode) tidak berubah. Referensi `ballots` stabil karena
 * Zustand hanya mengganti array ketika isinya benar-benar berubah.
 */
let tallyCache = { ballots: null, mode: null, value: null }

export const selectTally = (state) => {
  const ballots = state.ballots
  const mode = state.session.countMode

  if (tallyCache.ballots === ballots && tallyCache.mode === mode) {
    return tallyCache.value
  }

  const value = tally(ballots, mode)
  tallyCache = { ballots, mode, value }
  return value
}

export function buildBallotPayload(ballotId, state = useStore.getState()) {
  const ballot = state.ballots.find((b) => b.id === ballotId)
  if (!ballot) return null
  return buildVotePayload({
    seed: state.session.seed,
    ballotId: ballot.id,
    candidateNo: ballot.candidateNo,
  })
}

export { formatTanggal, formatJam }
