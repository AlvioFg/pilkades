import { useState } from 'react'
import Layout from '../components/Layout'
import QrScanner from '../lib/scanner'
import { selectTally, useStore } from '../store'

/**
 * Pemindai kotak suara (mode demo penghitungan manual).
 *
 * Setiap struk yang discan dicocokkan dengan data suara yang tercatat:
 *   seed sesi sama -> ballotId dikenal -> nomor kandidat sesuai.
 * Struk yang sama discan dua kali TIDAK menambah suara (idempoten).
 */
export default function BoxScan() {
  const countBoxScan = useStore((s) => s.countBoxScan)
  const setView = useStore((s) => s.setView)
  const setCountMode = useStore((s) => s.setCountMode)
  const tally = useStore(selectTally)

  const [message, setMessage] = useState(null)
  const [last, setLast] = useState(null)
  const [manualCode, setManualCode] = useState('')

  function handleCode(raw) {
    const result = countBoxScan(raw)

    if (!result.ok) {
      setMessage({ tone: 'error', text: result.message })
      setLast(null)
      return
    }

    if (result.status === 'duplicate') {
      setMessage({ tone: 'warn', text: 'Sudah dihitung: struk ini pernah dipindai sebelumnya.' })
    } else {
      setMessage({ tone: 'ok', text: 'Suara tercatat.' })
    }
    setLast(result.ballot)
  }

  const { counted, total, pending } = tally

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 text-center">
          <h1 className="kop-serif text-2xl font-bold text-gov-dark sm:text-3xl">
            Pemindai Kotak Suara
          </h1>
          <p className="mt-1 text-sm text-gov-muted">
            Pindai QR code struk suara satu per satu, seperti penghitungan manual.
          </p>
        </div>

        <div className="card mb-4 border-gov-green/40 bg-gov-green/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-gov-muted">Terhitung</p>
              <p className="kop-serif text-3xl font-bold text-gov-dark">{counted}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gov-muted">Belum Terhitung</p>
              <p className="kop-serif text-3xl font-bold text-gov-gold">{pending}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gov-muted">Total Struk</p>
              <p className="kop-serif text-3xl font-bold text-gov-muted">{total}</p>
            </div>
          </div>

          {pending === 0 && total > 0 && (
            <p className="mt-3 rounded-lg bg-gov-green/10 px-4 py-2 text-center text-sm font-semibold text-gov-dark">
              Semua struk sudah terhitung: COCOK dengan catatan otomatis ✅
            </p>
          )}
        </div>

        {message && (
          <div
            className={`card mb-4 p-4 ${
              message.tone === 'ok'
                ? 'border-gov-green bg-gov-green/5'
                : message.tone === 'warn'
                  ? 'border-gov-gold bg-gov-gold/10'
                  : 'border-red-300 bg-red-50'
            }`}
          >
            <p
              className={`font-semibold ${
                message.tone === 'error' ? 'text-red-800' : 'text-gov-dark'
              }`}
            >
              {message.text}
            </p>
            {last ? (
              <p className="mt-1 text-sm text-gov-muted">
                Kandidat nomor <strong>{last.candidateNo}</strong> · struk{' '}
                <span className="font-mono">{last.id}</span>
              </p>
            ) : null}
          </div>
        )}

        <div className="card p-5">
          <QrScanner
            formats={['QR_CODE']}
            qrbox={{ width: 260, height: 260 }}
            onResult={handleCode}
          />

          <details className="mt-4 border-t border-gov-muted/20 pt-4">
            <summary className="cursor-pointer font-semibold text-gov-dark">
              Ketik kode struk manual
            </summary>
            <p className="mt-2 text-sm text-gov-muted">
              Cadangan bila QR code tidak terbaca. Kode struk adalah isi QR pada
              struk suara, mis. <span className="font-mono">SPV1|xxxx|yyyy|3</span>.
            </p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                handleCode(manualCode)
                setManualCode('')
              }}
            >
              <input
                className="input flex-1 font-mono text-sm"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="SPV1|..."
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="btn-secondary shrink-0">
                Hitung
              </button>
            </form>
          </details>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setCountMode('box')
              setView('recap')
            }}
          >
            Lihat Rekap
          </button>
          <button type="button" className="btn-ghost" onClick={() => setView('home')}>
            Beranda
          </button>
        </div>
      </div>
    </Layout>
  )
}
