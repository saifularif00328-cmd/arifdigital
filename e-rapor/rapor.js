// E-Rapor: perhitungan nilai, deskripsi otomatis, dan penyusun dokumen rapor
import { kopBlock, clean } from '../shared/core.js';
import { ROMAN, faseOf, isMadrasah, DIMENSI_LULUSAN } from '../shared/kurikulum.js';
import { tanggalID } from '../generator/prompts.js';

export const num = (x) => { if (x === '' || x == null) return null; const n = parseFloat(String(x).replace(',', '.')); return isFinite(n) ? n : null; };
export const r0 = (x) => (x == null ? null : Math.floor(x + 0.5));
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const firstName = (n) => { const w = String(n || '').trim().split(/\s+/)[0] || ''; return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : 'Ananda'; };
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const join = (a) => (a.length <= 1 ? a.join('') : a.length === 2 ? a.join(' dan ') : a.slice(0, -1).join(', ') + ', dan ' + a[a.length - 1]);

/* ---------- predikat ---------- */
export function bandK13(kkm) { const K = Math.round(kkm || 75); const w = (100 - K) / 3; return { C: K, B: Math.floor(K + w - 0.01) + 1, A: Math.floor(K + 2 * w - 0.01) + 1 }; }
export function predikat(n, kkm) { if (n == null) return ''; const b = bandK13(kkm); return n >= b.A ? 'A' : n >= b.B ? 'B' : n >= b.C ? 'C' : 'D'; }
export const SKALA = { SB: 'Sangat Baik', B: 'Baik', C: 'Cukup', K: 'Kurang' };
export const SKALA_KOKU = { SB: 'sangat berkembang', B: 'berkembang sesuai harapan', C: 'cukup berkembang', K: 'mulai berkembang' };

/* ---------- struktur awal ---------- */
export function newProject(o) {
  return { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: Date.now(), nama: o.nama || `${o.jenjang} Kelas ${o.kelas}${o.rombel ? ' ' + o.rombel : ''}`, kur: o.kur, jenjang: o.jenjang, kelas: +o.kelas, rombel: o.rombel || '', semester: +o.semester, tahunAjaran: o.tahunAjaran, wali: o.wali || '', waliNip: o.waliNip || '',
    mapel: [], siswa: [], nilai: {}, sikap: {}, koku: { tema: '', dimensi: [], data: {}, desc: {} }, ekskul: {}, absen: {}, catatan: {}, prestasi: {}, kenaikan: {}, bobot: { lingkup: 50, sas: 50 }, tanggal: '', opsi: { kop: false, identitas: false, kokuDesc: true }, quotaUsed: false };
}
export function newMapel(nama, kur) { return { id: 'm' + Math.random().toString(36).slice(2, 9), nama, kktp: 75, tp: [], k13: kur === 'k13' }; }
export const newSiswa = (o = {}) => ({ id: 's' + Math.random().toString(36).slice(2, 9), nama: '', nis: '', nisn: '', jk: 'L', tl: '', tgl: '', agama: '', ayah: '', ibu: '', alamat: '', ...o });
export const newTP = (o = {}) => ({ id: 't' + Math.random().toString(36).slice(2, 9), teks: '', kd3: '', kd4: '', ...o });

