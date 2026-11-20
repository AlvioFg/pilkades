import Layout from '../components/Layout'
import { CANDIDATES } from '../data/candidates'
import { useStore } from '../store'

/**
 * Halaman "Tentang": selalu bisa diakses dari Beranda. Petugas perlu
 * tahu aplikasi ini simulasi, bukan pemungutan suara sah.
 */
export default function About() {
  const session = useStore((s) => s.session)
  const setView = useStore((s) => s.setView)

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="kop-serif text-2xl font-bold text-gov-dark sm:text-3xl">
              Tentang Aplikasi Simulasi
            </h1>
            <p className="text-sm text-gov-muted">
              {session.village || 'DESA DAYEUHKOLOT'} · Kode Sesi{' '}
              <span className="font-mono">{session.code || '-'}</span>
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => setView('home')}>
            Beranda
          </button>
        </div>

        <div className="card mb-5 border-gov-gold/40 bg-gov-gold/10 p-5">
          <p className="font-semibold text-gov-dark">Aplikasi ini adalah SIMULASI</p>
          <p className="mt-1 text-sm text-gov-ink">
            Dibuat untuk keperluan demonstrasi alat peraga pemilihan. Hasil pemungutan suara
            di aplikasi ini <strong>tidak sah secara hukum</strong> dan tidak dapat dijadikan
            dasar Penetapan Kepala Desa.
          </p>
        </div>

        <section className="card mb-5 p-5">
          <h2 className="kop-serif mb-3 text-lg font-bold text-gov-dark">Data Sesi</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gov-muted">Nama Desa</dt>
              <dd className="font-semibold">{session.village || '-'}</dd>
            </div>
            <div>
              <dt className="text-gov-muted">Kabupaten / Kota</dt>
              <dd className="font-semibold">{session.regency || '-'}</dd>
            </div>
            <div>
              <dt className="text-gov-muted">Kecamatan</dt>
              <dd className="font-semibold">{session.kecamatan || '-'}</dd>
            </div>
            <div>
              <dt className="text-gov-muted">TPS / Bilik</dt>
              <dd className="font-semibold">
                TPS {session.tps || '1'} / BILIK {session.bilik || '1'}
              </dd>
            </div>
            <div>
              <dt className="text-gov-muted">Petugas KPPS</dt>
              <dd className="font-semibold">{session.officerName || '-'}</dd>
            </div>
            <div>
              <dt className="text-gov-muted">Jabatan</dt>
              <dd className="font-semibold">{session.officerRole || '-'}</dd>
            </div>
          </dl>
        </section>

        <section className="card mb-5 p-5">
          <h2 className="kop-serif mb-3 text-lg font-bold text-gov-dark">Daftar Calon</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {CANDIDATES.map((c) => (
              <li key={c.no} className="flex items-center gap-3 rounded-lg border border-gov-muted/15 p-2">
                <img
                  src={c.photo}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="min-w-0">
                  <p className="kop-serif text-sm font-bold">
                    {c.no}. {c.name}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="kop-serif mb-3 text-lg font-bold text-gov-dark">Cara Kerja Aplikasi</h2>
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-gov-ink">
            <li>Warga menunjukkan QR code pada surat undangan ke kamera.</li>
            <li>Petugas memvalidasi tiket, lalu warga memilih satu calon.</li>
            <li>Suara tercatat dan struk 58 mm dicetak, lalu dimasukkan ke kotak suara.</li>
            <li>
              Rekap bisa dihitung otomatis (saat warga memilih) atau manual (mode kotak
              suara: struk dipindai satu per satu).
            </li>
          </ol>

          <p className="mt-4 text-xs text-gov-muted">
            Semua data tersimpan hanya di perangkat ini. Tidak ada koneksi internet, tidak ada
            server, tidak ada akun. Gunakan tombol Ekspor Cadangan di halaman Rekap untuk
            menyimpan salinan data.
          </p>
        </section>
      </div>
    </Layout>
  )
}
