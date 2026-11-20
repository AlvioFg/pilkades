# Ringkasan untuk Klien

Aplikasi simulasi pemungutan suara Pilkades untuk tablet TPS.

## Yang Sudah Jadi

**Alur warga (3 langkah + 1 penutup)**

| Langkah | Halaman | Yang Terjadi |
|---|---|---|
| 1 | Pindai QR Code | Warga tunjukkan QR di surat undangan → aplikasi cek tiket, tampilkan nama warga |
| 2 | Pilih Calon | 5 kartu kandidat (nomor urut / foto / nama) → konfirmasi pilihan |
| 3 | Struk Suara | Animasi nyoblos, struk 58 mm siap cetak thermal |
|: | Warga Berikutnya | Kembali ke langkah 1 untuk warga berikutnya |

**Fitur panitia**

- Rekap suara per calon (5 kandidat), dengan bar proporsi
- Dua mode hitung: **Otomatis** (langsung saat warga memilih) dan **Mode Kotak**
  (hitung manual: struk dipindai satu per satu dari kotak suara)
- Pembanding "COCOK / BELUM COCOK" antara hasil kotak suara dan catatan otomatis
- Ganti nomor bilik suara di tengah sesi
- Cetak surat undangan (A4, 2 surat/halaman)
- Ekspor / impor cadangan data (JSON)
- Reset suara dengan konfirmasi ketik "HAPUS"

## Format Dokumen

**Surat Undangan**: QR code (bukan barcode), mengikuti alat peraga: judul, No. Urut
DPT, data pemilih, TPS + bilik, QR code berisi ID tiket.

**Struk Suara**: 3 bagian: judul SURAT SUARA + nama pemilihan + TPS/BILIK → QR
code → footer penanda simulasi. Target printer thermal 58 mm.

**Kartu Calon**: nomor urut di atas, foto di tengah, nama di bawah (mengikuti
contoh alat peraga).

## File APK

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Ukuran 5,5 MB · package `id.dayeuhkolot.pilkades.simulasi` · minSdk 24 (Android 7.0)
· targetSdk 36.

**Cara pasang:** salin APK ke tablet → buka dari File Manager → izinkan "Install
unknown apps" → pasang → buka aplikasi → izinkan akses kamera saat diminta.

> APK debug sudah berfungsi penuh untuk demo. Untuk versi rilis (tanpa peringatan
> "sumber tidak dikenal"), lihat bagian "Build APK rilis" di README: keystore
> signing perlu dibuat sendiri oleh pihak Anda.

## Yang Perlu Diketahui Petugas

- **Kamera** butuh izin. Bila ditolak: ⋮ → Setelan situs → Kamera → Izinkan.
- **Fallback manual** tersedia: bila QR tidak terbaca, petugas mengetik kode
  tiket (TKT-2026-000001) atau kode struk (SPV1|...) secara manual.
- **Data tersimpan lokal** di perangkat, tidak ada internet/server. Ekspor
  cadangan secara berkala bila perlu.
- **Layar tidak tidur** selama sesi berjalan, dan aplikasi masuk layar penuh
  saat sesi dimulai.

## Batasan (yang perlu disampaikan ke klien)

Aplikasi ini **simulasi demonstrasi**. Yang **tidak** ada:

- Backend / server / sinkronisasi antar TPS
- Login & hak akses petugas
- Foto identitas & verifikasi KTP elektronik
- Kepatuhan terhadap format dan prosedur resmi pemungutan suara
- Audit log & rekap yang sah secara hukum
- Integrasi ke sistem informasi DPS

Untuk penggunaan riil, aplikasi ini perlu dikembangkan lebih jauh dan
memperhatikan ketentuan yang berlaku.

## Stack

React 19 + Vite 8 + Tailwind CSS v4 + Zustand 5 · Capacitor 8 (Android) ·
html5-qrcode (kamera) · qrcode.react (QR) · Vitest (24 unit test lulus).
