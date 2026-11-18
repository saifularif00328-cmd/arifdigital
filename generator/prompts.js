// Generator Perangkat Ajar: konteks, prompt AI, dan penyusun dokumen
import { clean, cleanArr, kopBlock } from '../shared/core.js';
import { KURIKULUM, ROMAN, faseOf, isMadrasah, isAgama, DIMENSI_LULUSAN, DIMENSI_P5, PANCA_CINTA } from '../shared/kurikulum.js';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const tanggalID = (d = new Date()) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const arr = cleanArr; const c = clean;
const num = (x, d = 0) => { const n = parseFloat(x); return isFinite(n) ? n : d; };

/* ---------- konteks ---------- */
export const semLabel = (f) => (f.smt === 'tahun' && f.cakupan !== 'topik' ? 'Ganjil dan Genap (satu tahun)' : f.smt === 'ganjil' ? 'Ganjil (1)' : 'Genap (2)');
export function semesters(f) { return f.smt === 'tahun' && f.cakupan !== 'topik' ? [1, 2] : [f.smt === 'ganjil' ? 1 : 2]; }
export function weeksOf(f, smt) { return (smt === 1 ? f.bulanGanjil : f.bulanGenap).reduce((a, b) => a + num(b[1]), 0); }
export function profilList(f) { return f.profil === 'p5' ? DIMENSI_P5 : DIMENSI_LULUSAN; }
export function buildContext(f) {
  const L = []; const k = KURIKULUM[f.kur]; const fase = faseOf(f.kelas);
  L.push(`Kurikulum: ${k.nama}`);
  L.push(`Satuan pendidikan: ${f.jenjang}${isMadrasah(f.jenjang) ? ' (madrasah, di bawah Kementerian Agama)' : ''}`);
  L.push(`Kelas: ${f.kelas} (${ROMAN[+f.kelas]}), Fase ${fase}`);
  L.push(`Mata pelajaran: ${f.mapel}`);
  L.push(`Semester: ${semLabel(f)}`);
  if (f.cakupan === 'topik') L.push(`Cakupan: satu topik/bab saja, yaitu "${f.topik || f.mapel}"`); else L.push(`Cakupan: seluruh materi ${f.smt === 'tahun' ? 'satu tahun ajaran' : 'satu semester'}${f.topik ? `, dengan penekanan pada: ${f.topik}` : ''}`);
  if (f.tpGuru) L.push(`TP / CP / KD yang diminta guru (wajib dipakai sebagai acuan utama):\n${f.tpGuru}`);
  if (f.siswa) L.push(`Karakteristik peserta didik: ${f.siswa}`);
  L.push(`Alokasi waktu: ${f.jpMinggu} JP per pekan, 1 JP = ${f.menit} menit`);
  if (f.kur !== 'k13') L.push(`Profil yang dikuatkan: ${(f.dimensi && f.dimensi.length ? f.dimensi : ['(pilih yang paling relevan dari daftar)']).join('; ')} [${f.profil === 'p5' ? 'Profil Pelajar Pancasila' : 'Dimensi Profil Lulusan'}]`);
  if (f.kur === 'kbc') L.push(`Panca Cinta yang dikuatkan: ${(f.cinta && f.cinta.length ? f.cinta : ['(pilih yang paling relevan)']).join('; ')}`);
  if (f.model && f.model !== 'auto') L.push(`Model pembelajaran yang diminta: ${f.model}`);
  if (f.catatan) L.push(`Catatan tambahan guru: ${f.catatan}`);
  return L.join('\n');
}

export const SYSTEM = `Kamu adalah guru senior sekaligus penyusun perangkat ajar yang berpengalaman 20 tahun di Indonesia. Pembacamu adalah guru bersertifikat pendidik dan guru PNS yang wajib menyerahkan perangkat ajar kepada kepala sekolah dan pengawas, jadi isinya harus siap dipakai tanpa revisi.
Aturan mutlak:
1. Keluarkan HANYA JSON yang valid sesuai skema yang diminta. Tanpa pembuka, tanpa penutup, tanpa pagar kode.
2. Semua teks berupa teks polos. Dilarang memakai markdown: jangan ada tanda bintang, pagar, garis bawah ganda, atau backtick.
3. Bahasa Indonesia baku mengikuti PUEBI, ditulis seperti guru yang menulis dokumennya sendiri. Kalimat konkret: sebut nama kegiatan, contoh nyata, benda, angka, dan soal yang sungguh-sungguh bisa dipakai di kelas. Hindari kalimat klise dan pembuka bombastis (misalnya "di era digital ini", "sangat penting", "tidak hanya ... tetapi juga", "holistik", "komprehensif"), hindari daftar tiga hal yang dipaksakan, dan jangan menutup bagian dengan kalimat penyemangat.
4. Patuhi regulasi pendidikan terbaru yang berlaku (Permendikdasmen No. 13 Tahun 2025, Capaian Pembelajaran Kepka BSKAP No. 046/H/KR/2025, dan panduan pembelajaran serta asesmen). Untuk madrasah ikuti pedoman Kementerian Agama. Jangan mengarang nomor regulasi atau judul buku.
5. Bila ada berkas atau gambar materi dari guru, jadikan itu sumber utama isi materi, soal, dan contoh. Rujuk isinya secara spesifik. Bila tidak ada, pakai pengetahuan kurikulum resmi dan buku teks resmi Kemendikdasmen.
6. Sesuaikan tingkat bahasa, contoh, dan kegiatan dengan kelas dan fase peserta didik. Tujuan pembelajaran memakai kata kerja operasional yang terukur.
7. Jangan membuat isian kosong, tanda "dst.", atau placeholder. Semua bagian harus terisi lengkap.`;

const J = (o) => JSON.stringify(o, null, 1);

/* ---------- pembantu dokumen ---------- */
const kv = (rows) => ({ t: 'kv', rows: rows.filter((r) => r[1] != null && String(r[1]).trim() !== '') });
const ol = (a) => ({ t: 'ol', items: arr(a) });
const ul = (a) => ({ t: 'ul', items: arr(a) });
const p = (x) => ({ t: 'p', text: c(x) });
const H = (x) => ({ t: 'h1', text: x }); const H2 = (x) => ({ t: 'h2', text: x });
export function identitas(f, sch, extra = []) {
  return kv([['Satuan Pendidikan', sch.nama], ['Mata Pelajaran', f.mapel], ['Kelas / Fase', `${ROMAN[+f.kelas]} / ${faseOf(f.kelas)}`], ['Semester', semLabel(f)], ['Tahun Ajaran', sch.tahunAjaran], ['Kurikulum', KURIKULUM[f.kur].singkat], ...extra, ['Penyusun', sch.guru]]);
}
export function signBlock(f, sch) {
  const tgl = `${sch.kota ? sch.kota + ', ' : ''}${f.tanggal || tanggalID()}`;
  return { t: 'sign', cols: [{ top: 'Mengetahui,', role: `Kepala ${isMadrasah(f.jenjang) ? 'Madrasah' : 'Sekolah'}`, nama: sch.kepsek, nip: sch.kepsekNip }, { top: tgl, role: 'Guru Mata Pelajaran', nama: sch.guru, nip: sch.guruNip }] };
}
const head = (f, sch, title, sub) => [kopBlock(sch), { t: 'title', text: title }, ...(sub ? [{ t: 'sub', text: sub }] : []), identitas(f, sch)];
const doc = (id, title, blocks, landscape = false) => ({ id, title, blocks, landscape });

/* ---------- pengatur JP ---------- */
export function fitJP(units, targets) {
  // units: [{jp, smt}] ; targets: {1:n,2:n}
  [1, 2].forEach((s) => {
    const us = units.filter((u) => u.smt === s); const T = targets[s]; if (!us.length || !T) return;
    us.forEach((u) => { u.jp = Math.max(1, Math.round(num(u.jp, 2))); });
    let sum = us.reduce((a, u) => a + u.jp, 0); const raw = us.map((u) => (u.jp * T) / sum); const base = raw.map((x) => Math.max(1, Math.floor(x)));
    let rest = T - base.reduce((a, b) => a + b, 0); const ord = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
    for (let i = 0; rest > 0; i = (i + 1) % ord.length) { base[ord[i][1]]++; rest--; }
    for (let i = 0; rest < 0 && i < 500; i++) { const j = base.indexOf(Math.max(...base)); if (base[j] > 1) { base[j]--; rest++; } else break; }
    us.forEach((u, i) => { u.jp = base[i]; });
  });
  return units;
}

