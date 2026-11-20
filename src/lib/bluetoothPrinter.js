import { Capacitor, registerPlugin } from '@capacitor/core'
import { bytesToBase64 } from './escpos.js'

const BluetoothPrinter = registerPlugin('BluetoothPrinter', {
  web: () => import('./bluetoothPrinter.web.js').then((m) => new m.BluetoothPrinterWeb()),
})

export function isNativePrinterAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export async function ensureBluetoothPermissions() {
  if (!isNativePrinterAvailable()) return { granted: false, reason: 'web' }
  try {
    const current = await BluetoothPrinter.checkPermissions()
    if (current.granted) return { granted: true }
    return await BluetoothPrinter.requestPermissions()
  } catch (err) {
    return { granted: false, reason: err?.message || 'permission' }
  }
}

export async function fetchPrinterStatus() {
  if (!isNativePrinterAvailable()) {
    return { connected: false, platform: 'web', name: null, address: null }
  }
  return BluetoothPrinter.getStatus()
}

export async function listPairedPrinters() {
  if (!isNativePrinterAvailable()) return { devices: [] }
  await ensureBluetoothPermissions()
  return BluetoothPrinter.listPaired()
}

export async function scanForPrinters() {
  if (!isNativePrinterAvailable()) return { devices: [], supported: false }
  await ensureBluetoothPermissions()
  return BluetoothPrinter.scanForPrinters()
}

export async function connectFirstPairedPrinter() {
  if (!isNativePrinterAvailable()) {
    throw new Error('Cari printer otomatis hanya tersedia di APK Android.')
  }
  await ensureBluetoothPermissions()
  return BluetoothPrinter.connectFirstPairedPrinter()
}

export async function connectPrinter(address) {
  if (!isNativePrinterAvailable()) {
    throw new Error('Cetak Bluetooth hanya tersedia di aplikasi Android.')
  }
  await ensureBluetoothPermissions()
  return BluetoothPrinter.connect({ address })
}

export async function disconnectPrinter() {
  if (!isNativePrinterAvailable()) return { connected: false }
  return BluetoothPrinter.disconnect()
}

export async function printRawBytes(bytes) {
  if (!isNativePrinterAvailable()) {
    return { ok: false, message: 'Perangkat ini bukan APK Android.' }
  }

  const data = bytesToBase64(bytes)

  const status = await fetchPrinterStatus()
  if (!status.connected) {
    return { ok: false, message: 'Printer belum terhubung. Hubungkan dari Beranda.' }
  }

  try {
    await BluetoothPrinter.printRaw({ data })
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err?.message || 'Gagal mengirim data ke printer.' }
  }
}

export { BluetoothPrinter }
