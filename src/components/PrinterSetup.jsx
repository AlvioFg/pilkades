import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  connectPrinter,
  connectFirstPairedPrinter,
  disconnectPrinter,
  ensureBluetoothPermissions,
  fetchPrinterStatus,
  isNativePrinterAvailable,
  listPairedPrinters,
  scanForPrinters,
} from '../lib/bluetoothPrinter.js'
import { printTestReceipt } from '../lib/printReceipt.js'
import { useStore } from '../store'

export default function PrinterSetup() {
  const savedAddress = useStore((s) => s.printer.savedAddress)
  const savedName = useStore((s) => s.printer.savedName)
  const setPrinterDevice = useStore((s) => s.setPrinterDevice)

  const [devices, setDevices] = useState([])
  const [pick, setPick] = useState(savedAddress || '')
  const [status, setStatus] = useState({ connected: false, name: null, address: null })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [diagnostics, setDiagnostics] = useState('')
  const [testBusy, setTestBusy] = useState(false)

  const native = isNativePrinterAvailable()

  const statusLabel = useMemo(() => {
    if (!native) return 'Mode browser (cetak sistem)'
    if (status.connected) return `Terhubung: ${status.name || savedName || 'Printer'}`
    if (savedAddress) return 'Tersimpan, belum terhubung'
    return 'Belum terhubung'
  }, [native, status, savedName, savedAddress])

  const refresh = useCallback(async () => {
    if (!native) return
    const s = await fetchPrinterStatus()
    setStatus(s)
  }, [native])

  const loadDevices = useCallback(async () => {
    if (!native) return
    try {
      const perm = await ensureBluetoothPermissions()
      if (!perm.granted) {
        setMsg('Izin Bluetooth diperlukan untuk printer.')
        return
      }
      const list = await listPairedPrinters()
      setDevices(list.devices || [])
    } catch (err) {
      setMsg(err?.message || 'Gagal memuat daftar printer.')
    }
  }, [native])

  useEffect(() => {
    if (!native) return undefined
    loadDevices()
    refresh()
    const id = window.setInterval(refresh, 4000)
    return () => window.clearInterval(id)
  }, [native, loadDevices, refresh])

  useEffect(() => {
    if (!native || !savedAddress || status.connected || busy) return undefined

    let cancelled = false
    ;(async () => {
      setBusy(true)
      setMsg('Menyambungkan printer tersimpan...')
      try {
        const result = await connectPrinter(savedAddress)
        if (cancelled) return
        setPrinterDevice(result.address, result.name)
        setStatus({ connected: true, name: result.name, address: result.address })
        setMsg('Printer siap.')
      } catch (err) {
        if (cancelled) return
        setMsg(err?.message || 'Gagal menyambung otomatis. Pilih printer dan hubungkan.')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // hanya sekali saat mount / saat alamat tersimpan berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native, savedAddress])

  async function handleAutoConnect() {
    setBusy(true)
    setMsg('Mencari printer Bluetooth (Classic + BLE)...')
    setDiagnostics('')
    try {
      const result = await connectFirstPairedPrinter()
      setPick(result.address)
      setPrinterDevice(result.address, result.name || '')
      setStatus({ connected: true, name: result.name, address: result.address })
      setDiagnostics(result.diagnostics || '')
      setMsg(`Terhubung ke ${result.name || result.address}. Tekan "Tes Cetak" untuk memastikan.`)
    } catch (err) {
      setMsg(humanConnectError(err?.message))
      setDiagnostics(err?.message || '')
      await loadDevices()
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleScan() {
    setBusy(true)
    setMsg('Memindai printer Bluetooth di sekitar (6 detik)...')
    try {
      const result = await scanForPrinters()
      const found = result.devices || []
      if (!result.supported) {
        setMsg('Perangkat ini tidak mendukung Bluetooth Low Energy (BLE).')
        return
      }
      if (found.length === 0) {
        setMsg('Tidak ada printer BLE ditemukan di sekitar. Pastikan printer menyala dan mode pair-nya aktif.')
        return
      }
      setDevices((prev) => {
        const merged = [...prev]
        found.forEach((d) => {
          if (!merged.some((m) => m.address === d.address)) merged.push(d)
        })
        return merged
      })
      setMsg(`Ditemukan ${found.length} perangkat BLE: ${found.map((d) => d.name).join(', ')}.`)
    } catch (err) {
      setMsg(humanConnectError(err?.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleConnect() {
    if (!pick) {
      setMsg('Pilih printer dari daftar perangkat yang sudah dipasangkan.')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const result = await connectPrinter(pick)
      const device = devices.find((d) => d.address === pick)
      setPrinterDevice(result.address, result.name || device?.name || '')
      setStatus({ connected: true, name: result.name, address: result.address })
      setMsg('Printer terhubung.')
    } catch (err) {
      setMsg(humanConnectError(err?.message))
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    setBusy(true)
    setMsg('')
    try {
      await disconnectPrinter()
      setStatus({ connected: false, name: null, address: null })
      setMsg('Printer diputus.')
    } catch (err) {
      setMsg(err?.message || 'Gagal memutus koneksi.')
    } finally {
      setBusy(false)
    }
  }

  async function handleTestPrint() {
    setTestBusy(true)
    setMsg('')
    try {
      const result = await printTestReceipt()
      if (result.ok) setMsg('Tes cetak terkirim ke printer.')
      else setMsg(result.message || 'Tes cetak gagal.')
    } finally {
      setTestBusy(false)
    }
  }

  return (
    <section className="card mb-4 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="kop-serif text-base font-bold text-gov-dark sm:text-lg">
            Printer Struk (Bluetooth)
          </h2>
          <p className="mt-0.5 text-xs text-gov-muted sm:text-sm">
            Pasangkan BP-ECO58D di pengaturan Android, lalu hubungkan di sini.
          </p>
        </div>
        <PrinterPill connected={Boolean(status.connected)} label={statusLabel} />
      </div>

      {!native && (
        <p className="rounded-lg bg-gov-gold/10 px-3 py-2 text-sm text-gov-ink">
          Di browser dev, cetak memakai dialog sistem. Di tablet APK, struk dikirim
          langsung lewat Bluetooth.
        </p>
      )}

      {native && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary btn-press" onClick={handleAutoConnect} disabled={busy}>
              {busy ? 'Mencari dan menghubungkan...' : 'Cari dan Hubungkan Otomatis'}
            </button>
            <button type="button" className="btn-secondary btn-press" onClick={handleScan} disabled={busy}>
              Pindai BLE
            </button>
            <button type="button" className="btn-ghost btn-press" onClick={loadDevices} disabled={busy}>
              Muat Ulang
            </button>
          </div>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-gov-muted">Pilih perangkat secara manual</summary>
            <select
              id="printerPick"
              className="input mt-2"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              disabled={busy}
            >
              <option value="">Pilih printer...</option>
              {devices.map((d) => (
                <option key={d.address} value={d.address}>
                  {d.name} ({d.address})
                </option>
              ))}
            </select>
            <motionButtons
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onTest={handleTestPrint}
              onRefresh={loadDevices}
              busy={busy}
              testBusy={testBusy}
              connected={status.connected}
            />
          </details>
        </>
      )}

      {msg ? (
        <p className="mt-3 rounded-lg border border-gov-muted/25 bg-white px-3 py-2 text-sm text-gov-ink">
          {msg}
        </p>
      ) : null}

      {diagnostics ? (
        <details className="mt-2 rounded-lg border border-gov-muted/25 bg-gov-cream px-3 py-2 text-xs text-gov-ink">
          <summary className="cursor-pointer font-semibold">Detail teknis koneksi</summary>
          <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
            {diagnostics}
          </pre>
        </details>
      ) : null}
    </section>
  )
}

function PrinterPill({ connected, label }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:text-sm ${
        connected
          ? 'bg-gov-green/15 text-gov-dark ring-2 ring-gov-green/40'
          : 'bg-red-50 text-red-800 ring-2 ring-red-200'
      }`}
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${connected ? 'bg-gov-green' : 'bg-red-500'}`}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </span>
  )
}

export function PrinterPillCompact({ connected, name }) {
  const label = connected ? name || 'Printer OK' : 'Printer off'
  return <PrinterPill connected={connected} label={label} />
}

function humanConnectError(raw) {
  const m = (raw || '').toLowerCase()
  if (!m) {
    return 'Gagal terhubung. Nyalakan printer, lepaskan dari perangkat lain, lalu tekan Cari dan Hubungkan Otomatis.'
  }
  if (m.includes('izin bluetooth ditolak') || m.includes('permission denied') || m.includes('securityexception')) {
    return 'Izin Bluetooth ditolak sistem. Buka Setelan aplikasi > Izin > Perangkat di sekitar, lalu Izinkan, lalu ulangi.'
  }
  if (m.includes('dimatikan') || m.includes('tidak tersedia')) {
    return 'Bluetooth tidak aktif atau tidak tersedia. Nyalakan Bluetooth di Setelan Android.'
  }
  if (m.includes('belum ada printer') || m.includes('tidak ada perangkat yang dipasangkan')) {
    return 'Printer belum dipasangkan. Setelan Android > Bluetooth > pasang printer dulu (nama akan muncul di daftar), lalu kembali ke aplikasi ini.'
  }
  if (m.includes('read failed') || m.includes('socket') || m.includes('timeout') || m.includes('tidak ada yang menerima')) {
    return 'Printer menolak koneksi. Coba: (1) matikan-nyalakan printer, (2) lepaskan printer dari HP/laptop lain, (3) buka "Detail teknis koneksi" di bawah untuk melihat alasan pasti.'
  }
  return raw
}

function motionButtons({ onConnect, onDisconnect, onTest, onRefresh, busy, testBusy, connected }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className="btn-primary btn-press" onClick={onConnect} disabled={busy}>
        {busy ? 'Memproses...' : 'Hubungkan'}
      </button>
      <button
        type="button"
        className="btn-secondary btn-press"
        onClick={onDisconnect}
        disabled={busy || !connected}
      >
        Putuskan
      </button>
      <button type="button" className="btn-secondary btn-press" onClick={onTest} disabled={testBusy || !connected}>
        {testBusy ? 'Mencetak...' : 'Tes Cetak'}
      </button>
      <button type="button" className="btn-ghost btn-press" onClick={onRefresh} disabled={busy}>
        Muat Ulang
      </button>
    </div>
  )
}