/* ---------- Merdeka / KBC: analisis CP, TP, ATP ---------- */
export function promptATP(f, targets) {
  const kbc = f.kur === 'kbc'; const dims = profilList(f).map((d) => d.s).join(', ');
  const tg = Object.entries(targets).map(([s, n]) => `semester ${s}: ${n} JP`).join('; ');
  return `Susun Analisis Capaian Pembelajaran, Tujuan Pembelajaran, dan Alur Tujuan Pembelajaran (ATP).
Ketentuan:
- Tulis Capaian Pembelajaran (CP) fase ${faseOf(f.kelas)} untuk ${f.mapel} sedekat mungkin dengan CP resmi (Kepka BSKAP 046/H/KR/2025). Bila tidak hafal redaksi aslinya, tulis ringkasan CP per elemen dan isi "catatan_cp" agar guru memverifikasi.
- Pecah CP menjadi lingkup materi, lalu Tujuan Pembelajaran (TP) berurutan dari konsep dasar ke kompleks, tiap TP satu kalimat "Peserta didik dapat ..." dengan kata kerja operasional dan konten jelas.
- ${f.cakupan === 'topik' ? 'Hanya untuk satu topik, buat 3 sampai 6 TP.' : 'Cakup seluruh materi semester/tahun yang diminta, kira-kira 8 sampai 14 TP per semester.'}
- Tiap TP diberi semester (smt: 1 atau 2), lingkup materi, materi pokok, perkiraan JP, dan dimensi profil yang relevan (pilih dari: ${dims}).${kbc ? '\n- Tiap TP juga diberi nilai Panca Cinta yang relevan (pilih dari: ' + PANCA_CINTA.map((x) => x.s).join(', ') + ').' : ''}
- Target total JP: ${tg}. Hitung kasar saja, program akan menyesuaikan.
${f.cakupan === 'topik' ? '' : '- Kelompokkan TP ke dalam lingkup materi (bab) bernama jelas. Beri urutan yang wajar.'}
Skema JSON:
${J({ catatan_cp: 'string, kosong bila CP sudah sesuai redaksi resmi', cp_fase: 'string, CP fase secara umum', elemen: [{ nama: 'nama elemen CP', cp: 'CP elemen ini' }], tp: [{ lingkup: 'nama lingkup materi / bab', tp: 'Peserta didik dapat ...', materi: 'materi pokok', jp: 4, smt: 1, dimensi: ['nama dimensi'], ...(kbc ? { cinta: ['nama cinta'] } : {}), elemen: 'nama elemen CP terkait' }] })}`;
}
export function promptSilabus(f, targets) {
  const tg = Object.entries(targets).map(([s, n]) => `semester ${s}: ${n} JP`).join('; ');
  return `Susun silabus Kurikulum 2013 untuk ${f.mapel} kelas ${f.kelas} berdasarkan Kompetensi Inti dan Kompetensi Dasar resmi (Permendikbud No. 37 Tahun 2018 untuk SMA/SMP/SD, atau KMA 183/2019 untuk mapel agama madrasah). Bila guru memberi KD, pakai itu.
- Tuliskan KI-1 sampai KI-4 sesuai kelas.
- ${f.cakupan === 'topik' ? 'Hanya untuk satu topik, 2 sampai 4 pasang KD.' : 'Cakup KD sepanjang semester/tahun yang diminta, urut dari semester 1 ke 2.'}
- Tiap baris memuat pasangan KD pengetahuan (3.x) dan KD keterampilan (4.x), materi pokok, kegiatan pembelajaran (pendekatan saintifik), indikator pencapaian kompetensi, teknik penilaian, JP, semester, dan sumber belajar.
- Target total JP: ${tg}.
Skema JSON:
${J({ ki: { ki1: 'string', ki2: 'string', ki3: 'string', ki4: 'string' }, kd: [{ lingkup: 'nama tema/bab', kd3: '3.1 ...', kd4: '4.1 ...', materi: 'materi pokok', kegiatan: ['kegiatan'], ipk: ['indikator'], penilaian: 'teknik penilaian', jp: 6, smt: 1, sumber: 'sumber belajar' }] })}`;
}
// Normalisasi menjadi unit baku untuk prota/promes/modul
export function unitsFromATP(j, f, targets) {
  const list = (Array.isArray(j.tp) ? j.tp : []).map((t) => ({ lingkup: c(t.lingkup || t.elemen || f.mapel), tp: c(t.tp), materi: c(t.materi), jp: num(t.jp, 2), smt: semesters(f).includes(+t.smt) ? +t.smt : semesters(f)[0], dimensi: arr(t.dimensi), cinta: arr(t.cinta), elemen: c(t.elemen) })).filter((u) => u.tp);
  if (!list.length) throw new Error('AI tidak menghasilkan tujuan pembelajaran. Coba buat ulang.');
  list.sort((a, b) => a.smt - b.smt); return fitJP(list, targets);
}
export function unitsFromSilabus(j, f, targets) {
  const list = (Array.isArray(j.kd) ? j.kd : []).map((k) => ({ lingkup: c(k.lingkup || f.mapel), tp: [c(k.kd3), c(k.kd4)].filter(Boolean).join('\n'), materi: c(k.materi), jp: num(k.jp, 3), smt: semesters(f).includes(+k.smt) ? +k.smt : semesters(f)[0], kd3: c(k.kd3), kd4: c(k.kd4), kegiatan: arr(k.kegiatan), ipk: arr(k.ipk), penilaian: c(k.penilaian), sumber: c(k.sumber) })).filter((u) => u.tp);
  if (!list.length) throw new Error('AI tidak menghasilkan KD. Coba buat ulang.');
  list.sort((a, b) => a.smt - b.smt); return fitJP(list, targets);
}
const lingkups = (units) => { const m = []; units.forEach((u) => { let g = m.find((x) => x.nama === u.lingkup); if (!g) m.push((g = { nama: u.lingkup, units: [] })); g.units.push(u); }); return m; };
export { lingkups };

export function docATP(f, sch, j, units) {
  const kbc = f.kur === 'kbc'; const bl = head(f, sch, 'ANALISIS CAPAIAN PEMBELAJARAN, TUJUAN PEMBELAJARAN, DAN ALUR TUJUAN PEMBELAJARAN');
  bl.push(H('A. Capaian Pembelajaran'));
  if (j.cp_fase) bl.push(p(j.cp_fase));
  const el = (Array.isArray(j.elemen) ? j.elemen : []).filter((e) => e && (e.nama || e.cp));
  if (el.length) bl.push({ t: 'table', widths: [6, 24, 70], head: ['No', 'Elemen', 'Capaian Pembelajaran'], rows: el.map((e, i) => [{ x: String(i + 1), al: 'center' }, c(e.nama), c(e.cp)]) });
  if (j.catatan_cp) bl.push(p('Catatan: ' + c(j.catatan_cp)));
  bl.push(H('B. Alur Tujuan Pembelajaran'));
  const rows = units.map((u, i) => [{ x: String(i + 1), al: 'center' }, u.lingkup, u.tp, u.materi, [...u.dimensi, ...(kbc ? u.cinta.map((x) => 'Cinta: ' + x) : [])].join('; '), { x: String(u.jp), al: 'center' }, { x: String(u.smt), al: 'center' }]);
  bl.push({ t: 'table', widths: [4, 15, 33, 16, 20, 6, 6], head: ['No', 'Lingkup Materi', 'Tujuan Pembelajaran', 'Materi Pokok', kbc ? 'Dimensi Profil Lulusan dan Panca Cinta' : 'Dimensi Profil Lulusan', 'JP', 'Smt'], rows, small: true });
  bl.push(signBlock(f, sch));
  return doc('cptp', 'Analisis CP, TP, dan ATP', bl, true);
}

