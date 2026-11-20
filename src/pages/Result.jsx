import { useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../components/Layout'
import BallotDrop from '../components/BallotDrop'
import Receipt from '../components/Receipt'
import { getCandidate } from '../data/candidates'
import { printBallotReceipt } from '../lib/printReceipt.js'
import { buildBallotPayload, useStore } from '../store'

/**
 * Halaman warga #3: struk suara siap cetak otomatis (Bluetooth ESC/POS di APK).
 */
export default function Result() {
  const ballots = useStore((s) => s.ballots)
  const session = useStore((s) => s.session)
  const lastBallotId = useStore((s) => s.ui.lastBallotId)
  const nextVoter = useStore((s) => s.nextVoter)
  const setView = useStore((s) => s.setView)

  const [printing, setPrinting] = useState(false)
  const [printed, setPrinted] = useState(false)
  const [printError, setPrintError] = useState('')
  const [showAnimation, setShowAnimation] = useState(true)
  const timersRef = useRef(null)

  const ballot = useMemo(
    () => ballots.find((b) => b.id === lastBallotId) ?? null,
    [ballots, lastBallotId],
  )

  const payload = useMemo(
    () => (ballot ? buildBallotPayload(ballot.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ballot?.id, session.seed],
  )

  useEffect(() => {
    if (!ballot) return undefined
    setShowAnimation(true)
    const timer = window.setTimeout(() => setShowAnimation(false), 1900)
    return () => window.clearTimeout(timer)
  }, [ballot?.id])

  useEffect(() => {
    if (!ballot) return undefined

    const id = ballot.id
    setPrinting(true)
    setPrintError('')
    setPrinted(false)

    const currentBallot = ballot
    const currentPayload = buildBallotPayload(ballot.id)

    const printTimer = window.setTimeout(() => {
      printBallotReceipt({
        ballot: currentBallot,
        payload: currentPayload,
        session,
      }).then((res) => {
        setPrinting(false)
        if (res.ok) setPrinted(true)
        else setPrintError(res.message || 'Cetak gagal. Periksa printer di Beranda.')
      })
    }, 120)

    const scanTimer = window.setTimeout(() => {
      nextVoter()
    }, 3000)
    timersRef.current = { id, printTimer, scanTimer }

    return () => {}
  }, [ballot?.id, nextVoter, session])

  useEffect(() => {
    return () => {
      const t = timersRef.current
      if (!t) return
      window.clearTimeout(t.printTimer)
      window.clearTimeout(t.scanTimer)
      timersRef.current = null
    }
  }, [])

  if (!ballot) {
    return (
      <Layout>
        <div className="card mx-auto max-w-lg p-6 text-center">
          <p className="kop-serif text-xl font-bold text-gov-dark">Belum Ada Suara Tercatat</p>
          <button type="button" className="btn-primary btn-press mt-4 w-full" onClick={() => setView('scan')}>
            Mulai Pindai Undangan
          </button>
        </div>
      </Layout>
    )
  }

  const candidate = getCandidate(ballot.candidateNo)

  let statusText = 'Menyiapkan cetak otomatis...'
  if (printing) statusText = 'Mencetak struk...'
  else if (printed) statusText = 'Struk dikirim ke printer.'
  else if (printError) statusText = printError

  return (
    <Layout>
      {showAnimation && <BallotDrop ballot={ballot} session={session} />}

      <div className="page-vote-fill mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col justify-center gap-2 sm:gap-3 lg:grid lg:grid-cols-2 lg:items-center lg:gap-4">
        <div className="no-print min-h-0 shrink-0 lg:shrink">
          <div className="mb-2 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-gov-green">Langkah 3 dari 3</p>
            <h1 className="kop-serif text-xl font-bold text-gov-dark sm:text-2xl">Struk Suara</h1>
          </div>

          <div className="card border-gov-green/40 bg-gov-green/5 p-3 text-center sm:p-4">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gov-green text-2xl text-white">
              ✓
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gov-green">Suara Tercatat</p>
            <p className="kop-serif mt-1 text-xl font-bold leading-tight text-gov-dark sm:text-2xl">
              {candidate?.no}. {candidate?.name}
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <p
              className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                printError ? 'bg-red-50 text-red-800' : 'bg-gov-green/10 text-gov-dark'
              }`}
            >
              {statusText} Kembali ke pemindaian dalam 3 detik.
            </p>

            <button
              type="button"
              className="btn-secondary btn-press w-full"
              onClick={() => {
                nextVoter()
                setPrinted(false)
              }}
            >
              Kembali ke Pemindaian
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-end pb-1 lg:justify-center lg:pb-0">
          <p className="no-print mb-1 shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-gov-muted">
            Pratinjau Struk (58 mm)
          </p>
          <div className="receipt-screen-shell">
            <Receipt ballot={ballot} payload={payload} session={session} screen />
          </div>
        </div>
      </div>
    </Layout>
  )
}