/* ---------- nilai ---------- */
export function cell(p, sid, mid) { return ((p.nilai[sid] || {})[mid]) || {}; }
export function tpScores(p, sid, m) { const c = cell(p, sid, m.id); return m.tp.map((t) => ({ t, n: num((c.tp || {})[t.id]), k: num((c.kp || {})[t.id]) })); }
/** Nilai akhir Merdeka/KBC */
export function nilaiAkhir(p, sid, m) {
  const c = cell(p, sid, m.id); const L = m.tp.map((t) => num((c.tp || {})[t.id])).filter((x) => x != null); const S = num(c.sas);
  const aL = mean(L); const wl = p.bobot.lingkup, ws = p.bobot.sas;
  if (aL == null && S == null) return null; if (aL == null) return r0(S); if (S == null) return r0(aL);
  return r0((aL * wl + S * ws) / (wl + ws || 1));
}
/** K13: nilai akhir pengetahuan = (2*rataNH + PTS + PAS) / 4 ; keterampilan = rata-rata */
export function nilaiK13(p, sid, m) {
  const c = cell(p, sid, m.id); const nh = m.tp.map((t) => num((c.tp || {})[t.id])).filter((x) => x != null); const pts = num(c.pts), pas = num(c.pas);
  let np = null; if (nh.length || pts != null || pas != null) { const aNH = mean(nh); const parts = []; if (aNH != null) parts.push([aNH, 2]); if (pts != null) parts.push([pts, 1]); if (pas != null) parts.push([pas, 1]); np = r0(parts.reduce((s, x) => s + x[0] * x[1], 0) / parts.reduce((s, x) => s + x[1], 0)); }
  const kp = m.tp.map((t) => num((c.kp || {})[t.id])).filter((x) => x != null); const nk = kp.length ? r0(mean(kp)) : null;
  return { np, nk };
}
export const stripNo = (s) => String(s || '').replace(/^\s*[34]\.\d+\s*/, '').trim();
const tpPhrase = (s) => { let t = clean(s).replace(/^peserta didik\s+(dapat|mampu)\s+/i, '').replace(/^siswa\s+(dapat|mampu)\s+/i, '').replace(/^mampu\s+/i, '').replace(/[.;]+$/, '').trim(); t = stripNo(t); return t ? t.charAt(0).toLowerCase() + t.slice(1) : ''; };

/** Deskripsi capaian dari daftar [{teks, n}] */
export function deskripsi(nama, items, kktp, mapelNama) {
  const N = firstName(nama); const s = items.filter((x) => x.n != null && tpPhrase(x.teks)); if (!s.length) return '';
  const hi = s.filter((x) => x.n >= kktp).sort((a, b) => b.n - a.n), lo = s.filter((x) => x.n < kktp).sort((a, b) => a.n - b.n);
  const h = hash(nama + (mapelNama || '')); const out = [];
  if (hi.length) { const ph = join(hi.slice(0, 2).map((x) => tpPhrase(x.teks))); out.push([`${N} menunjukkan penguasaan yang baik dalam ${ph}.`, `${N} sudah mampu ${ph}.`, `Capaian ${N} sudah baik dalam hal ${ph}.`][h % 3]); }
  if (lo.length) { const ph = join(lo.slice(0, 2).map((x) => tpPhrase(x.teks))); out.push(hi.length ? [`Namun ${N} masih perlu bimbingan dalam ${ph}.`, `${N} perlu peningkatan dalam ${ph}.`, `Perlu pendampingan lebih lanjut agar ${N} mampu ${ph}.`][(h >> 3) % 3] : [`${N} belum mencapai ketuntasan dan perlu bimbingan dalam ${ph}.`, `${N} masih perlu pendampingan intensif dalam ${ph}.`][(h >> 3) % 2]); }
  else if (hi.length && s.length > 2) out.push([`Seluruh tujuan pembelajaran semester ini sudah tercapai.`, `${N} telah menuntaskan seluruh materi pada semester ini.`][(h >> 5) % 2]);
  return out.join(' ');
}
export function descMerdeka(p, sid, m, siswa) { return deskripsi(siswa.nama, tpScores(p, sid, m).map((x) => ({ teks: x.t.teks, n: x.n })), m.kktp, m.nama); }
export function descK13(p, sid, m, siswa, ket) { const sc = tpScores(p, sid, m); return deskripsi(siswa.nama, sc.map((x) => ({ teks: ket ? x.t.kd4 || x.t.kd3 : x.t.kd3 || x.t.teks, n: ket ? x.k : x.n })), m.kktp, m.nama + (ket ? 'k' : 'p')); }

