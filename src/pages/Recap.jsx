import { useState } from 'react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import { CANDIDATES } from '../data/candidates'
import { selectTally, useStore } from '../store'

/**
 * Rekap panitia (ringkas).
 *
 * Jumlah suara SELALU diturunkan dari array ballots (lihat tally() di store),
 * mode hanya jadi filter baca:
 *   auto = semua suara saat warga memilih
 *   box  = hanya suara yang struknya sudah discan dari kotak suara
 * Karena itu auto ⊇ box dan berpindah mode tidak pernah menggeser data.
 */
export default function Recap() {
  const session = useStore((s) => s.session)
  const tickets = useStore((s) => s.tickets)
  const tally = useStore(selectTally)
  const setCountMode = useStore((s) => s.setCountMode)
  const setBilik = useStore((s) => s.setBilik)
  const resetVotes = useStore((s) => s.resetVotes)
  const exportJson = useStore((s) => s.exportJson)
  const importJson = useStore((s) => s.importJson)
  const setView = useStore((s) => s.setView)

  const [modePrompt, setModePrompt] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetText, setResetText] = useState('')
  const [importMsg, setImportMsg] = useState('')

  const { counts, counted, total, pending } = tally
  const isBox = session.countMode === 'box'
  const max = Math.max(1, ...Object.values(counts))

  function switchMode(next) {
    if (next === session.countMode) return
    setModePrompt(next)
  }

  function applyMode(next) {
    setCountMode(next)
    setModePrompt(null)
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = importJson(String(reader.result))
      setImportMsg(result.ok ? 'Cadangan berhasil dimuat.' : result.message)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleReset() {
    if (resetText.trim().toUpperCase() !== 'HAPUS') return
    resetVotes()
    setResetText('')
    setConfirmReset(false)
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="kop-serif text-2xl font-bold text-gov-dark sm:text-3xl">
              Rekap Suara Panitia
            </h1>
            <p className="text-sm text-gov-muted">
              {session.village || '-'} · TPS {session.tps || '1'} · BILIK {session.bilik || '1'} ·{' '}
              Kode <span className="font-mono">{session.code || '-'}</span>
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => setView('home')}>
            Beranda
          </button>
        </div>

        {/* Mode hitung */}
        <div className="card mb-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gov-dark">Mode Penghitungan</p>
              <p className="text-sm text-gov-muted">
                {isBox
                  ? `Mode Kotak: ${counted} dari ${total} surat terhitung`
                  : `Mode Otomatis: semua suara masuk saat warga memilih`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={isBox ? 'btn-ghost' : 'btn-primary'}
                onClick={() => switchMode('auto')}
              >
                Otomatis
              </button>
              <button
                type="button"
                className={isBox ? 'btn-primary' : 'btn-ghost'}
                onClick={() => switchMode('box')}
              >
                Mode Kotak
              </button>
            </div>
          </div>

          {isBox && pending > 0 && (
            <p className="mt-3 rounded-lg bg-gov-gold/10 px-4 py-2 text-sm text-gov-ink">
              Masih <strong>{pending}</strong> struk belum discan dari kotak suara.{' '}
              <button
                type="button"
                className="font-semibold text-gov-green underline"
                onClick={() => setView('box')}
              >
                Buka pemindai kotak suara
              </button>
            </p>
          )}
        </div>

        {/* Ganti bilik suara di tengah sesi */}
        <div className="card mb-5 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-40 flex-1">
              <label className="label" htmlFor="recapBilik">
                Bilik Suara yang Sedang Dipakai
              </label>
              <input
                id="recapBilik"
                className="input"
                defaultValue={session.bilik || '1'}
                onBlur={(e) => setBilik(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <p className="text-xs text-gov-muted">
              Nomor ini tercetak di struk suara dan kop halaman.
            </p>
          </div>
        </div>

        {/* Tabel per calon */}
        <div className="card mb-5 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gov-green text-white">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">No</th>
                <th className="px-4 py-3 text-sm font-semibold">Calon</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Suara</th>
              </tr>
            </thead>
            <tbody>
              {CANDIDATES.map((c) => (
                <tr key={c.no} className="border-t border-gov-muted/15">
                  <td className="px-4 py-3">
                    <span
                      className="kop-serif flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.no}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="kop-serif font-bold text-gov-ink">{c.name}</p>
                    <div className="mt-1 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gov-muted/15">
                      <div
                        className="h-full rounded-full bg-gov-green"
                        style={{ width: `${(counts[c.no] / max) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="kop-serif text-2xl font-bold text-gov-dark">
                      {counts[c.no]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gov-green/30 bg-gov-cream">
              <tr>
                <td className="px-4 py-3" colSpan={2}>
                  <span className="font-semibold text-gov-dark">
                    Total Suara {isBox ? 'Terhitung' : 'Masuk'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="kop-serif text-2xl font-bold text-gov-green">{counted}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {isBox && pending === 0 && total > 0 && (
          <div className="card mb-5 border-gov-green bg-gov-green/5 p-4">
            <p className="font-semibold text-gov-dark">
              Hasil Kotak: {counted}: Catatan Otomatis: {total}{' '}
              {counted === total ? 'COCOK ✅' : 'BELUM COCOK ⚠️'}
            </p>
          </div>
        )}

        <div className="card p-5">
          <p className="mb-3 text-sm text-gov-muted">
            Tiket terdaftar: <strong>{tickets.length}</strong> · Suara tercatat:{' '}
            <strong>{total}</strong>
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setView('box')}
            >
              Pemindai Kotak Suara
            </button>
            <button type="button" className="btn-ghost" onClick={exportJson}>
              Ekspor Cadangan
            </button>
            <label className="btn-ghost cursor-pointer">
              Impor Cadangan
              <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
            </label>
            <button type="button" className="btn-danger" onClick={() => setConfirmReset(true)}>
              Reset Suara
            </button>
          </div>
          {importMsg ? <p className="mt-3 text-sm text-gov-muted">{importMsg}</p> : null}
        </div>
      </div>

      <Modal
        open={Boolean(modePrompt)}
        title="Ganti Mode Penghitungan?"
        onClose={() => setModePrompt(null)}
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={() => setModePrompt(null)}>
              Batal
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => applyMode(modePrompt)}
            >
              Ganti Mode
            </button>
          </>
        }
      >
        {modePrompt === 'box' ? (
          <p>
            Dalam <strong>Mode Kotak</strong>, yang tampil hanya suara yang struknya sudah
            dipindai dari kotak suara. Angka <strong>{total}</strong> suara tetap tersimpan
            dan tidak hilang: buka pemindai kotak suara untuk menghitungnya satu per satu.
          </p>
        ) : (
          <p>
            Kembali ke <strong>Mode Otomatis</strong>: seluruh <strong>{total}</strong>{' '}
            suara yang tercatat langsung dihitung tanpa perlu memindai struk.
          </p>
        )}
      </Modal>

      <Modal
        open={confirmReset}
        title="Reset Semua Suara?"
        tone="danger"
        onClose={() => {
          setConfirmReset(false)
          setResetText('')
        }}
        actions={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setConfirmReset(false)
                setResetText('')
              }}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleReset}
              disabled={resetText.trim().toUpperCase() !== 'HAPUS'}
            >
              Reset
            </button>
          </>
        }
      >
        <p className="mb-3">
          Semua suara dan status tiket akan dikosongkan. Info sesi tetap tersimpan.
        </p>
        <label className="label" htmlFor="resetVotesText">
          Ketik <strong>HAPUS</strong> untuk melanjutkan
        </label>
        <input
          id="resetVotesText"
          className="input"
          value={resetText}
          onChange={(e) => setResetText(e.target.value)}
          placeholder="HAPUS"
          autoComplete="off"
        />
      </Modal>
    </Layout>
  )
}
