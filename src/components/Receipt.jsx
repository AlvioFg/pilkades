import { QRCodeSVG } from 'qrcode.react'
import { desaLabel } from '../lib/format'
import { formatJam, formatTanggal } from '../store'

export default function Receipt({ ballot, payload, session, screen = false }) {
  const issuedAt = new Date(ballot.issuedAt)
  const qrSize = screen ? 112 : 150

  return (
    <div
      id="receipt"
      className={`receipt-preview${screen ? ' receipt-preview-screen' : ''}`}
    >
      <div className="r-center">
        <div style={{ fontSize: '12pt', fontWeight: 800, letterSpacing: '0.5pt' }}>
          SURAT SUARA
        </div>
        <div style={{ fontSize: '8.5pt', fontWeight: 700, lineHeight: 1.25 }}>
          PEMILIHAN KEPALA DESA {desaLabel(session.village)}
        </div>
        <div style={{ fontSize: '8pt', marginTop: '0.5mm' }}>
          TPS {session.tps || '1'} / BILIK {session.bilik || '1'}
        </div>
      </div>

      <div className="r-rule-double" />

      <div className="r-qr">
        <div className="r-qr-box">
          <QRCodeSVG
            value={payload}
            size={qrSize}
            level="H"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      </div>

      <div className="r-center r-mono" style={{ fontSize: '7pt' }}>
        {ballot.id}
      </div>

      <div className="r-rule" />
      <div className="r-foot">
        Simulasi: bukan surat suara sah.
        <br />
        {formatTanggal(issuedAt)} · {formatJam(issuedAt)}
      </div>
    </div>
  )
}