/* ---------- sikap, kokurikuler, catatan ---------- */
export const ASPEK_SPIRITUAL = ['ketaatan beribadah', 'berdoa sebelum dan sesudah kegiatan', 'bersyukur atas nikmat Tuhan', 'toleransi antarumat beragama'];
export const ASPEK_SOSIAL = ['jujur', 'disiplin', 'tanggung jawab', 'santun', 'peduli', 'percaya diri', 'gotong royong'];
export function descSikap(nama, jenis, pred, menonjol, perlu) {
  const N = firstName(nama); const base = jenis === 'spiritual' ? 'sikap spiritual' : 'sikap sosial'; const h = hash(nama + jenis); const m = menonjol ? ` terutama dalam ${menonjol}` : ''; const pl = perlu ? ` ${N} perlu meningkatkan ${perlu}.` : '';
  if (pred === 'SB') return [`${N} menunjukkan ${base} yang sangat baik${m}.${pl}`, `${base.charAt(0).toUpperCase() + base.slice(1)} ${N} sangat baik${m}.${pl}`][h % 2];
  if (pred === 'B') return [`${N} menunjukkan ${base} yang baik${m}.${pl}`, `${base.charAt(0).toUpperCase() + base.slice(1)} ${N} sudah baik${m}.${pl}`][h % 2];
  if (pred === 'C') return `${base.charAt(0).toUpperCase() + base.slice(1)} ${N} cukup baik${m}, tetapi masih perlu pembiasaan dan bimbingan.${pl}`;
  if (pred === 'K') return `${N} masih perlu bimbingan intensif dalam ${base}.${pl || ''}`;
  return '';
}
export function kokuText(p, sid) {
  const s = p.siswa.find((x) => x.id === sid); if (!s) return ''; const N = firstName(s.nama); const k = p.koku; const d = (k.data || {})[sid] || {};
  const by = { SB: [], B: [], C: [], K: [] }; (k.dimensi || []).forEach((dim) => { const v = d[dim]; if (by[v]) by[v].push(dim.toLowerCase()); });
  const parts = []; ['SB', 'B', 'C', 'K'].forEach((lv) => { if (by[lv].length) parts.push(`${SKALA_KOKU[lv]} pada dimensi ${join(by[lv])}`); });
  if (!parts.length) return '';
  return `${k.tema ? `Dalam kegiatan kokurikuler "${k.tema}", ` : 'Dalam kegiatan kokurikuler, '}${N} ${join(parts)}.`;
}
export function ekskulText(e, nama) { const N = firstName(nama); const lv = { SB: 'sangat baik', B: 'baik', C: 'cukup', K: 'kurang' }[e.p] || 'baik'; return `${N} mengikuti kegiatan ${e.nama} dengan ${lv}.`; }
export function rataSiswa(p, sid) {
  const k13 = p.kur === 'k13'; const v = [];
  p.mapel.forEach((m) => { if (k13) { const n = nilaiK13(p, sid, m); if (n.np != null) v.push(n.np); } else { const n = nilaiAkhir(p, sid, m); if (n != null) v.push(n); } });
  return v.length ? mean(v) : null;
}
export function catatanOtomatis(p, sid) {
  const s = p.siswa.find((x) => x.id === sid); const N = firstName(s.nama); const k13 = p.kur === 'k13'; const sc = [];
  p.mapel.forEach((m) => { const n = k13 ? nilaiK13(p, sid, m).np : nilaiAkhir(p, sid, m); if (n != null) sc.push({ m, n }); });
  if (!sc.length) return ''; const avg = mean(sc.map((x) => x.n)); const low = sc.filter((x) => x.n < x.m.kktp).sort((a, b) => a.n - b.n); const top = [...sc].sort((a, b) => b.n - a.n)[0];
  const ab = p.absen[sid] || {}; const h = hash(s.nama);
  let t = avg >= 90 ? [`${N} menunjukkan prestasi belajar yang sangat baik. Pertahankan semangat belajar dan terus kembangkan kemampuan.`, `Hasil belajar ${N} sangat memuaskan. Teruslah berlatih dan jadilah teladan bagi teman-teman.`][h % 2] : avg >= 80 ? [`${N} memiliki hasil belajar yang baik. Tingkatkan lagi ketekunan agar hasilnya semakin optimal.`, `Capaian belajar ${N} baik. Terus rajin belajar dan jangan ragu bertanya kepada guru.`][h % 2] : avg >= (p.kur === 'k13' ? 70 : 75) ? `${N} sudah cukup baik dalam belajar. Perlu lebih tekun dan teratur dalam mengulang pelajaran di rumah.` : `${N} perlu lebih giat belajar dan mendapat pendampingan dari orang tua di rumah.`;
  if (top && top.n >= 85) t += ` Kemampuan paling menonjol ada pada ${top.m.nama}.`;
  if (low.length) t += ` Perlu perhatian lebih pada ${join(low.slice(0, 2).map((x) => x.m.nama))}.`;
  if ((ab.a || 0) >= 3) t += ' Kehadiran perlu ditingkatkan.';
  return t;
}

