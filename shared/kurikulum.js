// Data kurikulum: jenjang, kelas, fase, mata pelajaran, dimensi profil, Panca Cinta.
export const JENJANG = {
  SD: { nama: 'SD', kelas: [1, 2, 3, 4, 5, 6], naungan: 'kemendikdasmen', menit: 35, jpMinggu: 28 },
  MI: { nama: 'MI', kelas: [1, 2, 3, 4, 5, 6], naungan: 'kemenag', menit: 35, jpMinggu: 28 },
  SMP: { nama: 'SMP', kelas: [7, 8, 9], naungan: 'kemendikdasmen', menit: 40, jpMinggu: 32 },
  MTs: { nama: 'MTs', kelas: [7, 8, 9], naungan: 'kemenag', menit: 40, jpMinggu: 32 },
  SMA: { nama: 'SMA', kelas: [10, 11, 12], naungan: 'kemendikdasmen', menit: 45, jpMinggu: 36 },
  MA: { nama: 'MA', kelas: [10, 11, 12], naungan: 'kemenag', menit: 45, jpMinggu: 36 }
};
export const isMadrasah = (j) => ['MI', 'MTs', 'MA'].includes(j);
export const faseOf = (kelas) => { const k = +kelas; return k <= 2 ? 'A' : k <= 4 ? 'B' : k <= 6 ? 'C' : k <= 9 ? 'D' : k === 10 ? 'E' : 'F'; };
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const KURIKULUM = {
  merdeka: { nama: 'Kurikulum Merdeka dan Pembelajaran Mendalam', singkat: 'Merdeka + Pembelajaran Mendalam', info: 'Capaian Pembelajaran (CP) 2025, Tujuan Pembelajaran, Alur Tujuan Pembelajaran (ATP), modul ajar Pembelajaran Mendalam dan Profil Lulusan.' },
  k13: { nama: 'Kurikulum 2013 (K13)', singkat: 'K13', info: 'KI dan KD, silabus, RPP, penilaian sikap, pengetahuan, keterampilan, dan KKM.' },
  kbc: { nama: 'Kurikulum Berbasis Cinta (KBC) untuk madrasah', singkat: 'KBC (Kemenag)', info: 'Pembelajaran Mendalam dengan Panca Cinta dan kokurikuler madrasah. Cocok untuk MI, MTs, dan MA.' }
};

const AGAMA = ['Pendidikan Agama Islam dan Budi Pekerti', 'Pendidikan Agama Kristen dan Budi Pekerti', 'Pendidikan Agama Katolik dan Budi Pekerti', 'Pendidikan Agama Hindu dan Budi Pekerti', 'Pendidikan Agama Buddha dan Budi Pekerti', 'Pendidikan Agama Khonghucu dan Budi Pekerti'];
const MADRASAH = ["Al-Qur'an Hadis", 'Akidah Akhlak', 'Fikih', 'Sejarah Kebudayaan Islam (SKI)', 'Bahasa Arab'];
const SENI = ['Seni Musik', 'Seni Rupa', 'Seni Teater', 'Seni Tari'];
const BAHASA_ASING = ['Bahasa Arab', 'Bahasa Jepang', 'Bahasa Mandarin', 'Bahasa Jerman', 'Bahasa Prancis', 'Bahasa Korea'];

