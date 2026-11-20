export class BluetoothPrinterWeb {
  async checkPermissions() {
    return { granted: false }
  }

  async requestPermissions() {
    return { granted: false }
  }

  async getStatus() {
    return { connected: false, platform: 'web', name: null, address: null }
  }

  async listPaired() {
    return { devices: [] }
  }

  async scanForPrinters() {
    return { devices: [], supported: false }
  }

  async connectFirstPairedPrinter() {
    throw new Error('Cari printer otomatis hanya tersedia di APK Android.')
  }

  async connect() {
    throw new Error('Bluetooth tidak tersedia di browser. Pasang APK di tablet.')
  }

  async disconnect() {
    return { connected: false }
  }

  async printRaw() {
    throw new Error('Cetak Bluetooth hanya tersedia di APK Android.')
  }
}