/* ---------- tabel rekap ---------- */
export function leger(p) {
  const k13 = p.kur === 'k13'; const rows = p.siswa.map((s) => {
    const vals = p.mapel.map((m) => (k13 ? nilaiK13(p, s.id, m) : { np: nilaiAkhir(p, s.id, m) })); const all = vals.flatMap((v) => (k13 ? [v.np, v.nk] : [v.np])).filter((x) => x != null);
    return { s, vals, jumlah: all.reduce((a, b) => a + b, 0), rata: all.length ? mean(all) : null };
  });
  const order = [...rows].filter((r) => r.rata != null).sort((a, b) => b.rata - a.rata); rows.forEach((r) => { r.rank = r.rata == null ? '' : order.indexOf(r) + 1; });
  return rows;
}
export function docLeger(p, school) {
  const k13 = p.kur === 'k13'; const L = leger(p);
  const cols = p.mapel.flatMap((m) => (k13 ? [`${m.nama} (P)`, `${m.nama} (K)`] : [m.nama]));
  const rows = L.map((r, i) => [{ x: String(i + 1), al: 'center' }, r.s.nama, r.s.nis, ...r.vals.flatMap((v) => (k13 ? [v.np, v.nk] : [v.np]).map((x) => ({ x: x == null ? '' : String(x), al: 'center' }))), { x: String(r.jumlah || ''), al: 'center' }, { x: r.rata == null ? '' : r.rata.toFixed(1), al: 'center' }, { x: String(r.rank), al: 'center' }]);
  const fixed = 4 + 20 + 8; const each = Math.max(3, (100 - fixed - 18) / Math.max(1, cols.length));
  return { id: 'leger', title: 'Leger Nilai', landscape: true, blocks: [kopBlock(school), { t: 'title', text: `LEGER NILAI SEMESTER ${p.semester === 1 ? 'GANJIL' : 'GENAP'}` }, { t: 'sub', text: `${p.jenjang} ${school.nama || ''} | Kelas ${ROMAN[p.kelas]}${p.rombel ? ' ' + p.rombel : ''} | Tahun Ajaran ${p.tahunAjaran}` }, { t: 'table', small: true, widths: [4, 20, 8, ...cols.map(() => each), 6, 6, 4].map((x) => x * (100 / (4 + 20 + 8 + each * cols.length + 16))), head: ['No', 'Nama', 'NIS', ...cols, 'Jumlah', 'Rata-rata', 'Rank'], rows }, { t: 'p', text: p.kur === 'k13' ? '(P) = pengetahuan, (K) = keterampilan.' : 'Nilai adalah nilai akhir tiap mata pelajaran.' }, { t: 'sign', cols: [{ top: 'Mengetahui,', role: `Kepala ${isMadrasah(p.jenjang) ? 'Madrasah' : 'Sekolah'}`, nama: school.kepsek, nip: school.kepsekNip }, { top: `${school.kota ? school.kota + ', ' : ''}${p.tanggal || tanggalID()}`, role: 'Wali Kelas', nama: p.wali, nip: p.waliNip }] }] };
}