/* ---------- KKTP ---------- */
export function promptKKTP(f, units) {
  return `Susun Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) berbentuk rubrik untuk setiap TP berikut. Tiap TP punya empat deskripsi capaian: perlu_bimbingan, cukup, baik, sangat_baik. Deskripsi harus konkret, bisa diamati, dan berbeda tingkat satu sama lain (bukan hanya mengganti kata sifat). Tambahkan juga teknik penilaian yang dipakai.
Daftar TP (nomor mengikuti urutan):
${units.map((u, i) => `${i + 1}. ${u.tp}`).join('\n')}
Skema JSON:
${J({ kktp: [{ no: 1, perlu_bimbingan: 'string', cukup: 'string', baik: 'string', sangat_baik: 'string', teknik: 'tes tertulis / observasi / unjuk kerja ...' }] })}`;
}
export function intervals(k) { const K = Math.round(num(k, 75)); const w = (100 - K) / 3; const a = Math.floor(K + w - 0.01), b = Math.floor(K + 2 * w - 0.01); return [[0, K - 1], [K, a], [a + 1, b], [b + 1, 100]]; }
export function docKKTP(f, sch, j, units) {
  const iv = intervals(f.kktp); const arrK = Array.isArray(j.kktp) ? j.kktp : [];
  const bl = head(f, sch, 'KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)');
  bl.push(p(`Peserta didik dinyatakan mencapai tujuan pembelajaran bila memperoleh nilai paling rendah ${f.kktp}. Peserta didik di bawah batas ini memperoleh bimbingan atau remedial sebelum melanjutkan ke tujuan berikutnya.`));
  const rows = units.map((u, i) => { const k = arrK.find((x) => +x.no === i + 1) || arrK[i] || {}; return [{ x: String(i + 1), al: 'center' }, u.tp, c(k.perlu_bimbingan), c(k.cukup), c(k.baik), c(k.sangat_baik), c(k.teknik)]; });
  bl.push({ t: 'table', widths: [4, 22, 16, 16, 16, 16, 10], head: ['No', 'Tujuan Pembelajaran', `Perlu Bimbingan (${iv[0][0]}-${iv[0][1]})`, `Cukup (${iv[1][0]}-${iv[1][1]})`, `Baik (${iv[2][0]}-${iv[2][1]})`, `Sangat Baik (${iv[3][0]}-${iv[3][1]})`, 'Teknik'], rows, small: true });
  bl.push(signBlock(f, sch));
  return doc('kktp', 'KKTP', bl, true);
}

/* ---------- Prota ---------- */
export function docProta(f, sch, units) {
  const bl = head(f, sch, 'PROGRAM TAHUNAN (PROTA)', `Tahun Ajaran ${sch.tahunAjaran}`);
  semesters(f).forEach((s) => {
    const us = units.filter((u) => u.smt === s); if (!us.length) return;
    bl.push(H(`Semester ${s === 1 ? '1 (Ganjil)' : '2 (Genap)'}`));
    const rows = []; let n = 0, tot = 0;
    lingkups(us).forEach((g) => {
      const jp = g.units.reduce((a, u) => a + u.jp, 0); tot += jp; n++;
      rows.push([{ x: String(n), al: 'center' }, `**${g.nama}**`, '', { x: `**${jp}**`, al: 'center' }]);
      g.units.forEach((u) => rows.push(['', '', f.kur === 'k13' ? u.tp.replace(/\n/g, '\n') : u.tp, { x: String(u.jp), al: 'center' }]));
    });
    rows.push([{ x: '**Jumlah Jam Pelajaran**', cs: 3, al: 'right' }, { x: `**${tot}**`, al: 'center' }]);
    bl.push({ t: 'table', widths: [6, 28, 56, 10], head: ['No', 'Lingkup Materi', f.kur === 'k13' ? 'Kompetensi Dasar' : 'Tujuan Pembelajaran', 'JP'], rows, small: true });
  });
  bl.push(p(`Keterangan: JP dihitung dari ${f.jpMinggu} JP per pekan pada pekan efektif. Pekan untuk asesmen sumatif akhir semester sudah disisihkan dari alokasi di atas.`));
  bl.push(signBlock(f, sch));
  return doc('prota', 'Program Tahunan', bl, false);
}

/* ---------- Promes ---------- */
export function docPromes(f, sch, units) {
  const out = [];
  semesters(f).forEach((s) => {
    const us = units.filter((u) => u.smt === s); if (!us.length) return;
    const bulan = s === 1 ? f.bulanGanjil : f.bulanGenap; const jpw = Math.max(1, num(f.jpMinggu, 2));
    // slot pekan efektif
    const slots = []; bulan.forEach((b, mi) => { for (let w = 0; w < Math.min(5, num(b[1])); w++) slots.push([mi, w]); });
    const sumatif = slots.length > 1 ? slots.pop() : null; // pekan terakhir: sumatif akhir semester
    const need = us.map((u) => Math.max(1, Math.round(u.jp / jpw))); let tot = need.reduce((a, b) => a + b, 0);
    while (tot > slots.length && tot > us.length) { const j = need.indexOf(Math.max(...need)); if (need[j] > 1) { need[j]--; tot--; } else break; }
    const alloc = us.map(() => new Set()); let cur = 0;
    us.forEach((u, i) => { for (let k = 0; k < need[i] && cur < slots.length; k++, cur++) alloc[i].add(slots[cur][0] + '-' + slots[cur][1]); });
    // sisa pekan dibagi ke unit terakhir agar tidak kosong
    for (; cur < slots.length; cur++) alloc[us.length - 1].add(slots[cur][0] + '-' + slots[cur][1]);
    const whead = []; bulan.forEach(() => [1, 2, 3, 4, 5].forEach((w) => whead.push(String(w))));
    const hdr = [[{ x: '' }, { x: '' }, { x: '' }, ...bulan.map((b) => ({ x: b[0], cs: 5 }))], ['No', f.kur === 'k13' ? 'Kompetensi Dasar / Materi' : 'Tujuan Pembelajaran / Materi', 'JP', ...whead]];
    const eff = (mi, w) => w < Math.min(5, num(bulan[mi][1]));
    const mk = (ownSet) => { const row = []; bulan.forEach((b, mi) => { for (let w = 0; w < 5; w++) { const key = mi + '-' + w; const on = eff(mi, w) && ownSet && ownSet.has(key); row.push({ x: !eff(mi, w) ? '/' : '', al: 'center', ...(on ? { fill: '#555555' } : {}) }); } }); return row; };
    const rows = us.map((u, i) => [{ x: String(i + 1), al: 'center' }, `${u.tp.split('\n')[0]}${u.materi ? `\n(${u.materi})` : ''}`, { x: String(u.jp), al: 'center' }, ...mk(alloc[i])]);
    const sset = new Set(sumatif ? [sumatif[0] + '-' + sumatif[1]] : []);
    rows.push(['', '**Asesmen Sumatif Akhir Semester**', '', ...mk(sset)]);
    const bl = head(f, sch, 'PROGRAM SEMESTER (PROMES)', `Semester ${s === 1 ? '1 (Ganjil)' : '2 (Genap)'} Tahun Ajaran ${sch.tahunAjaran}`);
    bl.push({ t: 'table', widths: [3, 27, 4, ...Array(30).fill(66 / 30)], head: hdr, rows, small: true });
    bl.push(p('Keterangan: kotak berwarna = pekan pelaksanaan pembelajaran; / = pekan tidak efektif (libur, kegiatan sekolah, atau hari besar); pekan terakhir dipakai untuk asesmen sumatif akhir semester.'));
    bl.push(signBlock(f, sch));
    out.push(doc('promes' + s, `Promes Semester ${s}`, bl, true));
  });
  return out;
}

