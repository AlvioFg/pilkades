import { getCandidate } from '../data/candidates'

/**
 * Animasi "nyoblos": kartu suara turun ke kotak suara.
 *
 * Komponen ini presentasional murni: timing overtlyana diatur oleh
 * halaman pemanggil (timer di sana). Alasannya: StrictMode di React 19
 * memanggil effect dua kali di mode dev, sehingga effect yang memasang
 * timer di dalam komponen ini bisa punya timer yang dibuang pada
 * render kedua dan animasi tidak pernah selesai.
 *
 * Seluruh animasi pakai CSS keyframes (tanpa library) supaya ringan
 * di tablet lama.
 *
 * Alur waktu:
 *   0.0s  kartu suara muncul di atas
 *   0.3s  kartu jatuh ke slot kotak suara (miring sedikit)
 *   1.3s  kotak suara bergetar menerima suara
 *   1.9s  overlay memudar, halaman struk tampil
 */
export default function BallotDrop({ ballot, session }) {
  const candidate = getCandidate(ballot?.candidateNo)

  if (!ballot) return null

  return (
    <div className="no-print fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gov-dark px-5">

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.14),transparent_62%)]" />

      <p className="kop-serif relative z-10 text-lg uppercase tracking-[0.3em] text-white/85">
        Pencatatan Suara
      </p>

      <div className="relative z-10 mt-6 h-[26rem] w-full max-w-sm">
        <div className="drop-shadow" />
        <div className="drop-card">
          <div className="rounded-lg border-2 border-gov-green/40 bg-white px-3 py-3 text-center shadow-2xl">
            <p className="text-[9px] uppercase tracking-wide text-gov-muted">Suara Untuk</p>
            <p className="kop-serif text-5xl font-bold leading-none text-gov-green">
              {ballot.candidateNo}
            </p>
            <div className="mx-auto mt-1.5 grid w-12 grid-cols-4 gap-[2px]">
              {Array.from({ length: 16 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 ${i % 3 === 0 ? 'bg-gov-green' : 'bg-gov-green/35'}`}
                />
              ))}
            </div>
            <p className="mt-1 text-[9px] text-gov-muted">{candidate?.initials}</p>
          </div>
        </div>

        {/* Kotak suara */}
        <div className="ballot-box">
          <div className="slot" />
          <div className="body">
            <span className="kop-serif text-[10px] uppercase tracking-[0.25em] text-white/80">
              Kotak Suara
            </span>
            <span className="kop-serif mt-1 block text-[9px] text-white/55">
              {session?.tps || 'TPS 01'}
            </span>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-4 max-w-sm text-center text-sm text-white/70">
        Suara untuk calon nomor <strong className="text-white">{ballot.candidateNo}</strong> masuk
        ke kotak suara
      </p>
    </div>
  )
}
