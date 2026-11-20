/**
 * 5 calon kepala desa: data taken dari contoh kartu choice Pilkades
 * Desa Dayeuhkolot (alat peraga pemilihan).
 *
 * `photo` menunjuk file di public/kandidat/. Format foto: potret 1:1.
 * `color` dipakai sebagai warna cadangan kalau foto gagal dimuat, dan
 * sebagai warna aksen di kartu.
 */
export const CANDIDATES = [
  {
    no: 1,
    name: 'Ghifar Permana Sakti',
    slogan: 'Calon Kepala Desa Dayeuhkolot',
    photo: './kandidat/1.jpeg',
    color: '#15803D',
  },
  {
    no: 2,
    name: 'Zidane Agus',
    slogan: 'Calon Kepala Desa Dayeuhkolot',
    photo: './kandidat/2.jpeg',
    color: '#B91C1C',
  },
  {
    no: 3,
    name: 'Fauzan Poh',
    slogan: 'Calon Kepala Desa Dayeuhkolot',
    photo: './kandidat/3.jpeg',
    color: '#B91C1C',
  },
  {
    no: 4,
    name: 'DD Afzil',
    slogan: 'Calon Kepala Desa Dayeuhkolot',
    photo: './kandidat/4.jpeg',
    color: '#1D4ED8',
  },
  {
    no: 5,
    name: 'Hanya Dava Saja',
    slogan: 'Calon Kepala Desa Dayeuhkolot',
    photo: './kandidat/5.jpeg',
    color: '#1D4ED8',
  },
]

export const CANDIDATE_NOS = CANDIDATES.map((c) => c.no)

export function getCandidate(no) {
  return CANDIDATES.find((c) => c.no === Number(no)) ?? null
}
