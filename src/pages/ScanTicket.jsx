import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import QrScanner from '../lib/scanner'
import { useStore } from '../store'

export default function ScanTicket() {
  const admitTicket = useStore((s) => s.admitTicket)
  const undoAdmit = useStore((s) => s.undoAdmit)
  const setView = useStore((s) => s.setView)
  const activeTicketId = useStore((s) => s.ui.activeTicketId)

  const [manualCode, setManualCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [busy, setBusy] = useState(false)
  const processedRef = useRef(false)

  useEffect(() => {
    if (!busy) processedRef.current = false
  }, [busy])

  function handleCode(raw) {
    if (processedRef.current) return
    processedRef.current = true
    setBusy(true)

    const result = admitTicket(raw)

    if (result.ok) {
      setSuccess(result.ticket)
      setError('')
    } else {
      setError(result.message)
      setSuccess(null)
    }

    setTimeout(() => {
      processedRef.current = false
      setBusy(false)
    }, 1200)
  }

  function goToVote() {
    setSuccess(null)
    setView('vote')
  }

  function handleUndo() {
    undoAdmit()
    setSuccess(null)
    setError('')
  }

  return (
    <Layout>
      <div className="page-vote-fill mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col justify-center">
        <div className="mb-2 shrink-0 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gov-green">Langkah 1 dari 3</p>
          <h1 className="kop-serif text-lg font-bold text-gov-dark sm:text-2xl">Pindai QR Code Undangan</h1>
        </div>

        {success ? (
          <div className="card border-gov-green bg-gov-green/5 p-4 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gov-green text-2xl text-white">
              ✓
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gov-green">Tiket Valid</p>
            <p className="kop-serif mt-1 text-xl font-bold text-gov-dark">{success.name}</p>
            <p className="mt-1 text-xs text-gov-muted">
              {success.address} · <span className="font-mono">{success.id}</span>
            </p>
            <button type="button" className="btn-primary btn-press mt-4 w-full" onClick={goToVote}>
              Lanjut Memilih Calon
            </button>
            <button type="button" className="btn-ghost btn-press mt-2 w-full text-sm" onClick={handleUndo}>
              Batalkan Kehadiran
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="card min-h-0 flex-1 p-2 sm:p-3">
              <QrScanner formats={['QR_CODE']} qrbox={{ width: 220, height: 220 }} onResult={handleCode} />
            </div>

            {error && (
              <div className="card shrink-0 border-red-300 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-800">Tiket Ditolak</p>
                <p className="mt-0.5 text-xs text-red-700">{error}</p>
              </div>
            )}

            <details className="card shrink-0 p-3 text-sm">
              <summary className="cursor-pointer font-semibold text-gov-dark">Kode tiket manual</summary>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCode(manualCode)
                  setManualCode('')
                }}
              >
                <input
                  className="input font-mono text-sm"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="TKT-2026-000001"
                  autoCapitalize="characters"
                  autoComplete="off"
                />
                <button type="submit" className="btn-secondary btn-press shrink-0">
                  Periksa
                </button>
              </form>
            </details>
          </div>
        )}

        {activeTicketId && !success && (
          <div className="card mt-2 shrink-0 border-gov-gold/50 bg-gov-gold/10 p-3">
            <p className="text-xs text-gov-ink">
              Warga terdaftar: <span className="font-mono font-semibold">{activeTicketId}</span>
            </p>
            <button type="button" className="btn-secondary btn-press mt-2 text-sm" onClick={() => setView('vote')}>
              Lanjut ke Pemilihan
            </button>
          </div>
        )}

        <div className="mt-2 shrink-0 text-center">
          <button type="button" className="btn-ghost btn-press text-sm" onClick={() => setView('home')}>
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </Layout>
  )
}