/* ---------- Modul Ajar (Merdeka / KBC) ---------- */
export function promptModul(f, grp, nPertemuan) {
  const kbc = f.kur === 'kbc'; const dims = profilList(f).map((d) => d.s).join(', ');
  return `Susun satu Modul Ajar lengkap berstruktur Pembelajaran Mendalam${kbc ? ' dengan penguatan Panca Cinta (Kurikulum Berbasis Cinta)' : ''} untuk lingkup materi "${grp.nama}".
TP yang harus dicapai pada modul ini:
${grp.units.map((u, i) => `${i + 1}. ${u.tp} (materi: ${u.materi})`).join('\n')}
Jumlah pertemuan: ${nPertemuan}. Alokasi tiap pertemuan menyesuaikan jadwal nyata (umumnya 2 sampai 3 JP), 1 JP = ${f.menit} menit (hitung durasi nyata, mis. "2 x ${f.menit} menit").
Ketentuan isi:
- Langkah kegiatan harus operasional, berurutan, dan benar-benar bisa dilakukan guru: apa yang dikatakan atau ditanyakan guru, apa yang dikerjakan peserta didik, media apa yang dipakai, hasil apa yang dikumpulkan. Jangan menulis kalimat umum seperti "guru menjelaskan materi".
- Tiap pertemuan memuat: kegiatan awal, kegiatan inti dengan tiga tahap pengalaman belajar (memahami, mengaplikasi, merefleksi), dan kegiatan penutup. Terapkan prinsip berkesadaran, bermakna, dan menggembirakan.
- Pilih praktik pedagogis ${f.model && f.model !== 'auto' ? `"${f.model}"` : 'yang paling cocok dengan materi'} dan tuliskan sintaksnya pada kegiatan.
- Dimensi profil yang dipilih dari: ${dims}. Berikan indikator perilaku yang diamati, bukan sekadar nama dimensi.${kbc ? '\n- Panca Cinta (pilih yang relevan): ' + PANCA_CINTA.map((x) => x.k).join('; ') + '. Tunjukkan di langkah mana nilai cinta itu dilatihkan.' : ''}
- Asesmen: awal (diagnostik), proses (formatif), akhir (sumatif), dan rubrik penilaian dengan empat level.
- Bahan bacaan ringkas peserta didik 3 sampai 5 paragraf yang sungguh-sungguh menerangkan materi (rujuk materi unggahan guru bila ada). Glosarium 5 sampai 8 istilah. Pustaka cukup yang pasti ada (buku teks resmi Kemendikdasmen untuk mapel ini, dan materi guru).
Skema JSON:
${J({ judul: 'judul modul', topik: 'topik', cp: 'CP terkait', kompetensi_awal: ['string'], karakteristik_materi: 'string', dimensi: [{ nama: 'dimensi', indikator: 'perilaku yang diamati' }], ...(kbc ? { cinta: [{ nama: 'nama cinta', wujud: 'wujud pelatihan nilai' }] } : {}), tujuan: ['Peserta didik dapat ...'], lintas_disiplin: 'string', praktik_pedagogis: 'nama model dan alasan singkat', kemitraan: 'string', lingkungan: 'string', digital: 'string', sarpras: ['string'], target_peserta: 'string', pemahaman_bermakna: ['string'], pertanyaan_pemantik: ['string'], pertemuan: [{ fokus: 'string', durasi: '2 x 40 menit', awal: ['langkah'], memahami: ['langkah'], mengaplikasi: ['langkah'], merefleksi: ['langkah'], penutup: ['langkah'], waktu: { awal: '10 menit', inti: '60 menit', penutup: '10 menit' } }], asesmen: { diagnostik: 'string', formatif: 'string', sumatif: 'string' }, rubrik: [{ aspek: 'string', k4: 'sangat baik', k3: 'baik', k2: 'cukup', k1: 'perlu bimbingan' }], pengayaan: 'string', remedial: 'string', refleksi_guru: ['string'], refleksi_siswa: ['string'], bahan_bacaan: ['paragraf'], glosarium: [{ istilah: 'string', arti: 'string' }], pustaka: ['string'] })}`;
}
export function docModul(f, sch, j, grp, no) {
  const kbc = f.kur === 'kbc'; const pert = Array.isArray(j.pertemuan) ? j.pertemuan : [];
  const bl = head(f, sch, `MODUL AJAR ${c(j.judul || grp.nama).toUpperCase()}`, kbc ? 'Pembelajaran Mendalam dan Panca Cinta' : 'Pembelajaran Mendalam');
  bl.push(H('A. Identitas Modul'));
  bl.push(kv([['Topik / Lingkup Materi', c(j.topik || grp.nama)], ['Jumlah Pertemuan', String(pert.length)], ['Alokasi Waktu', pert.map((x, i) => `Pertemuan ${i + 1}: ${c(x.durasi)}`).join('; ')], ['Model / Praktik Pedagogis', c(j.praktik_pedagogis)], ['Sasaran Peserta Didik', c(j.target_peserta)]]));
  bl.push(H('B. Identifikasi'));
  bl.push(H2('1. Kesiapan peserta didik (kompetensi awal)')); bl.push(ul(j.kompetensi_awal));
  if (j.karakteristik_materi) { bl.push(H2('2. Karakteristik materi')); bl.push(p(j.karakteristik_materi)); }
  bl.push(H2(`3. Dimensi ${f.profil === 'p5' ? 'Profil Pelajar Pancasila' : 'Profil Lulusan'} yang dikuatkan`));
  const dm = (Array.isArray(j.dimensi) ? j.dimensi : []).map((d) => [c(d.nama), c(d.indikator)]);
  if (dm.length) bl.push({ t: 'table', widths: [30, 70], head: ['Dimensi', 'Indikator perilaku yang diamati'], rows: dm });
  if (kbc) { const cn = (Array.isArray(j.cinta) ? j.cinta : []).map((d) => [c(d.nama), c(d.wujud)]); if (cn.length) { bl.push(H2('4. Panca Cinta yang dikuatkan')); bl.push({ t: 'table', widths: [30, 70], head: ['Nilai Cinta', 'Wujud pelatihan dalam pembelajaran'], rows: cn }); } }
  bl.push(H('C. Desain Pembelajaran'));
  bl.push(kv([['Capaian Pembelajaran', c(j.cp)], ['Lintas Disiplin Ilmu', c(j.lintas_disiplin)], ['Kemitraan Pembelajaran', c(j.kemitraan)], ['Lingkungan Belajar', c(j.lingkungan)], ['Pemanfaatan Digital', c(j.digital)]]));
  bl.push(H2('Tujuan Pembelajaran')); bl.push(ol(j.tujuan));
  if (arr(j.sarpras).length) { bl.push(H2('Sarana dan Prasarana')); bl.push(ul(j.sarpras)); }
  if (arr(j.pemahaman_bermakna).length) { bl.push(H2('Pemahaman Bermakna')); bl.push(ul(j.pemahaman_bermakna)); }
  if (arr(j.pertanyaan_pemantik).length) { bl.push(H2('Pertanyaan Pemantik')); bl.push(ul(j.pertanyaan_pemantik)); }
  bl.push(H('D. Pengalaman Belajar'));
  pert.forEach((x, i) => {
    bl.push(H2(`Pertemuan ${i + 1}: ${c(x.fokus)} (${c(x.durasi)})`));
    const w = x.waktu || {};
    bl.push({ t: 'h3', text: `Kegiatan Awal${w.awal ? ` (${c(w.awal)})` : ''}` }); bl.push(ol(x.awal));
    bl.push({ t: 'h3', text: `Kegiatan Inti${w.inti ? ` (${c(w.inti)})` : ''}` });
    [['Memahami', x.memahami], ['Mengaplikasi', x.mengaplikasi], ['Merefleksi', x.merefleksi]].forEach(([n, a]) => { if (arr(a).length) { bl.push(p(`**${n}**`)); bl.push(ol(a)); } });
    bl.push({ t: 'h3', text: `Kegiatan Penutup${w.penutup ? ` (${c(w.penutup)})` : ''}` }); bl.push(ol(x.penutup));
  });
  bl.push(H('E. Asesmen'));
  const as = j.asesmen || {};
  bl.push(kv([['Asesmen Awal (diagnostik)', c(as.diagnostik)], ['Asesmen Proses (formatif)', c(as.formatif)], ['Asesmen Akhir (sumatif)', c(as.sumatif)]]));
  const rb = (Array.isArray(j.rubrik) ? j.rubrik : []).map((r) => [c(r.aspek), c(r.k4), c(r.k3), c(r.k2), c(r.k1)]);
  if (rb.length) { bl.push(H2('Rubrik Penilaian')); bl.push({ t: 'table', widths: [20, 20, 20, 20, 20], head: ['Aspek', 'Sangat Baik (4)', 'Baik (3)', 'Cukup (2)', 'Perlu Bimbingan (1)'], rows: rb, small: true }); }
  bl.push(H('F. Pengayaan dan Remedial')); bl.push(kv([['Pengayaan', c(j.pengayaan)], ['Remedial', c(j.remedial)]]));
  bl.push(H('G. Refleksi'));
  bl.push(H2('Refleksi guru')); bl.push(ul(j.refleksi_guru)); bl.push(H2('Refleksi peserta didik')); bl.push(ul(j.refleksi_siswa));
  bl.push({ t: 'pagebreak' });
  bl.push(H('Lampiran 1. Bahan Bacaan Peserta Didik')); arr(j.bahan_bacaan).forEach((x) => bl.push(p(x)));
  const gl = (Array.isArray(j.glosarium) ? j.glosarium : []).map((g) => [c(g.istilah), c(g.arti)]);
  if (gl.length) { bl.push(H('Lampiran 2. Glosarium')); bl.push({ t: 'table', widths: [28, 72], head: ['Istilah', 'Arti'], rows: gl }); }
  if (arr(j.pustaka).length) { bl.push(H('Daftar Pustaka')); bl.push(ul(j.pustaka)); }
  bl.push(signBlock(f, sch));
  return doc('modul' + no, `Modul Ajar ${no}: ${grp.nama}`, bl);
}

