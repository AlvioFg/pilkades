import { useState } from 'react'
import Layout from '../components/Layout'
import { CANDIDATES } from '../data/candidates'
import { useStore } from '../store'

const SELECT_DELAY_MS = 160

export default function ChooseCandidate() {
  const castVote = useStore((s) => s.castVote)
  const activeTicketId = useStore((s) => s.ui.activeTicketId)
  const setView = useStore((s) => s.setView)

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pressedNo, setPressedNo] = useState(null)

  function handleSelect(candidate) {
    if (busy) return
    setError('')
    setBusy(true)
    setPressedNo(candidate.no)

    window.setTimeout(() => {
      const result = castVote(candidate.no)
      if (!result.ok) {
        setError(result.message)
        setBusy(false)
        setPressedNo(null)
      }
    }, SELECT_DELAY_MS)
  }

  if (!activeTicketId) {
    return (
      <Layout>
        <div className="card mx-auto max-w-lg p-6 text-center">
          <p className="kop-serif text-xl font-bold text-gov-dark">Belum Ada Warga Terdaftar</p>
          <p className="mt-2 text-sm text-gov-muted">
            Pindai QR code undangan terlebih dahulu sebelum memilih kandidat.
          </p>
          <button type="button" className="btn-primary btn-press mt-4 w-full" onClick={() => setView('scan')}>
            Ke Halaman Pemindaian
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-vote-fill mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col">
        <div className="mb-2 shrink-0 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gov-green">Langkah 2 dari 3</p>
          <h1 className="kop-serif text-lg font-bold text-gov-dark sm:text-2xl">Pilih Satu Calon Kepala Desa</h1>
        </div>

        {error && (
          <div className="card mb-2 shrink-0 border-red-300 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-800">{error}</p>
          </div>
        )}

        <div className="candidate-vote-grid gap-1 sm:gap-2">
          {CANDIDATES.map((c) => (
            <CandidateCard
              key={c.no}
              candidate={c}
              onSelect={() => handleSelect(c)}
              disabled={busy}
              pressed={pressedNo === c.no}
            />
          ))}
        </div>

        <div className="mt-2 shrink-0 text-center">
          <button type="button" className="btn-ghost btn-press text-sm" onClick={() => setView('scan')}>
            Kembali ke Pemindaian
          </button>
        </div>
      </div>
    </Layout>
  )
}

function CandidateCard({ candidate, onSelect, disabled, pressed }) {
  const [imgError, setImgError] = useState(false)

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`card tap-card candidate-card group p-0 disabled:pointer-events-none disabled:opacity-50 ${
        pressed ? 'scale-95 border-gov-green ring-4 ring-gov-gold' : ''
      }`}
    >
      <span className="candidate-card-no text-gov-ink">{candidate.no}</span>

      <span className="candidate-card-photo">
        {imgError ? (
          <span
            className="flex h-full min-h-0 w-full items-center justify-center text-base font-bold text-white"
            style={{ backgroundColor: candidate.color }}
          >
            {candidate.no}
          </span>
        ) : (
          <img
            src={candidate.photo}
            alt={`Foto Calon Nomor ${candidate.no}`}
            onError={() => setImgError(true)}
            draggable={false}
          />
        )}
      </span>

      <span className="candidate-card-name text-gov-ink">
        <span>{candidate.name}</span>
      </span>
    </button>
  )
}
