import { useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Layout from '../components/Layout'
import { bilikLabel, desaLabel } from '../lib/format'
import { useStore } from '../store'

/**
 * Lembar SURAT UNDANGAN demo yang bisa dicetak.
 *
 * Mengikuti alat peraga pemilihan (contoh Pilkades Dayeuhkolot):
 *   judul SURAT UNDANGAN PEMUNGUTAN SUARA KEPADA PEMILIH,
 *   No. Urut DPT, data Pemilih, data pemilihan, TPS/bilik, dan QR code.
 *
 * QR code berisi ID tiket (mis. TKT-2026-000142). Nama & NIK dicetak di
 * atasnya dan aplikasi mencari balik ke daftar tiket saat QR discan: * QR tetap pendek dan andal discan dari kertas A5.
 */
export default function DemoTickets() {
  const tickets = useStore((s) => s.tickets)
  const session = useStore((s) => s.session)
  const setView = useStore((s) => s.setView)

  const unused = tickets.filter((t) => t.status === 'unused')
  const used = tickets.filter((t) => t.status !== 'unused')

  // Lembar undangan dicetak di kertas A4, sementara struk suara memakai
  // roll 58 mm. Kelas pada body memberitahu aturan cetak mana yang dipakai.
  useEffect(() => {
    document.body.classList.add('print-invitations')
    return () => document.body.classList.remove('print-invitations')
  }, [])

  function handlePrint() {
    document.body.classList.add('print-invitations')
    window.setTimeout(() => window.print(), 60)
  }

  return (
    <Layout>
      <div className="no-print mx-auto max-w-4xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="kop-serif text-2xl font-bold text-gov-dark">Surat Undangan (Tiket Warga)</h1>
            <p className="text-sm text-gov-muted">
              Cetak lembar ini, gunting per surat, lalu bagikan ke warga untuk simulasi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setView('home')}>
              Kembali ke Beranda
            </button>
            <button type="button" className="btn-ghost" onClick={handlePrint}>
              🖨 Cetak Lembar
            </button>
          </div>
        </div>

        {!tickets.length && (
          <div className="card p-8 text-center">
            <p className="font-semibold text-gov-dark">Belum ada tiket demo</p>
            <p className="mt-1 text-sm text-gov-muted">
              Kembali ke Beranda lalu klik “Buat 40 Tiket Demo”.
            </p>
          </div>
        )}

        {unused.length > 0 && (
          <>
            <p className="mb-3 text-sm font-semibold text-gov-dark">
              Surat belum dipakai ({unused.length})
            </p>
            <TicketSheet id="demo-tickets-unused" tickets={unused} session={session} />
          </>
        )}

        {used.length > 0 && (
          <>
            <p className="mb-3 mt-8 text-sm font-semibold text-gov-muted">
              Surat sudah dipakai ({used.length}): tidak dicetak ulang
            </p>
            <TicketSheet id="demo-tickets-used" tickets={used} session={session} muted />
          </>
        )}
      </div>
    </Layout>
  )
}

function TicketSheet({ id, tickets, session, muted = false }) {
  return (
    <div id={id} className="demo-ticket-sheet grid grid-cols-1 gap-4 sm:grid-cols-2">
      {tickets.map((ticket, i) => (
        <InvitationCard
          key={ticket.id}
          ticket={ticket}
          session={session}
          muted={muted}
          seq={i + 1}
        />
      ))}
    </div>
  )
}

function InvitationCard({ ticket, session, muted, seq }) {
  return (
    <div
      className={`rounded-lg border-2 p-4 ${
        muted ? 'border-gov-muted/30 bg-gov-cream opacity-60' : 'border-gov-ink/70 bg-white'
      }`}
    >
      <div className="r-center">
        <div className="kop-serif text-sm font-bold uppercase tracking-wide">Surat Undangan</div>
        <div className="kop-serif text-[11px] font-bold uppercase tracking-wide">
          Pemungutan Suara kepada Pemilih
        </div>
        <div className="kop-serif text-[9px] italic uppercase text-gov-muted">
          (Alat Peraga: Simulasi Pemilihan)
        </div>
      </div>

      <div className="my-2 border-t border-gov-ink/40" />

      <div className="flex items-baseline justify-between gap-2">
        <span className="kop-serif text-[10px] uppercase">No Urut DPT</span>
        <span className="kop-serif text-base font-bold">{seq}</span>
      </div>

      <div className="my-2 space-y-1 text-[10px] leading-snug">
        <p>
          Bersama ini Panitia Pemilihan mengundang Saudara/i{' '}
          <strong className="uppercase">{ticket.name}</strong> untuk memberikan suara pada
          pemilihan <strong>PEMILIHAN KEPALA DESA {desaLabel(session.village)}</strong>.
        </p>
      </div>

      <div className="my-2 space-y-0.5 border-y border-gov-ink/30 py-2 text-[10px] leading-snug">
        <p>
          <span className="kop-serif uppercase">Nomor TPS</span>: TPS {session.tps || '1'}
        </p>
        <p>
          <span className="kop-serif uppercase">Nomor Bilik Suara</span>:{' '}
          {bilikLabel(session.bilik)}
        </p>
      </div>

      <div className="r-center my-2">
        <div className="mx-auto inline-block rounded bg-white p-1">
          <QRCodeSVG
            value={ticket.id}
            size={104}
            level="M"
            marginSize={1}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
        <div className="kop-serif mt-1 text-[9px] font-bold">{ticket.id}</div>
      </div>

      <p className="text-[8px] leading-tight text-gov-muted">
        Tunjukkan QR code di atas saat akan memilih. Surat undangan ini bersifat rahasia dan
        tidak boleh disebarluaskan.
      </p>
    </div>
  )
}