/* ---------- RPP K13 ---------- */
export function promptRPP(f, grp, n) {
  return `Susun RPP Kurikulum 2013 (format tiga komponen inti sesuai SE Mendikbud No. 14 Tahun 2019, dilengkapi langkah rinci) untuk "${grp.nama}", ${f.mapel} kelas ${f.kelas}.
KD yang dipakai:
${grp.units.map((u) => `- ${u.tp.replace(/\n/g, ' | ')} (materi: ${u.materi})`).join('\n')}
Jumlah pertemuan: ${n}. 1 JP = ${f.menit} menit. Langkah memakai pendekatan saintifik (mengamati, menanya, mengumpulkan informasi, menalar, mengomunikasikan)${f.model && f.model !== 'auto' ? ` dengan model ${f.model}` : ''}. Tulis langkah yang konkret dan bisa dijalankan, dengan alokasi menit. Penilaian sikap (KI-1 dan KI-2), pengetahuan (KI-3), dan keterampilan (KI-4) disertai instrumen ringkas dan rubrik.
Skema JSON:
${J({ judul: 'string', ki: { ki1: '', ki2: '', ki3: '', ki4: '' }, kd: [{ kd: '3.1 ...', ipk: ['indikator'] }], tujuan: ['Melalui ..., peserta didik dapat ...'], materi: ['string'], pendekatan_metode: 'string', media: ['string'], sumber: ['string'], pertemuan: [{ fokus: 'string', durasi: '2 x 35 menit', pendahuluan: ['langkah (10 menit)'], inti: ['langkah'], penutup: ['langkah'] }], penilaian: { sikap: 'string', pengetahuan: 'string', keterampilan: 'string' }, rubrik: [{ aspek: 'string', k4: '', k3: '', k2: '', k1: '' }], remedial: 'string', pengayaan: 'string', pustaka: ['string'] })}`;
}
export function docRPP(f, sch, j, grp, no) {
  const pert = Array.isArray(j.pertemuan) ? j.pertemuan : []; const ki = j.ki || {};
  const bl = head(f, sch, 'RENCANA PELAKSANAAN PEMBELAJARAN (RPP)', c(j.judul || grp.nama));
  bl.push(H('A. Kompetensi Inti'));
  bl.push(kv([['KI-1', c(ki.ki1)], ['KI-2', c(ki.ki2)], ['KI-3', c(ki.ki3)], ['KI-4', c(ki.ki4)]]));
  bl.push(H('B. Kompetensi Dasar dan Indikator Pencapaian Kompetensi'));
  const kd = (Array.isArray(j.kd) ? j.kd : []).map((k) => [c(k.kd), arr(k.ipk).map((x, i) => `${i + 1}. ${x}`).join('\n')]);
  bl.push({ t: 'table', widths: [45, 55], head: ['Kompetensi Dasar', 'Indikator Pencapaian Kompetensi'], rows: kd });
  bl.push(H('C. Tujuan Pembelajaran')); bl.push(ol(j.tujuan));
  bl.push(H('D. Materi Pembelajaran')); bl.push(ul(j.materi));
  bl.push(H('E. Pendekatan, Metode, Media, dan Sumber Belajar'));
  bl.push(kv([['Pendekatan dan Metode', c(j.pendekatan_metode)], ['Media dan Alat', arr(j.media).join('; ')], ['Sumber Belajar', arr(j.sumber).join('; ')]]));
  bl.push(H('F. Langkah-langkah Pembelajaran'));
  pert.forEach((x, i) => { bl.push(H2(`Pertemuan ${i + 1}: ${c(x.fokus)} (${c(x.durasi)})`)); bl.push({ t: 'h3', text: 'Pendahuluan' }); bl.push(ol(x.pendahuluan)); bl.push({ t: 'h3', text: 'Kegiatan Inti' }); bl.push(ol(x.inti)); bl.push({ t: 'h3', text: 'Penutup' }); bl.push(ol(x.penutup)); });
  bl.push(H('G. Penilaian'));
  const pn = j.penilaian || {}; bl.push(kv([['Penilaian Sikap', c(pn.sikap)], ['Penilaian Pengetahuan', c(pn.pengetahuan)], ['Penilaian Keterampilan', c(pn.keterampilan)]]));
  const rb = (Array.isArray(j.rubrik) ? j.rubrik : []).map((r) => [c(r.aspek), c(r.k4), c(r.k3), c(r.k2), c(r.k1)]);
  if (rb.length) bl.push({ t: 'table', widths: [20, 20, 20, 20, 20], head: ['Aspek', 'Sangat Baik (4)', 'Baik (3)', 'Cukup (2)', 'Perlu Bimbingan (1)'], rows: rb, small: true });
  bl.push(H('H. Remedial dan Pengayaan')); bl.push(kv([['Remedial', c(j.remedial)], ['Pengayaan', c(j.pengayaan)]]));
  if (arr(j.pustaka).length) { bl.push(H('I. Daftar Pustaka')); bl.push(ul(j.pustaka)); }
  bl.push(signBlock(f, sch));
  return doc('rpp' + no, `RPP ${no}: ${grp.nama}`, bl);
}