/* ---------- rapor per siswa ---------- */
const kv = (rows) => ({ t: 'kv', rows: rows.filter((r) => r[1] != null && String(r[1]) !== '') });
const H = (x) => ({ t: 'h1', text: x });
export function docRapor(p, school, s, opt = {}) {
  const k13 = p.kur === 'k13'; const b = []; const kelasTxt = `${ROMAN[p.kelas]}${p.rombel ? ' (' + p.rombel + ')' : ''}`; const sem = `${p.semester} (${p.semester === 1 ? 'Ganjil' : 'Genap'})`; const tgl = `${school.kota ? school.kota + ', ' : ''}${p.tanggal || tanggalID()}`;
  if (p.opsi.kop) b.push(kopBlock(school));
  if (p.opsi.identitas) {
    b.push({ t: 'title', text: 'IDENTITAS PESERTA DIDIK' }, kv([['Nama Peserta Didik', s.nama], ['NIS / NISN', [s.nis, s.nisn].filter(Boolean).join(' / ')], ['Tempat, Tanggal Lahir', [s.tl, s.tgl].filter(Boolean).join(', ')], ['Jenis Kelamin', s.jk === 'P' ? 'Perempuan' : 'Laki-laki'], ['Agama', s.agama], ['Nama Ayah', s.ayah], ['Nama Ibu', s.ibu], ['Alamat', s.alamat], ['Sekolah', school.nama]]), { t: 'pagebreak' });
  }
  b.push({ t: 'title', text: 'LAPORAN HASIL BELAJAR (RAPOR)' });
  b.push({ t: 'table', widths: [50, 50], small: false, head: [], rows: [[`Nama Peserta Didik : **${s.nama}**\nNIS / NISN : ${[s.nis, s.nisn].filter(Boolean).join(' / ') || '-'}\nSekolah : ${school.nama || ''}\nAlamat : ${[school.alamat, school.kecamatan && 'Kec. ' + school.kecamatan, school.kabupaten].filter(Boolean).join(', ')}`, `Kelas : ${kelasTxt}\nFase : ${faseOf(p.kelas)}\nSemester : ${sem}\nTahun Ajaran : ${p.tahunAjaran}`]] });
  const ds = (txt) => txt || '';
  if (k13) {
    b.push(H('A. Sikap'));
    const sk = p.sikap[s.id] || {}; const spR = sk.sp || '', soR = sk.so || '';
    b.push({ t: 'table', widths: [22, 12, 66], head: ['Sikap', 'Predikat', 'Deskripsi'], rows: [['Sikap Spiritual', { x: spR ? SKALA[spR] : '', al: 'center' }, ds(sk.spDesc || descSikap(s.nama, 'spiritual', spR, sk.spMenonjol, sk.spPerlu))], ['Sikap Sosial', { x: soR ? SKALA[soR] : '', al: 'center' }, ds(sk.soDesc || descSikap(s.nama, 'sosial', soR, sk.soMenonjol, sk.soPerlu))]] });
    const rowsP = [], rowsK = []; p.mapel.forEach((m, i) => { const n = nilaiK13(p, s.id, m); rowsP.push([{ x: String(i + 1), al: 'center' }, m.nama, { x: String(m.kktp), al: 'center' }, { x: n.np == null ? '' : String(n.np), al: 'center' }, { x: predikat(n.np, m.kktp), al: 'center' }, descK13(p, s.id, m, s, false)]); rowsK.push([{ x: String(i + 1), al: 'center' }, m.nama, { x: String(m.kktp), al: 'center' }, { x: n.nk == null ? '' : String(n.nk), al: 'center' }, { x: predikat(n.nk, m.kktp), al: 'center' }, descK13(p, s.id, m, s, true)]); });
    b.push(H('B. Pengetahuan')); b.push({ t: 'table', small: true, widths: [4, 22, 6, 7, 8, 53], head: ['No', 'Mata Pelajaran', 'KKM', 'Nilai', 'Predikat', 'Deskripsi'], rows: rowsP });
    b.push(H('C. Keterampilan')); b.push({ t: 'table', small: true, widths: [4, 22, 6, 7, 8, 53], head: ['No', 'Mata Pelajaran', 'KKM', 'Nilai', 'Predikat', 'Deskripsi'], rows: rowsK });
    b.push({ t: 'p', text: `Interval predikat berdasarkan KKM: D kurang dari KKM; C mulai KKM; B dan A pada interval di atasnya sesuai ketentuan satuan pendidikan.`, al: 'left' });
  } else {
    b.push(H('A. Capaian Hasil Belajar'));
    b.push({ t: 'table', widths: [5, 26, 10, 59], head: ['No', 'Mata Pelajaran', 'Nilai Akhir', 'Capaian Kompetensi'], rows: p.mapel.map((m, i) => { const n = nilaiAkhir(p, s.id, m); return [{ x: String(i + 1), al: 'center' }, m.nama, { x: n == null ? '' : String(n), al: 'center' }, descMerdeka(p, s.id, m, s)]; }) });
    const kt = (p.opsi.kokuDesc && (p.koku.desc || {})[s.id]) || kokuText(p, s.id);
    b.push(H('B. Kokurikuler')); b.push({ t: 'table', widths: [100], head: [], rows: [[kt || '-']] });
  }
  const letters = k13 ? ['D', 'E', 'F', 'G'] : ['C', 'D', 'E', 'F']; let li = 0;
  const ek = (p.ekskul[s.id] || []).filter((e) => e.nama);
  b.push(H(`${letters[li++]}. Ekstrakurikuler`)); b.push({ t: 'table', widths: [6, 34, 60], head: ['No', 'Kegiatan Ekstrakurikuler', 'Keterangan'], rows: ek.length ? ek.map((e, i) => [{ x: String(i + 1), al: 'center' }, e.nama, e.ket || ekskulText(e, s.nama)]) : [['', '-', '-']] });
  const ab = p.absen[s.id] || {};
  b.push(H(`${letters[li++]}. Ketidakhadiran`)); b.push({ t: 'table', widths: [60, 40], head: ['Alasan', 'Jumlah'], rows: [['Sakit', { x: `${ab.s || 0} hari`, al: 'center' }], ['Izin', { x: `${ab.i || 0} hari`, al: 'center' }], [k13 ? 'Tanpa keterangan' : 'Tanpa keterangan (alpa)', { x: `${ab.a || 0} hari`, al: 'center' }]] });
  const pr = (p.prestasi[s.id] || []).filter((x) => x.ket); if (k13) { b.push(H(`${letters[li++]}. Prestasi`)); b.push({ t: 'table', widths: [6, 34, 60], head: ['No', 'Jenis Prestasi', 'Keterangan'], rows: pr.length ? pr.map((x, i) => [{ x: String(i + 1), al: 'center' }, x.jenis || '', x.ket]) : [['', '-', '-']] }); }
  b.push(H(`${letters[li++]}. Catatan Wali Kelas`)); b.push({ t: 'table', widths: [100], head: [], rows: [[(p.catatan[s.id] || catatanOtomatis(p, s.id) || '-')]] });
  if (k13) { b.push(H(`${letters[li++]}. Tanggapan Orang Tua/Wali`)); b.push({ t: 'table', widths: [100], head: [], rows: [['\n\n']] }); }
  if (p.semester === 2) { const kn = p.kenaikan[s.id]; if (kn) b.push({ t: 'p', al: 'left', text: kn === 'naik' ? `**Keputusan:** Berdasarkan hasil yang dicapai pada semester 1 dan 2, peserta didik ini dinyatakan **naik ke kelas ${ROMAN[p.kelas + 1] || ''}**.` : `**Keputusan:** Berdasarkan hasil yang dicapai pada semester 1 dan 2, peserta didik ini dinyatakan **tinggal di kelas ${ROMAN[p.kelas]}**.` }); }
  b.push({ t: 'sign', cols: [{ top: ' ', role: 'Orang Tua/Wali', nama: '', nip: '' }, { top: tgl, role: 'Wali Kelas', nama: p.wali, nip: p.waliNip }, { top: ' ', role: `Kepala ${isMadrasah(p.jenjang) ? 'Madrasah' : 'Sekolah'}`, nama: school.kepsek, nip: school.kepsekNip }] });
  return b;
}
export function docRaporKelas(p, school, ids) {
  const out = []; (ids || p.siswa.map((s) => s.id)).forEach((id, i) => { const s = p.siswa.find((x) => x.id === id); if (!s) return; if (i) out.push({ t: 'pagebreak' }); out.push(...docRapor(p, school, s)); }); return out;
}
