import { useStore } from '../store'

/**
 * Kerangka aplikasi: kop desa (formal pemerintahan) + footer info sesi.
 * Shell full-viewport supaya alur TPS tidak perlu digulir.
 */
export default function Layout({ children, showKop = true, compact = false, fitViewport = false }) {
  const session = useStore((s) => s.session)
  const view = useStore((s) => s.view)
  const voterFlow = view === 'scan' || view === 'vote' || view === 'result'
  const homeView = view === 'home'

  const shellClass = fitViewport || voterFlow ? 'app-viewport' : 'min-h-dvh max-h-dvh overflow-hidden'

  return (
    <div className={`${shellClass} flex flex-col bg-gov-cream`}>
      {showKop && (
        <Kop session={session} compact={compact || voterFlow} />
      )}

      <main
        className={`mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 sm:px-5 ${
          fitViewport || voterFlow
            ? 'min-h-0 overflow-hidden py-2 sm:py-3'
            : homeView
              ? 'min-h-0 overflow-y-auto py-3 sm:py-4'
              : 'overflow-y-auto py-4 sm:py-5'
        }`}
      >
        <div className={fitViewport || voterFlow ? 'flex min-h-0 flex-1 flex-col' : ''}>{children}</div>
      </main>

      {!voterFlow && (
        <footer className="no-print kiosk-chrome shrink-0 px-3 pb-3 text-center text-xs text-gov-muted sm:px-5 sm:pb-4">
          {session.code ? (
            <>
              Kode Sesi <span className="font-mono font-semibold">{session.code}</span>
              {session.officerName ? <> · Petugas: {session.officerName}</> : null}
            </>
          ) : (
            'Aplikasi simulasi pemungutan suara Pilkades'
          )}
        </footer>
      )}
    </div>
  )
}

function Kop({ session, compact }) {
  return (
    <header className="no-print kiosk-chrome shrink-0 border-b-4 border-double border-gov-green/50 bg-white">
      <div
        className={`mx-auto flex w-full max-w-6xl items-center gap-3 px-3 sm:gap-4 sm:px-5 ${
          compact ? 'py-2' : 'py-3 sm:py-4'
        }`}
      >
        <img
          src="./logo.png"
          alt="Segel desa"
          className={`shrink-0 ${compact ? 'h-10 w-10 sm:h-12 sm:w-12' : 'h-12 w-12 sm:h-14 sm:w-14'}`}
        />

        <div className="min-w-0 flex-1 text-center">
          <p className="kop-serif truncate text-[10px] tracking-wide text-gov-ink sm:text-xs">
            PEMERINTAH {session.regency || 'KABUPATEN SUBANG'}
          </p>
          <p className="kop-serif truncate text-xs font-bold uppercase sm:text-base">
            {session.village || 'DESA DAYEUHKOLOT'}
          </p>
          {!compact && (
            <p className="kop-serif text-[10px] uppercase tracking-wider text-gov-muted sm:text-[11px]">
              {session.kecamatan ? `${session.kecamatan} · ` : ''}KPPS PEMILIHAN KEPALA DESA
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="kop-serif text-[10px] font-bold uppercase sm:text-xs">
            TPS {session.tps || '1'} / BILIK {session.bilik || '1'}
          </p>
        </div>
      </div>
    </header>
  )
}