/* ---------- KKM K13 ---------- */
export function promptKKM(f, units) {
  return `Lakukan analisis KKM (Kurikulum 2013) untuk tiap KD berikut. Nilai tiap kriteria 1 sampai 3 (1 = tinggi/sulit, 3 = rendah/mudah untuk kompleksitas; untuk daya dukung dan intake, 3 = tinggi/baik). Beri alasan singkat tiap baris.
${units.map((u, i) => `${i + 1}. ${u.tp.replace(/\n/g, ' | ')}`).join('\n')}
Skema JSON:
${J({ kkm: [{ no: 1, kompleksitas: 2, daya_dukung: 3, intake: 2, alasan: 'string' }] })}`;
}
export function docKKM(f, sch, j, units) {
  const a = Array.isArray(j.kkm) ? j.kkm : []; const rows = []; let tot = 0;
  units.forEach((u, i) => { const k = a.find((x) => +x.no === i + 1) || a[i] || {}; const cl = Math.min(3, Math.max(1, Math.round(num(k.kompleksitas, 2)))), dd = Math.min(3, Math.max(1, Math.round(num(k.daya_dukung, 2)))), it = Math.min(3, Math.max(1, Math.round(num(k.intake, 2)))); const kk = Math.round(((cl + dd + it) / 9) * 100); tot += kk; rows.push([{ x: String(i + 1), al: 'center' }, u.tp.split('\n')[0], { x: String(cl), al: 'center' }, { x: String(dd), al: 'center' }, { x: String(it), al: 'center' }, { x: `**${kk}**`, al: 'center' }, c(k.alasan)]); });
  const bl = head(f, sch, 'ANALISIS KRITERIA KETUNTASAN MINIMAL (KKM)');
  bl.push({ t: 'table', widths: [4, 34, 9, 9, 9, 9, 26], head: ['No', 'Kompetensi Dasar', 'Kompleksitas', 'Daya Dukung', 'Intake', 'KKM', 'Alasan'], rows, small: true });
  bl.push(p(`KKM mata pelajaran = rata-rata KKM KD = ${units.length ? Math.round(tot / units.length) : 0}. KKM tiap KD dihitung dari jumlah skor tiga kriteria dibagi 9, dikali 100.`));
  const m = units.length ? Math.round(tot / units.length) : 75; const w = (100 - m) / 3;
  bl.push(p(`Interval predikat berdasarkan KKM ${m}: D kurang dari ${m}; C ${m} sampai ${Math.floor(m + w - 0.01)}; B ${Math.floor(m + w - 0.01) + 1} sampai ${Math.floor(m + 2 * w - 0.01)}; A ${Math.floor(m + 2 * w - 0.01) + 1} sampai 100.`));
  bl.push(signBlock(f, sch)); return doc('kkm', 'Analisis KKM', bl, false);
}

/* ---------- LKPD ---------- */
export function promptLKPD(f, grp) {
  return `Susun satu LKPD (Lembar Kerja Peserta Didik) siap cetak untuk lingkup materi "${grp.nama}" ${f.mapel} kelas ${f.kelas}.
TP/KD: ${grp.units.map((u) => u.tp.replace(/\n/g, ' | ')).join(' ; ')}
LKPD berupa kegiatan belajar nyata (mengamati, mengerjakan, menganalisis, menyimpulkan), bukan salinan materi. Sertakan 2 sampai 3 kegiatan, tiap kegiatan dengan langkah dan pertanyaan atau soal konkret beserta ruang jawaban. Bila relevan, sertakan satu tabel pengamatan/pengerjaan (kepala kolom dan jumlah baris kosong). Berikan kolom kesimpulan dan refleksi singkat.
Skema JSON:
${J({ judul: 'string', petunjuk: ['string'], tujuan: 'string', alat_bahan: ['string'], kegiatan: [{ judul: 'string', langkah: ['string'], pertanyaan: ['string'] }], tabel: { kepala: ['kolom'], baris: 4 }, kesimpulan: 'pertanyaan penuntun kesimpulan', refleksi: ['string'], kunci: ['jawaban ringkas untuk guru, urut sesuai pertanyaan'] })}`;
}
export function docLKPD(f, sch, j, grp, no) {
  const bl = [kopBlock(sch), { t: 'title', text: `LEMBAR KERJA PESERTA DIDIK (LKPD)` }, { t: 'sub', text: c(j.judul || grp.nama) }];
  bl.push(kv([['Mata Pelajaran', f.mapel], ['Kelas / Semester', `${ROMAN[+f.kelas]} / ${semLabel(f)}`], ['Nama', '.....................................................'], ['Kelompok / Absen', '.....................................................']]));
  bl.push(H('Petunjuk')); bl.push(ol(j.petunjuk));
  if (j.tujuan) { bl.push(H('Tujuan')); bl.push(p(j.tujuan)); }
  if (arr(j.alat_bahan).length) { bl.push(H('Alat dan Bahan')); bl.push(ul(j.alat_bahan)); }
  (Array.isArray(j.kegiatan) ? j.kegiatan : []).forEach((k, i) => { bl.push(H(`Kegiatan ${i + 1}: ${c(k.judul)}`)); bl.push(ol(k.langkah)); arr(k.pertanyaan).forEach((q, n) => { bl.push(p(`${n + 1}. ${q}`)); bl.push(p('Jawaban: ................................................................................................................')); bl.push(p('................................................................................................................................')); }); });
  const t = j.tabel; if (t && arr(t.kepala).length) { const nb = Math.min(10, Math.max(2, Math.round(num(t.baris, 4)))); bl.push(H('Tabel Pengamatan / Pengerjaan')); bl.push({ t: 'table', head: ['No', ...arr(t.kepala)], rows: Array.from({ length: nb }, (_, i) => [{ x: String(i + 1), al: 'center' }, ...arr(t.kepala).map(() => '\n')]) }); }
  bl.push(H('Kesimpulan')); if (j.kesimpulan) bl.push(p(j.kesimpulan)); bl.push(p('................................................................................................................................')); bl.push(p('................................................................................................................................'));
  if (arr(j.refleksi).length) { bl.push(H('Refleksi')); arr(j.refleksi).forEach((r) => bl.push(p(`${r}\n................................................................................`))); }
  bl.push({ t: 'pagebreak' }); bl.push(...[{ t: 'title', text: 'KUNCI JAWABAN LKPD (UNTUK GURU)' }, ol(j.kunci)]);
  return doc('lkpd' + no, `LKPD ${no}: ${grp.nama}`, bl);
}

