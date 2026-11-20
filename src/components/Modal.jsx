import { useEffect } from 'react'

/**
 * Dialog konfirmasi / pesan.
 * Tidak memakai <dialog> supaya tampilan konsisten di Chrome Android versi lama.
 */
export default function Modal({
  open,
  title,
  children,
  actions,
  onClose,
  dismissable = true,
  tone = 'default',
}) {
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape' && dismissable) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, dismissable, onClose])

  if (!open) return null

  const toneRing =
    tone === 'danger'
      ? 'border-red-300'
      : tone === 'success'
        ? 'border-gov-green'
        : 'border-gov-muted/30'

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card w-full max-w-lg border-2 ${toneRing} p-6`}
      >
        {title ? (
          <h2
            className={`kop-serif mb-3 text-xl font-bold ${
              tone === 'danger' ? 'text-red-700' : 'text-gov-dark'
            }`}
          >
            {title}
          </h2>
        ) : null}

        <div className="text-sm leading-relaxed text-gov-ink">{children}</div>

        {actions ? <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div> : null}
      </div>
    </div>
  )
}
