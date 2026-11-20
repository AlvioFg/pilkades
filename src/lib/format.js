/**
 * Pembantu tampilan yang dipakai di beberapa halaman.
 */

/**
 * Buang awalan "DESA " supaya tidak menjadi "PEMILIHAN KEPALA DESA DESA ...".
 *
 * @param {string} village
 * @returns {string}
 */
export function desaLabel(village) {
  const v = (village || 'DAYEUHKOLOT').trim()
  return /^desa\s+/i.test(v) ? v.replace(/^desa\s+/i, '') : v
}

/**
 * Label bilik suara, mis. "Bilik Suara Nomor 1".
 */
export function bilikLabel(bilik) {
  const b = (bilik ?? '1').toString().trim()
  return b ? `Bilik Suara Nomor ${b}` : 'Bilik Suara Nomor 1'
}