/* ---------- Asesmen ---------- */
export function promptAsesmen(f, scopeUnits, cnt) {
  const k13 = f.kur === 'k13';
  return `Susun perangkat ${k13 ? 'penilaian' : 'asesmen sumatif'} untuk ${f.mapel} kelas ${f.kelas} dengan cakupan:
${scopeUnits.map((u, i) => `${i + 1}. ${u.tp.replace(/\n/g, ' | ')} (materi: ${u.materi})`).join('\n')}
Jumlah soal: pilihan ganda ${cnt.pg} butir (${cnt.opsi} opsi), isian singkat ${cnt.isian} butir, uraian ${cnt.uraian} butir.
Ketentuan:
- Soal harus lengkap, bisa langsung dipakai, bahasa sesuai kelas, ada stimulus (teks pendek, data, atau kasus) bila perlu. Jangan memakai "semua jawaban benar/salah" kecuali terpaksa. Sebaran tingkat kognitif: sekitar 30 persen mudah (L1), 50 persen sedang (L2), 20 persen penalaran/HOTS (L3).
- Kunci pilihan ganda tersebar merata. Pengecoh masuk akal. Tiap soal punya nomor TP/KD yang diukur (isi "tp" dengan nomor urut TP di daftar di atas).
- Uraian dilengkapi kunci jawaban dan rubrik skor rinci (jumlah skor per butir).
- Kisi-kisi: satu baris per kelompok soal dengan indikator soal, level kognitif, bentuk soal, dan nomor soal.${f.cakupanSoal ? '\n- ' + f.cakupanSoal : ''}${f.kur === 'k13' ? '\n- Tambahkan satu tugas unjuk kerja/proyek untuk KI-4 beserta rubriknya, dan lembar observasi sikap singkat (KI-1 dan KI-2) dengan indikator.' : ''}
Skema JSON:
${J({ judul: 'string', petunjuk: ['petunjuk pengerjaan'], kisi: [{ tp: 1, materi: 'string', indikator: 'Disajikan ..., peserta didik dapat ...', level: 'L1', bentuk: 'PG', nomor: '1, 2, 3' }], pg: [{ stimulus: 'string atau kosong', q: 'pertanyaan', opsi: ['A isi', 'B isi', 'C isi', 'D isi'], kunci: 'A', tp: 1, level: 'L2' }], isian: [{ q: 'string', kunci: 'string', tp: 1 }], uraian: [{ q: 'string', kunci: 'jawaban lengkap', rubrik: 'rincian skor, mis. 2 poin untuk ..., 3 poin untuk ...', skor: 10, tp: 1 }], ...(f.kur === 'k13' ? { unjuk_kerja: { tugas: 'string', rubrik: [{ aspek: 'string', k4: '', k3: '', k2: '', k1: '' }] }, sikap: [{ indikator: 'string', aspek: 'jujur/disiplin/...' }] } : {}) })}`;
}
const letters = 'ABCDE';
export function docsAsesmen(f, sch, j, cnt, units) {
  const pg = (Array.isArray(j.pg) ? j.pg : []).map((x) => ({ ...x, opsi: arr(x.opsi).map((o) => o.replace(/^[A-Ea-e][.)]\s*/, '')) }));
  const isi = Array.isArray(j.isian) ? j.isian : []; const ur = Array.isArray(j.uraian) ? j.uraian : [];
  const ttl = f.kur === 'k13' ? 'PENILAIAN' : 'ASESMEN SUMATIF';
  const out = [];
  // kisi-kisi
  const ki = head(f, sch, `KISI-KISI ${ttl}`, c(j.judul || ''));
  ki.push({ t: 'table', widths: [4, 22, 38, 8, 12, 16], head: ['No', 'Tujuan Pembelajaran / Materi', 'Indikator Soal', 'Level', 'Bentuk', 'No. Soal'], rows: (Array.isArray(j.kisi) ? j.kisi : []).map((k, i) => { const u = units[(+k.tp || 1) - 1]; return [{ x: String(i + 1), al: 'center' }, `${u ? u.tp.split('\n')[0] + '\n' : ''}Materi: ${c(k.materi)}`, c(k.indikator), { x: c(k.level), al: 'center' }, { x: c(k.bentuk), al: 'center' }, { x: c(k.nomor), al: 'center' }]; }), small: true });
  ki.push(signBlock(f, sch)); out.push(doc('kisi', 'Kisi-kisi', ki, true));
  // naskah soal
  const so = [kopBlock(sch), { t: 'title', text: `${ttl} ${f.mapel.toUpperCase()}` }, { t: 'sub', text: `Kelas ${ROMAN[+f.kelas]} | Semester ${semLabel(f)} | Tahun Ajaran ${sch.tahunAjaran}` }, kv([['Nama', '..........................................'], ['Kelas / No. Absen', '..........................................'], ['Hari / Tanggal', '..........................................']])];
  so.push(H('Petunjuk Pengerjaan')); so.push(ol(j.petunjuk && arr(j.petunjuk).length ? j.petunjuk : ['Berdoalah sebelum mengerjakan.', 'Tulis nama dan nomor absen pada lembar jawaban.', 'Kerjakan soal yang kamu anggap mudah terlebih dahulu.']));
  if (pg.length) { so.push(H(`A. Pilihan Ganda (pilih satu jawaban yang paling tepat)`)); pg.forEach((x, i) => { if (c(x.stimulus)) so.push(p(`**Stimulus:** ${c(x.stimulus)}`)); so.push(p(`${i + 1}. ${c(x.q)}`)); so.push({ t: 'p', al: 'left', text: x.opsi.slice(0, cnt.opsi).map((o, k) => `${letters[k]}. ${o}`).join('\n') }); }); }
  if (isi.length) { so.push(H('B. Isian Singkat')); isi.forEach((x, i) => so.push(p(`${i + 1}. ${c(x.q)}  .............................`))); }
  if (ur.length) { so.push(H('C. Uraian')); ur.forEach((x, i) => { so.push(p(`${i + 1}. ${c(x.q)}`)); }); }
  if (j.unjuk_kerja) { so.push(H('D. Unjuk Kerja / Proyek')); so.push(p(j.unjuk_kerja.tugas)); }
  out.push(doc('soal', 'Naskah Soal', so));
  // kunci
  const kn = head(f, sch, `KUNCI JAWABAN DAN PEDOMAN PENSKORAN`, c(j.judul || ''));
  if (pg.length) { kn.push(H('A. Pilihan Ganda')); kn.push({ t: 'table', head: ['No', 'Kunci', 'TP', 'Level'], widths: [10, 15, 15, 15], rows: pg.map((x, i) => [{ x: String(i + 1), al: 'center' }, { x: c(x.kunci), al: 'center' }, { x: String(x.tp || ''), al: 'center' }, { x: c(x.level), al: 'center' }]), small: true }); }
  if (isi.length) { kn.push(H('B. Isian Singkat')); kn.push({ t: 'table', head: ['No', 'Kunci Jawaban', 'Skor'], widths: [10, 75, 15], rows: isi.map((x, i) => [{ x: String(i + 1), al: 'center' }, c(x.kunci), { x: '2', al: 'center' }]) }); }
  if (ur.length) { kn.push(H('C. Uraian')); kn.push({ t: 'table', head: ['No', 'Kunci Jawaban', 'Rubrik Penskoran', 'Skor'], widths: [6, 38, 44, 12], rows: ur.map((x, i) => [{ x: String(i + 1), al: 'center' }, c(x.kunci), c(x.rubrik), { x: String(num(x.skor, 10)), al: 'center' }]), small: true }); }
  if (j.unjuk_kerja) { kn.push(H('D. Rubrik Unjuk Kerja')); kn.push({ t: 'table', head: ['Aspek', 'Sangat Baik (4)', 'Baik (3)', 'Cukup (2)', 'Perlu Bimbingan (1)'], widths: [20, 20, 20, 20, 20], rows: (Array.isArray(j.unjuk_kerja.rubrik) ? j.unjuk_kerja.rubrik : []).map((r) => [c(r.aspek), c(r.k4), c(r.k3), c(r.k2), c(r.k1)]), small: true }); }
  if (Array.isArray(j.sikap) && j.sikap.length) { kn.push(H('E. Lembar Observasi Sikap')); kn.push({ t: 'table', head: ['No', 'Aspek', 'Indikator', 'SB', 'B', 'C', 'K'], widths: [6, 16, 52, 6, 6, 7, 7], rows: j.sikap.map((s, i) => [{ x: String(i + 1), al: 'center' }, c(s.aspek), c(s.indikator), '', '', '', '']), small: true }); }
  const sPG = pg.length, sIs = isi.length * 2, sUr = ur.reduce((a, x) => a + num(x.skor, 10), 0); const maxS = sPG + sIs + sUr;
  kn.push(H('Pedoman Skor Akhir')); kn.push(p(`Pilihan ganda: tiap jawaban benar 1 skor (maksimal ${sPG}). Isian singkat: tiap jawaban benar 2 skor (maksimal ${sIs}). Uraian: sesuai rubrik (maksimal ${sUr}). Skor maksimal ${maxS}. Nilai akhir = (skor perolehan / ${maxS}) x 100.`));
  kn.push(signBlock(f, sch)); out.push(doc('kunci', 'Kunci dan Penskoran', kn));
  return out;
}

/* ---------- Remedial dan pengayaan ---------- */
export function promptRemedial(f, units) {
  return `Susun program remedial dan pengayaan untuk ${f.mapel} kelas ${f.kelas} atas TP berikut:
${units.map((u, i) => `${i + 1}. ${u.tp.replace(/\n/g, ' | ')}`).join('\n')}
Berikan strategi yang realistis (pembelajaran ulang dengan metode lain, tutor sebaya, bimbingan kelompok kecil, tugas berjenjang), kegiatan nyata, 5 soal remedial dengan kunci, serta kegiatan dan 3 soal pengayaan tingkat penalaran dengan kunci.
Skema JSON:
${J({ remedial: { sasaran: 'string', strategi: ['string'], kegiatan: ['string'], soal: [{ q: 'string', kunci: 'string' }], kriteria: 'string' }, pengayaan: { sasaran: 'string', kegiatan: ['string'], soal: [{ q: 'string', kunci: 'string' }], kriteria: 'string' } })}`;
}
export function docRemedial(f, sch, j) {
  const r = j.remedial || {}, e = j.pengayaan || {}; const bl = head(f, sch, 'PROGRAM REMEDIAL DAN PENGAYAAN');
  bl.push(H('A. Program Remedial')); bl.push(kv([['Sasaran', c(r.sasaran)], ['Kriteria', c(r.kriteria)]])); bl.push(H2('Strategi')); bl.push(ul(r.strategi)); bl.push(H2('Kegiatan')); bl.push(ol(r.kegiatan));
  bl.push(H2('Soal Remedial dan Kunci')); (r.soal || []).forEach((x, i) => { bl.push(p(`${i + 1}. ${c(x.q)}`)); bl.push(p(`Kunci: ${c(x.kunci)}`)); });
  bl.push(H('B. Program Pengayaan')); bl.push(kv([['Sasaran', c(e.sasaran)], ['Kriteria', c(e.kriteria)]])); bl.push(H2('Kegiatan')); bl.push(ol(e.kegiatan));
  bl.push(H2('Soal Pengayaan dan Kunci')); (e.soal || []).forEach((x, i) => { bl.push(p(`${i + 1}. ${c(x.q)}`)); bl.push(p(`Kunci: ${c(x.kunci)}`)); });
  bl.push(signBlock(f, sch)); return doc('remedial', 'Remedial dan Pengayaan', bl);
}

