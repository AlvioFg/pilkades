/**
 * Kontrak isi QR suara.
 *
 * Format (dipisah tanda "|"):
 *
 *   SPV1|9f2c71a4|b7k3q9xm|3
 *    ^      ^         ^     ^
 *    |      |         |     +-- nomor kandidat (1..5)
 *    |      |         +-------- id ballot
 *    |      +------------------ seed sesi (mengikat QR ke sesi ini)
 *    +------------------------- prefix / versi format
 *
 * Prefix "SPV1" = Simulations Pilkades Versi 1.
 * Sengaja pendek (~30 karakter) supaya QR tetap besar & tajam
 * saat dicetak pada roll 58 mm dan mudah discan kembali dari kotak suara.
 */

export const PAYLOAD_PREFIX = 'SPV1'

export const PAYLOAD_SEPARATOR = '|'

/**
 * @typedef {{ prefix: string, seed: string, ballotId: string, candidateNo: number }} VotePayload
 */

/**
 * Susun payload QR suara.
 * @param {{ seed: string, ballotId: string, candidateNo: number }} args
 * @returns {string}
 */
export function buildVotePayload({ seed, ballotId, candidateNo }) {
  return [
    PAYLOAD_PREFIX,
    seed,
    ballotId,
    String(Number(candidateNo)),
  ].join(PAYLOAD_SEPARATOR)
}

/**
 * Pecah & validasi bentuk payload QR.
 * Validasi ini hanya memeriksa bentuk payload; kecocokan dengan sesi tetap
 * diperiksa di store (seed, ballotId dikenal, nomor kandidat sesuai).
 *
 * @param {string} raw
 * @returns {{ ok: true, data: VotePayload } | { ok: false, error: string }}
 */
export function parseVotePayload(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'QR kosong.' }
  }

  const parts = raw.trim().split(PAYLOAD_SEPARATOR)

  if (parts.length !== 4) {
    return { ok: false, error: 'Format QR tidak dikenali.' }
  }

  const [prefix, seed, ballotId, candidateRaw] = parts

  if (prefix !== PAYLOAD_PREFIX) {
    return { ok: false, error: 'QR bukan struk suara simulasi ini.' }
  }

  if (!seed || !ballotId) {
    return { ok: false, error: 'QR tidak lengkap.' }
  }

  const candidateNo = Number(candidateRaw)
  if (!Number.isInteger(candidateNo) || candidateNo < 1 || candidateNo > 5) {
    return { ok: false, error: 'Nomor kandidat pada QR tidak valid.' }
  }

  return { ok: true, data: { prefix, seed, ballotId, candidateNo } }
}
