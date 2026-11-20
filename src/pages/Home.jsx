import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import PrinterSetup from '../components/PrinterSetup.jsx'
import Modal from '../components/Modal'
import { enterFullscreen, keepAwake, watchVisibility } from '../lib/kiosk'
import { useStore } from '../store'

/**
 * Beranda: setup sesi sekali (desa / TPS / petugas), lalu mulai alur warga.
 */
export default function Home() {
  const session = useStore((s) => s.session)
  const tickets = useStore((s) => s.tickets)
  const ballots = useStore((s) => s.ballots)
  const startSession = useStore((s) => s.startSession)
  const generateDemoTickets = useStore((s) => s.generateDemoTickets)
  const setView = useStore((s) => s.setView)
  const resetSession = useStore((s) => s.resetSession)

  const [form, setForm] = useState({
    village: session.village || 'DESA DAYEUHKOLOT',
    regency: session.regency || 'KABUPATEN SUBANG',
    kecamatan: session.kecamatan || 'KECAMATAN SAGALAHERANG',
    tps: session.tps || '1',
    bilik: session.bilik || '1',
    officerName: session.officerName || '',
    officerRole: session.officerRole || 'Ketua KPPS',
  })

  const [confirmReset, setConfirmReset] = useState(false)
  const [resetText, setResetText] = useState('')

  const sessionActive = Boolean(session.startedAt)
  const unusedTickets = tickets.filter((t) => t.status === 'unused').length

  // Mode kios: layar tidak boleh tidur selama pemungutan suara berjalan.
  // Kunci layar dilepas otomatis saat tab disembunyikan, jadi harus
  // diminta ulang setiap kali tab kembali terlihat.
  useEffect(() => {
    let release = null
    let stopWatching = null

    async function acquire() {
      release = await keepAwake()
    }

    if (sessionActive) {
      acquire()
      stopWatching = watchVisibility(() => {
        if (release) release()
        acquire()
      })
    }

    return () => {
      stopWatching?.()
      release?.()
    }
  }, [sessionActive])

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function handleStart() {
    if (!form.officerName.trim()) {
      alert('Isi nama petugas terlebih dahulu.')
      return
    }
    startSession({ ...form, officerName: form.officerName.trim() })
    // Layar penuh harus dipicu dari klik pengguna (browser mewajibkan
    // user gesture untuk requestFullscreen).
    enterFullscreen()
  }

  function handleReset() {
    if (resetText.trim().toUpperCase() !== 'HAPUS') return
    resetSession()
    setResetText('')
    setConfirmReset(false)
    setForm({
      village: 'DESA DAYEUHKOLOT',
      regency: 'KABUPATEN SUBANG',
      kecamatan: 'KECAMATAN SAGALAHERANG',
      tps: '1',
      bilik: '1',
      officerName: '',
      officerRole: 'Ketua KPPS',
    })
  }

  return (
    <Layout showKop={false}>
      <div className="mx-auto max-w-3xl">
        <PrinterSetup />

        <div className="mb-4 text-center">
          <img src="./logo.png" alt="" className="mx-auto mb-3 h-16 w-16" />
          <h1 className="kop-serif text-2xl font-bold uppercase text-gov-dark sm:text-3xl">
            Simulasi Pemungutan Suara
          </h1>
          <p className="kop-serif text-sm uppercase tracking-wide text-gov-muted">
            KPPS Pemilihan Kepala Desa
          </p>
        </div>

        {sessionActive && (
          <div className="card mb-6 border-gov-green/40 bg-gov-green/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gov-dark">Sesi sedang berjalan</p>
                <p className="text-sm text-gov-muted">
                  {session.village} · TPS {session.tps} · BILIK {session.bilik} · Kode{' '}
                  <span className="font-mono font-semibold">{session.code}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setView('scan')}
                >
                  Lanjut ke Pemindaian
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setView('recap')}
                >
                  Rekap
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="card p-6">
          <h2 className="kop-serif mb-5 border-b-2 border-gov-green/20 pb-3 text-lg font-bold text-gov-dark">
            Data Sesi Pemungutan Suara
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="village">
                Nama Desa
              </label>
              <input
                id="village"
                className="input"
                value={form.village}
                onChange={update('village')}
                placeholder="DESA DAYEUHKOLOT"
              />
            </div>

            <div>
              <label className="label" htmlFor="regency">
                Kabupaten / Kota
              </label>
              <input id="regency" className="input" value={form.regency} onChange={update('regency')} />
            </div>

            <div>
              <label className="label" htmlFor="kecamatan">
                Kecamatan
              </label>
              <input
                id="kecamatan"
                className="input"
                value={form.kecamatan}
                onChange={update('kecamatan')}
              />
            </div>

            <div>
              <label className="label" htmlFor="tps">
                Nomor TPS
              </label>
              <input
                id="tps"
                className="input"
                value={form.tps}
                onChange={update('tps')}
                placeholder="1"
                inputMode="numeric"
              />
              <p className="mt-1 text-xs text-gov-muted">Ditampilkan sebagai "TPS 1".</p>
            </div>

            <div>
              <label className="label" htmlFor="bilik">
                Nomor Bilik Suara
              </label>
              <input
                id="bilik"
                className="input"
                value={form.bilik}
                onChange={update('bilik')}
                placeholder="1"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="label" htmlFor="officerRole">
                Jabatan Petugas
              </label>
              <input
                id="officerRole"
                className="input"
                value={form.officerRole}
                onChange={update('officerRole')}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="officerName">
                Nama Petugas KPPS <span className="text-red-700">*</span>
              </label>
              <input
                id="officerName"
                className="input"
                value={form.officerName}
                onChange={update('officerName')}
                placeholder="Contoh: H. Ahmad Fauzi"
              />
            </div>
          </div>

          <button
            type="button"
            className="btn-primary btn-press mt-4 w-full text-lg"
            onClick={handleStart}
          >
            {sessionActive ? 'Perbarui Data & Lanjutkan' : 'Mulai Sesi Pemungutan Suara'}
          </button>
        </section>

        <section className="card mt-6 p-6">
          <h2 className="kop-serif mb-2 border-b-2 border-gov-green/20 pb-3 text-lg font-bold text-gov-dark">
            Undangan Demo (untuk uji coba)
          </h2>
          <p className="mb-4 text-sm text-gov-muted">
            Buat daftar warga dummy + QR code undangan agar alur bisa dicoba tanpa
            kertas sungguhan. Total tiket: <strong>{tickets.length}</strong> · belum
            dipakai: <strong>{unusedTickets}</strong> · suara masuk:{' '}
            <strong>{ballots.length}</strong>
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => generateDemoTickets(40)}
            >
              Buat 40 Tiket Demo
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setView('tickets')}
              disabled={tickets.length === 0}
            >
              Lihat & Cetak Undangan
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setView('about')}
            >
              Tentang Aplikasi
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => setConfirmReset(true)}
            >
              Reset Semua Data
            </button>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-gov-muted">
          Aplikasi simulasi untuk keperluan demonstrasi. Bukan aplikasi pemungutan suara
          yang sah secara hukum.
        </p>
      </div>

      <Modal
        open={confirmReset}
        title="Reset Semua Data?"
        tone="danger"
        dismissable
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
          Semua data sesi, tiket, dan suara akan dihapus dari perangkat ini. Tindakan ini
          tidak bisa dibatalkan.
        </p>
        <label className="label" htmlFor="resetText">
          Ketik <strong>HAPUS</strong> untuk melanjutkan
        </label>
        <input
          id="resetText"
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