/* ---------- Bahan ajar ---------- */
export function promptBahan(f, grp) {
  return `Tulis bahan ajar / ringkasan materi untuk peserta didik kelas ${f.kelas} tentang "${grp.nama}" (${f.mapel}).
TP: ${grp.units.map((u) => u.tp.replace(/\n/g, ' | ')).join(' ; ')}
Isi harus menerangkan materi sungguhan dengan benar, runtut, dan sesuai tingkat kelas. Gunakan materi unggahan guru sebagai sumber utama bila ada. 4 sampai 7 bagian, tiap bagian beberapa paragraf pendek atau butir penting, dengan contoh nyata. Akhiri dengan rangkuman, 5 soal latihan beserta kunci, dan glosarium.
Skema JSON:
${J({ judul: 'string', bagian: [{ judul: 'string', paragraf: ['string'], poin: ['string'] }], rangkuman: ['string'], latihan: [{ q: 'string', kunci: 'string' }], glosarium: [{ istilah: 'string', arti: 'string' }], pustaka: ['string'] })}`;
}
export function docBahan(f, sch, j, grp, no) {
  const bl = [kopBlock(sch), { t: 'title', text: `BAHAN AJAR: ${c(j.judul || grp.nama).toUpperCase()}` }, { t: 'sub', text: `${f.mapel} | Kelas ${ROMAN[+f.kelas]} | ${sch.tahunAjaran}` }];
  (Array.isArray(j.bagian) ? j.bagian : []).forEach((b, i) => { bl.push(H(`${String.fromCharCode(65 + i)}. ${c(b.judul)}`)); arr(b.paragraf).forEach((x) => bl.push(p(x))); if (arr(b.poin).length) bl.push(ul(b.poin)); });
  if (arr(j.rangkuman).length) { bl.push(H('Rangkuman')); bl.push(ul(j.rangkuman)); }
  if ((j.latihan || []).length) { bl.push(H('Latihan')); j.latihan.forEach((x, i) => bl.push(p(`${i + 1}. ${c(x.q)}`))); bl.push(H2('Kunci Latihan')); j.latihan.forEach((x, i) => bl.push(p(`${i + 1}. ${c(x.kunci)}`))); }
  const gl = (Array.isArray(j.glosarium) ? j.glosarium : []).map((g) => [c(g.istilah), c(g.arti)]); if (gl.length) { bl.push(H('Glosarium')); bl.push({ t: 'table', widths: [28, 72], head: ['Istilah', 'Arti'], rows: gl }); }
  if (arr(j.pustaka).length) { bl.push(H('Daftar Pustaka')); bl.push(ul(j.pustaka)); }
  return doc('bahan' + no, `Bahan Ajar ${no}: ${grp.nama}`, bl);
}

/* ---------- Kokurikuler ---------- */
export function promptKoku(f, units) {
  const kbc = f.kur === 'kbc';
  return `Susun rencana kegiatan kokurikuler untuk ${f.jenjang} kelas ${f.kelas} (Fase ${faseOf(f.kelas)}) yang terkait mata pelajaran ${f.mapel}${f.topik ? `, tema: ${f.topik}` : ''}. Kokurikuler menguatkan dimensi Profil Lulusan${kbc ? ' dan Panca Cinta (kokurikuler madrasah memadukan dimensi profil lulusan dengan topik Panca Cinta)' : ''}, dilakukan lewat proyek nyata. Dimensi tersedia: ${DIMENSI_LULUSAN.map((d) => d.s).join(', ')}.
Ketentuan: tema kontekstual yang bisa dikerjakan sekolah biasa tanpa biaya besar; tahapan berurutan (pengenalan, kontekstualisasi, aksi nyata, refleksi dan tindak lanjut) dengan kegiatan konkret dan alokasi JP; produk akhir jelas; asesmen memakai skala Sangat Berkembang / Berkembang Sesuai Harapan / Cukup Berkembang / Mulai Berkembang (SB/B/C/K) beserta indikator per dimensi.
Skema JSON:
${J({ tema: 'string', ringkasan: 'string', dimensi: ['nama dimensi'], ...(kbc ? { cinta: ['nama cinta'] } : {}), tujuan: ['string'], alokasi: 'mis. 36 JP dalam 6 pekan', tahap: [{ nama: 'Pengenalan', jp: 6, kegiatan: ['string'] }], produk: 'string', kemitraan: 'string', asesmen: [{ dimensi: 'string', indikator: 'string', sb: 'string', b: 'string', c: 'string', k: 'string' }] })}`;
}
export function docKoku(f, sch, j) {
  const kbc = f.kur === 'kbc'; const bl = head(f, sch, 'RENCANA KEGIATAN KOKURIKULER', c(j.tema));
  bl.push(p(j.ringkasan)); bl.push(kv([['Dimensi Profil Lulusan', arr(j.dimensi).join('; ')], ...(kbc ? [['Panca Cinta', arr(j.cinta).join('; ')]] : []), ['Alokasi', c(j.alokasi)], ['Produk Akhir', c(j.produk)], ['Kemitraan', c(j.kemitraan)]]));
  bl.push(H('A. Tujuan')); bl.push(ol(j.tujuan)); bl.push(H('B. Tahapan Kegiatan'));
  (Array.isArray(j.tahap) ? j.tahap : []).forEach((t) => { bl.push(H2(`${c(t.nama)}${t.jp ? ` (${t.jp} JP)` : ''}`)); bl.push(ol(t.kegiatan)); });
  bl.push(H('C. Asesmen Dimensi')); bl.push(p('Capaian dinilai dengan skala SB (Sangat Berkembang), B (Berkembang Sesuai Harapan), C (Cukup Berkembang), dan K (Mulai Berkembang).'));
  bl.push({ t: 'table', widths: [16, 20, 16, 16, 16, 16], head: ['Dimensi', 'Indikator', 'SB', 'B', 'C', 'K'], rows: (Array.isArray(j.asesmen) ? j.asesmen : []).map((a) => [c(a.dimensi), c(a.indikator), c(a.sb), c(a.b), c(a.c), c(a.k)]), small: true });
  bl.push(signBlock(f, sch)); return doc('koku', kbc ? 'Kokurikuler Panca Cinta' : 'Kokurikuler', bl, true);
}

/* ---------- Silabus K13 ---------- */
export function docSilabus(f, sch, j, units) {
  const ki = j.ki || {}; const bl = head(f, sch, 'SILABUS');
  bl.push(kv([['KI-1', c(ki.ki1)], ['KI-2', c(ki.ki2)], ['KI-3', c(ki.ki3)], ['KI-4', c(ki.ki4)]]));
  const rows = units.map((u, i) => [{ x: String(i + 1), al: 'center' }, `${u.kd3}\n${u.kd4}`, `${u.lingkup}\n${u.materi}`, u.kegiatan.map((x) => '- ' + x).join('\n'), u.ipk.map((x) => '- ' + x).join('\n'), u.penilaian, { x: String(u.jp), al: 'center' }, u.sumber]);
  bl.push({ t: 'table', widths: [4, 20, 14, 24, 18, 8, 4, 8], head: ['No', 'Kompetensi Dasar', 'Materi Pokok', 'Kegiatan Pembelajaran', 'Indikator Pencapaian', 'Penilaian', 'JP', 'Sumber'], rows, small: true });
  bl.push(signBlock(f, sch)); return doc('silabus', 'Silabus', bl, true);
}