/** Daftar mata pelajaran per jenjang, kelas, dan kurikulum. Hasil: [{grup, items:[]}] */
export function mapelList(jenjang, kelas, kur) {
  const k = +kelas; const mad = isMadrasah(jenjang); const out = [];
  const add = (grup, items) => out.push({ grup, items });
  if (jenjang === 'SD' || jenjang === 'MI') {
    if (kur === 'k13') {
      add('Tematik', ['Tematik Terpadu (Tema dan Subtema)']);
      add('Mata pelajaran', [...(mad ? [] : AGAMA), 'PPKn', 'Bahasa Indonesia', 'Matematika', 'Ilmu Pengetahuan Alam (IPA)', 'Ilmu Pengetahuan Sosial (IPS)', 'Seni Budaya dan Prakarya (SBdP)', 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', 'Bahasa Daerah / Muatan Lokal', 'Bahasa Inggris']);
    } else {
      add('Wajib', [...(mad ? [] : AGAMA), 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', ...(k >= 3 ? ['Ilmu Pengetahuan Alam dan Sosial (IPAS)'] : []), 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', ...SENI]);
      add('Tambahan / pilihan', ['Bahasa Inggris', 'Muatan Lokal (Bahasa Jawa)', 'Muatan Lokal (Bahasa Daerah lain)', ...(k >= 3 ? ['Koding dan Kecerdasan Artifisial'] : []), 'Pendidikan Lingkungan Hidup']);
    }
    if (mad) add('Madrasah', MADRASAH);
  } else if (jenjang === 'SMP' || jenjang === 'MTs') {
    if (kur === 'k13') add('Mata pelajaran', [...(mad ? [] : AGAMA), 'PPKn', 'Bahasa Indonesia', 'Matematika', 'Ilmu Pengetahuan Alam (IPA)', 'Ilmu Pengetahuan Sosial (IPS)', 'Bahasa Inggris', 'Seni Budaya', 'PJOK', 'Prakarya', 'Informatika', 'Bahasa Daerah / Muatan Lokal']);
    else add('Wajib', [...(mad ? [] : AGAMA), 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 'Ilmu Pengetahuan Alam (IPA)', 'Ilmu Pengetahuan Sosial (IPS)', 'Bahasa Inggris', 'PJOK', 'Informatika', ...SENI, 'Prakarya']);
    if (kur !== 'k13') add('Pilihan / tambahan', ['Koding dan Kecerdasan Artifisial', 'Muatan Lokal (Bahasa Jawa)', 'Muatan Lokal (Bahasa Daerah lain)', 'Pendidikan Lingkungan Hidup']);
    if (mad) add('Madrasah', MADRASAH);
  } else {
    if (kur === 'k13') {
      add('Kelompok A dan B (wajib)', [...(mad ? [] : AGAMA), 'PPKn', 'Bahasa Indonesia', 'Matematika (Wajib)', 'Sejarah Indonesia', 'Bahasa Inggris (Wajib)', 'Seni Budaya', 'PJOK', 'Prakarya dan Kewirausahaan']);
      add('Peminatan MIPA', ['Matematika (Peminatan)', 'Biologi', 'Fisika', 'Kimia']);
      add('Peminatan IPS', ['Geografi', 'Sejarah (Peminatan)', 'Sosiologi', 'Ekonomi']);
      add('Peminatan Bahasa dan Budaya', ['Bahasa dan Sastra Indonesia', 'Bahasa dan Sastra Inggris', 'Antropologi', 'Bahasa Asing Lain']);
      add('Lintas minat', ['Informatika', 'Bahasa Daerah / Muatan Lokal']);
    } else {
      add('Wajib', [...(mad ? [] : AGAMA), 'Pendidikan Pancasila', 'Bahasa Indonesia', 'Matematika', 'Bahasa Inggris', 'PJOK', 'Sejarah', ...SENI, 'Informatika']);
      if (k === 10) add('Fase E (kelas X)', ['Ilmu Pengetahuan Alam (IPA) / Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Sosiologi', 'Geografi', 'Koding dan Kecerdasan Artifisial', 'Prakarya dan Kewirausahaan']);
      else add('Pilihan (kelas XI-XII)', ['Matematika Tingkat Lanjut', 'Bahasa Indonesia Tingkat Lanjut', 'Bahasa Inggris Tingkat Lanjut', 'Fisika', 'Kimia', 'Biologi', 'Ekonomi', 'Sosiologi', 'Geografi', 'Antropologi', 'Sejarah Tingkat Lanjut', 'Informatika (Pilihan)', 'Pendidikan Pancasila Tingkat Lanjut', 'Prakarya dan Kewirausahaan', 'Koding dan Kecerdasan Artifisial']);
      add('Bahasa asing', BAHASA_ASING);
    }
    if (mad) add('Madrasah', [...MADRASAH, ...(k >= 11 ? ['Ilmu Tafsir', 'Ilmu Hadis', 'Ushul Fikih', 'Ilmu Kalam', 'Akhlak Tasawuf'] : [])]);
  }
  // hapus ganda antar kelompok
  const seen = new Set(); return out.map((g) => ({ grup: g.grup, items: g.items.filter((i) => !seen.has(i) && seen.add(i)) })).filter((g) => g.items.length);
}
export const isAgama = (m) => /^Pendidikan Agama|Al-Qur|Akidah|Fikih|SKI|Sejarah Kebudayaan Islam|Ilmu Tafsir|Ilmu Hadis|Ushul|Ilmu Kalam|Akhlak Tasawuf/i.test(m || '');

export const DIMENSI_LULUSAN = [
  { k: 'Keimanan dan Ketakwaan terhadap Tuhan YME', s: 'Keimanan' },
  { k: 'Kewargaan', s: 'Kewargaan' },
  { k: 'Penalaran Kritis', s: 'Penalaran Kritis' },
  { k: 'Kreativitas', s: 'Kreativitas' },
  { k: 'Kolaborasi', s: 'Kolaborasi' },
  { k: 'Kemandirian', s: 'Kemandirian' },
  { k: 'Kesehatan', s: 'Kesehatan' },
  { k: 'Komunikasi', s: 'Komunikasi' }
];
export const DIMENSI_P5 = [
  { k: 'Beriman, bertakwa kepada Tuhan YME, dan berakhlak mulia', s: 'Beriman dan berakhlak mulia' },
  { k: 'Berkebinekaan global', s: 'Berkebinekaan global' },
  { k: 'Bergotong royong', s: 'Gotong royong' },
  { k: 'Mandiri', s: 'Mandiri' },
  { k: 'Bernalar kritis', s: 'Bernalar kritis' },
  { k: 'Kreatif', s: 'Kreatif' }
];
export const PANCA_CINTA = [
  { k: 'Cinta kepada Allah dan Rasul-Nya', s: 'Cinta Allah dan Rasul' },
  { k: 'Cinta ilmu', s: 'Cinta ilmu' },
  { k: 'Cinta lingkungan', s: 'Cinta lingkungan' },
  { k: 'Cinta diri dan sesama manusia', s: 'Cinta diri dan sesama' },
  { k: 'Cinta tanah air', s: 'Cinta tanah air' }
];
export const MODEL_BELAJAR = [
  ['auto', 'Pilihkan yang paling sesuai (otomatis)'],
  ['Problem Based Learning (PBL)', 'Problem Based Learning (PBL)'],
  ['Project Based Learning (PjBL)', 'Project Based Learning (PjBL)'],
  ['Discovery Learning', 'Discovery Learning'],
  ['Inquiry Learning', 'Inquiry Learning'],
  ['Cooperative Learning (Jigsaw, STAD, TGT)', 'Cooperative Learning'],
  ['Game Based Learning', 'Game Based Learning'],
  ['Station Learning', 'Station Learning'],
  ['Direct Instruction (pembelajaran langsung)', 'Pembelajaran langsung']
];

// Bulan efektif default (jumlah pekan efektif per bulan), dapat diubah guru.
export const BULAN_GANJIL = [['Juli', 2], ['Agustus', 4], ['September', 4], ['Oktober', 4], ['November', 4], ['Desember', 3]];
export const BULAN_GENAP = [['Januari', 3], ['Februari', 4], ['Maret', 3], ['April', 4], ['Mei', 4], ['Juni', 3]];

// Jenis dokumen per kurikulum
export const DOKUMEN = {
  merdeka: [
    { id: 'cptp', nama: 'Analisis CP, TP, dan ATP', ket: 'Capaian, tujuan, dan alur tujuan pembelajaran', on: true },
    { id: 'kktp', nama: 'KKTP', ket: 'Kriteria ketercapaian tujuan pembelajaran', on: true },
    { id: 'prota', nama: 'Program Tahunan (Prota)', ket: 'Alokasi JP per semester', on: true },
    { id: 'promes', nama: 'Program Semester (Promes)', ket: 'Jadwal pekan efektif', on: true },
    { id: 'modul', nama: 'Modul Ajar', ket: 'Pembelajaran Mendalam, siap pakai', on: true },
    { id: 'lkpd', nama: 'LKPD', ket: 'Lembar kerja peserta didik', on: true },
    { id: 'asesmen', nama: 'Asesmen: kisi-kisi, soal, kunci', ket: 'Sumatif, lengkap dengan rubrik', on: true },
    { id: 'remedial', nama: 'Remedial dan Pengayaan', ket: 'Program dan soal tindak lanjut', on: false },
    { id: 'bahan', nama: 'Bahan Ajar / Ringkasan Materi', ket: 'Diambil dari materi yang diunggah', on: false },
    { id: 'kokurikuler', nama: 'Rencana Kokurikuler', ket: 'Kegiatan penguatan Profil Lulusan', on: false }
  ],
  kbc: [
    { id: 'cptp', nama: 'Analisis CP, TP, dan ATP', ket: 'Dengan keterkaitan Panca Cinta', on: true },
    { id: 'kktp', nama: 'KKTP', ket: 'Kriteria ketercapaian tujuan pembelajaran', on: true },
    { id: 'prota', nama: 'Program Tahunan (Prota)', ket: 'Alokasi JP per semester', on: true },
    { id: 'promes', nama: 'Program Semester (Promes)', ket: 'Jadwal pekan efektif', on: true },
    { id: 'modul', nama: 'Modul Ajar KBC', ket: 'Pembelajaran Mendalam dan Panca Cinta', on: true },
    { id: 'lkpd', nama: 'LKPD', ket: 'Lembar kerja peserta didik', on: true },
    { id: 'asesmen', nama: 'Asesmen: kisi-kisi, soal, kunci', ket: 'Sumatif, lengkap dengan rubrik', on: true },
    { id: 'remedial', nama: 'Remedial dan Pengayaan', ket: 'Program dan soal tindak lanjut', on: false },
    { id: 'bahan', nama: 'Bahan Ajar / Ringkasan Materi', ket: 'Diambil dari materi yang diunggah', on: false },
    { id: 'kokurikuler', nama: 'Rencana Kokurikuler Panca Cinta', ket: 'Dimensi Profil Lulusan dan topik Panca Cinta', on: false }
  ],
  k13: [
    { id: 'silabus', nama: 'Silabus', ket: 'Berdasarkan KI dan KD', on: true },
    { id: 'kkm', nama: 'Analisis KKM', ket: 'Kompleksitas, daya dukung, intake', on: true },
    { id: 'prota', nama: 'Program Tahunan (Prota)', ket: 'Alokasi JP per semester', on: true },
    { id: 'promes', nama: 'Program Semester (Promes)', ket: 'Jadwal pekan efektif', on: true },
    { id: 'rpp', nama: 'RPP', ket: 'Tiga komponen inti, dengan langkah rinci', on: true },
    { id: 'lkpd', nama: 'LKPD', ket: 'Lembar kerja peserta didik', on: true },
    { id: 'asesmen', nama: 'Penilaian: kisi-kisi, soal, kunci', ket: 'Pengetahuan dan keterampilan, lengkap dengan rubrik', on: true },
    { id: 'remedial', nama: 'Remedial dan Pengayaan', ket: 'Program dan soal tindak lanjut', on: false },
    { id: 'bahan', nama: 'Bahan Ajar / Ringkasan Materi', ket: 'Diambil dari materi yang diunggah', on: false }
  ]
};
