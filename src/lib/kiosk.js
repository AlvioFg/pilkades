/**
 * Mode kios untuk tablet TPS.
 *
 * - Fullscreen: aplikasi tampil tanpa address bar Chrome / status bar.
 * - Wake lock: layar tidak tidur saat pemungutan suara berjalan,
 *   supaya petugas tidak harus menyentuh layar.
 *
 * Semua API di-wrap try/catch: di desktop atau browser biasa
 * fungsinya mungkin tidak tersedia, dan itu tidak boleh menggagalkan app.
 */

/** Minta mode layar penuh. Dipanggil dari klik pengguna (butuh user gesture). */
export async function enterFullscreen(element = document.documentElement) {
  try {
    if (!document.fullscreenElement && element?.requestFullscreen) {
      await element.requestFullscreen()
      return true
    }
  } catch {
    /* ditolak browser: bukan masalah fatal */
  }
  return false
}

export function exitFullscreen() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen()
    }
  } catch {
    /* abaikan */
  }
}

/**
 * Kunci layar agar tidak tidur selama pemungutan suara.
 * Mengembalikan fungsi untuk melepas kunci (cleanup).
 */
export async function keepAwake() {
  let release = null
  try {
    if ('wakeLock' in navigator) {
      const lock = await navigator.wakeLock.request('screen')
      release = () => {
        try {
          lock.release()
        } catch {
          /* abaikan */
        }
      }
    }
  } catch {
    /* tidak didukung / ditolak */
  }
  return release
}

/**
 * Aktifkan kembali wake lock setelah tab kembali terlihat
 * (kunci dilepas otomatis saat tab disembunyikan).
 */
export function watchVisibility(onWake) {
  function handle() {
    if (document.visibilityState === 'visible') onWake()
  }
  document.addEventListener('visibilitychange', handle)
  return () => document.removeEventListener('visibilitychange', handle)
}
