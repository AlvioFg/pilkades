import { useEffect, useRef } from 'react'
import { connectPrinter, isNativePrinterAvailable } from './lib/bluetoothPrinter.js'
import { useStore } from './store'
import Home from './pages/Home'
import ScanTicket from './pages/ScanTicket'
import ChooseCandidate from './pages/ChooseCandidate'
import Result from './pages/Result'
import Recap from './pages/Recap'
import BoxScan from './pages/BoxScan'
import DemoTickets from './pages/DemoTickets'
import About from './pages/About'

/**
 * Routing sederhana berbasis state (bukan react-router).
 *
 * Alur kios harus terkontrol: proteksi tiket ditegakkan lewat state,
 * bukan URL, sehingga tombol Back Android tidak bisa melewati tahap
 * pemindaian atau pemilihan.
 *
 * Hash hanya dipakai supaya halaman Tiket Demo bisa dibuka di tab
 * terpisah (window.open('#/tickets')).
 *
 * Peta rute memakai SATU nama view supaya sinkronisasi hash dan pembacaan
 * hash tidak pernah berbeda.
 */

const VIEWS = ['home', 'scan', 'vote', 'result', 'recap', 'box', 'tickets', 'about']

function hashFor(view) {
  return view === 'home' ? '#/' : `#/${view}`
}

function viewFor(hash) {
  const clean = (hash || '').replace(/^#\/?/, '')
  return VIEWS.includes(clean) ? clean : 'home'
}

export default function App() {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const syncedRef = useRef(false)
  const printer = useStore((s) => s.printer)
  const setPrinterDevice = useStore((s) => s.setPrinterDevice)

  useEffect(() => {
    if (!isNativePrinterAvailable() || !printer.savedAddress) return undefined
    let cancelled = false
    connectPrinter(printer.savedAddress)
      .then((res) => {
        if (cancelled) return
        setPrinterDevice(res.address, res.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [printer.savedAddress, setPrinterDevice])

  // Baca hash saat pertama dimuat (mis. dibuka langsung ke #/tickets)
  useEffect(() => {
    const fromHash = viewFor(window.location.hash)
    if (fromHash !== 'home') setView(fromHash)
  }, [setView])

  // Ikuti perubahan hash dari luar aplikasi (mis. pengguna mengedit
  // address bar, atau shortcut dibuka dari halaman lain).
  useEffect(() => {
    function onHashChange() {
      const fromHash = viewFor(window.location.hash)
      setView(fromHash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [setView])

  // Selaraskan hash saat pindah halaman.
  // Pada render pertama TIDAK ditulis, supaya hash yang dibuka manual
  // tidak ditimpa oleh nilai view bawaan.
  useEffect(() => {
    if (!syncedRef.current) {
      syncedRef.current = true
      return
    }
    const target = hashFor(view)
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target)
    }
  }, [view])

  switch (view) {
    case 'scan':
      return <ScanTicket />
    case 'vote':
      return <ChooseCandidate />
    case 'result':
      return <Result />
    case 'recap':
      return <Recap />
    case 'box':
      return <BoxScan />
    case 'tickets':
      return <DemoTickets />
    case 'about':
      return <About />
    case 'home':
    default:
      return <Home />
  }
}
