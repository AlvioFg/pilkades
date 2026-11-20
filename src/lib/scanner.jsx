import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Wrapper html5-qrcode.
 *
 * Catatan penting soal kamera:
 *  - Scanner hanya boleh hidup selama komponen ter-mount. Kalau stop()/clear()
 *    dilewat saat unmount, kunjungan berikutnya ke halaman scan menampilkan
 *    preview hitam (kamera masih dipegang instance sebelumnya).
 *  - Kamera butuh secure context (https:// atau localhost). Di http://IP-LAN
 *    navigator.mediaDevices undefined: itu batas browser, bukan bug aplikasi.
 *  - Library html5-qrcode dimuat dinamis: halamannya hanya dibutuhkan di
 *    halaman pindai, sehingga bundel awal (Beranda) tetap ringan.
 */
export default function QrScanner({
  formats = ['QR_CODE'],
  qrbox,
  onResult,
  onError,
  active = true,
}) {
  const mountRef = useRef(null)
  const scannerRef = useRef(null)
  // ID elemen harus stabil & tersedia saat render pertama, karena
  // html5-qrcode mencari elemen ini berdasarkan ID saat start().
  // Ref tidak bisa dipakai: perubahan ref tidak memicu re-render.
  const [elementId] = useState(() => `scanner-${Math.random().toString(36).slice(2, 9)}`)
  const [status, setStatus] = useState('idle') // idle | starting | running | error
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  // Objek qrbox dibuat parent sebagai literal baru tiap render. Tanpa
  // memoization, efek di bawah akan restart kamera tiap render.
  const qrboxKey = qrbox ? `${qrbox.width}x${qrbox.height}` : 'default'
  const qrboxValue = useMemo(
    () => (qrbox ? { width: qrbox.width, height: qrbox.height } : { width: 260, height: 260 }),
    [qrboxKey],
  )

  useEffect(() => {
    if (!active) return undefined

    let cancelled = false

    async function start() {
      setStatus('starting')
      setErrorMessage('')

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
      if (cancelled) return

      const scanner = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: formats.map((f) => Html5QrcodeSupportedFormats[f]).filter((f) => f !== undefined),
      })
      scannerRef.current = scanner

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: qrboxValue },
          (decodedText) => {
            onResult?.(decodedText)
          },
          () => {
            // frame tanpa QR terbaca: biarkan, ini normal
          },
        )
        if (cancelled) {
          await stopScanner(scanner)
          return
        }
        setStatus('running')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setErrorMessage(readableError(err))
        onError?.(err)
      }
    }

    start()

    return () => {
      cancelled = true
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) {
        stopScanner(scanner)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, retryKey, formats.join(','), qrboxKey])

  // Kamera juga dilepas saat tab disembunyikan (pindah aplikasi / lock layar)
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        const scanner = scannerRef.current
        if (scanner) stopScanner(scanner)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  function handleRetry() {
    setStatus('idle')
    setRetryKey((k) => k + 1)
  }

  return (    <div className="flex flex-col items-center gap-3">
      <div
        id={elementId}
        ref={mountRef}
        className="w-full max-w-xl overflow-hidden rounded-xl border-2 border-gov-green/40 bg-black"
        style={{ minHeight: '16rem' }}
      />

      {status === 'starting' && (
        <p className="text-sm font-semibold text-gov-muted">Menyiapkan kamera...</p>
      )}

      {status === 'error' && (
        <div className="card w-full max-w-xl border-red-300 bg-red-50 p-4">
          <p className="font-semibold text-red-800">{errorMessage}</p>
          <button type="button" className="btn-secondary mt-3" onClick={handleRetry}>
            Coba Lagi
          </button>
        </div>
      )}

      {status === 'running' && (
        <p className="text-sm font-medium text-gov-muted">
          Arahkan QR code ke dalam kotak. Pastikan seluruh QR terlihat dan tidak terpotong.
        </p>
      )}
    </div>
  )
}

async function stopScanner(scanner) {
  try {
    const running = scanner.isScanning?.()
    if (running !== false) await scanner.stop()
  } catch {
    /* sudah berhenti */
  }
  try {
    scanner.clear()
  } catch {
    /* sudah dibersihkan */
  }
}

/** Terjemahkan error html5-qrcode/browser ke bahasa yang bisa ditindaklanjuti petugas. */
function readableError(err) {
  const name = err?.name ?? ''
  const message = String(err?.message ?? err ?? '')

  if (name === 'NotAllowedError' || /permission/i.test(message)) {
    return 'Izin kamera ditolak. Buka menu ⋮ → Setelan situs → Kamera → Izinkan, lalu muat ulang halaman.'
  }
  if (name === 'NotFoundError' || /not found|devices? found/i.test(message)) {
    return 'Kamera tidak ditemukan di perangkat ini. Gunakan input kode tiket manual di bawah.'
  }
  if (name === 'NotReadableError' || /in use|read/i.test(message)) {
    return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera lalu coba lagi.'
  }
  if (/secure context|mediaDevices|getUserMedia/i.test(message)) {
    return 'Kamera hanya bisa aktif di alamat https:// atau localhost. Buka aplikasi lewat alamat https.'
  }
  return `Kamera gagal dinyalakan. ${message || 'Coba lagi atau gunakan input kode tiket manual.'}`
}
