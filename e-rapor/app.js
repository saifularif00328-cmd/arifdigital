import { $, $$, esc, lsGet, lsSet, debounce, toast, dialog, confirmBox, busy, mountAccountBar, useQuota, loadSchool, syncSchoolFromCloud, saveSchool, schoolFormHTML, readSchoolForm, bindSchoolForm, kopBlock, aiJSON, Doc, downloadBlob, safeName, zipFiles, icons, cloud, session, lib, onAccountChange, loadScript, keyPanelHTML, bindKeyPanel } from '../shared/core.js';
import { JENJANG, KURIKULUM, ROMAN, faseOf, isMadrasah, mapelList, DIMENSI_LULUSAN } from '../shared/kurikulum.js';
import * as R from './rapor.js';
import { tanggalID } from '../generator/prompts.js';

const PRODUK = 'e-rapor';
let projects = lsGet('ad_rapor_projects', []) || []; let curId = lsGet('ad_rapor_cur', null); let school = loadSchool();
const ui = { nilaiMapel: null, tab: 'kehadiran', cetakSiswa: 'all', legerDoc: null };
const P = () => projects.find((p) => p.id === curId) || null;
const syncCloud = debounce(() => { if (session()) cloud.set(PRODUK, 'projects', projects); }, 1800);
function save() { lsSet('ad_rapor_projects', projects); lsSet('ad_rapor_cur', curId); syncCloud(); }
const needProject = () => { if (P()) return false; return true; };
const emptyCard = '<div class="card empty">Belum ada proyek terpilih. Buka menu <b>Proyek Kelas</b> lalu buat atau pilih proyek.</div>';
const opt = (v, t, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;

/* ---------- navigasi ---------- */
const RENDER = { proyek: renderProyek, siswa: renderSiswa, mapel: renderMapel, nilai: renderNilai, karakter: renderKarakter, tambahan: renderTambahan, cetak: renderCetak, leger: renderLeger, sekolah: renderSekolah };
function go(p) {
  $$('.page').forEach((e) => e.classList.toggle('on', e.id === 'p-' + p));
  $$('[data-p]').forEach((b) => b.classList.toggle('on', b.dataset.p === p));
  if (RENDER[p]) RENDER[p](); renderBar(); icons(); window.scrollTo({ top: 0 });
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) go(b.dataset.p); });
$('#btnMore').addEventListener('click', () => {
  const items = [['mapel', 'Mapel dan TP/KD'], ['karakter', P() && P().kur === 'k13' ? 'Sikap' : 'Kokurikuler'], ['tambahan', 'Kehadiran dan Catatan'], ['leger', 'Leger dan Rekap'], ['sekolah', 'Profil Sekolah'], ['api', 'Kunci API (AI)'], ['bantuan', 'Panduan']];
  const d = dialog(`<h3>Menu</h3><div class="stack">${items.map(([k, t]) => `<button class="btn block" data-go="${k}">${t}</button>`).join('')}<a class="btn block ghost" href="../generator/">Generator Perangkat Ajar</a><a class="btn block ghost" href="../">Kembali ke beranda</a></div>`);
  d.el.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) { d.close(); go(b.dataset.go); } });
});
function renderBar() {
  const p = P(); const el = $('#curBar'); $('#lblKarakter').textContent = p && p.kur === 'k13' ? 'Sikap' : 'Kokurikuler';
  el.innerHTML = p ? `<div class="row"><span class="chip acc">${esc(p.nama)}</span><span class="chip">${esc(KURIKULUM[p.kur].singkat)}</span><span class="chip">Semester ${p.semester} ${esc(p.tahunAjaran)}</span><span class="chip">${p.siswa.length} siswa | ${p.mapel.length} mapel</span></div>` : '<span class="muted sm">Belum ada proyek terpilih</span>';
}
const touch = () => { const p = P(); if (p) p.at = Date.now(); save(); };

/* ---------- kuota ---------- */
async function quota(p) { if (p.quotaUsed) return true; const q = await useQuota(PRODUK); if (!q.ok) return false; p.quotaUsed = true; save(); return true; }

/* ---------- proyek ---------- */
function renderProyek() {
  const box = $('#projList');
  box.innerHTML = projects.length ? [...projects].sort((a, b) => b.at - a.at).map((p) => `<div class="pcard ${p.id === curId ? 'on' : ''}"><div><b>${esc(p.nama)}</b> <span class="chip">${esc(KURIKULUM[p.kur].singkat)}</span><div class="muted sm">Semester ${p.semester} ${esc(p.tahunAjaran)} | ${p.siswa.length} siswa | ${p.mapel.length} mapel</div></div><div class="row"><button class="btn sm primary" data-open="${p.id}">${p.id === curId ? 'Sedang dibuka' : 'Buka'}</button><button class="btn sm" data-dup="${p.id}">Salin ke semester lain</button><button class="btn sm ghost danger" data-del="${p.id}">Hapus</button></div></div>`).join('') : '<div class="card empty">Belum ada proyek. Tekan <b>Buat proyek baru</b>.</div>';
}
$('#projList').addEventListener('click', async (e) => {
  const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]'), c = e.target.closest('[data-dup]');
  if (o) { curId = o.dataset.open; ui.nilaiMapel = null; save(); renderProyek(); renderBar(); go('siswa'); }
  if (d && await confirmBox('Hapus proyek ini beserta semua nilainya? Tindakan ini tidak bisa dibatalkan.', 'Hapus')) { projects = projects.filter((x) => x.id !== d.dataset.del); if (curId === d.dataset.del) curId = null; save(); renderProyek(); renderBar(); }
  if (c) { const src = projects.find((x) => x.id === c.dataset.dup); const cp = JSON.parse(JSON.stringify(src)); const n = R.newProject({ ...src, semester: src.semester === 1 ? 2 : 1, nama: '' }); Object.assign(n, { mapel: cp.mapel, siswa: cp.siswa, bobot: cp.bobot, opsi: cp.opsi, wali: cp.wali, waliNip: cp.waliNip, tahunAjaran: cp.tahunAjaran, koku: { tema: '', dimensi: cp.koku.dimensi, data: {}, desc: {} } }); n.nama = `${src.nama} (Semester ${n.semester})`; projects.push(n); curId = n.id; save(); toast('Disalin: siswa dan mapel terbawa, nilai kosong.'); renderProyek(); renderBar(); }
});
$('#btnNew').addEventListener('click', () => newProjectDialog());
function newProjectDialog() {
  const d0 = { kur: 'merdeka', jenjang: 'SD', kelas: 5, semester: 1 }; const st = { ...d0 };
  const d = dialog('<div id="npBox"></div>', { wide: true });
  const draw = () => {
    if (st.kur === 'kbc' && !isMadrasah(st.jenjang)) { st.jenjang = 'MI'; st.kelas = 5; }
    const J = JENJANG[st.jenjang]; if (!J.kelas.includes(+st.kelas)) st.kelas = J.kelas[0];
    $('#npBox', d.el).innerHTML = `<h3>Proyek baru</h3><div class="stack">
    <label>Kurikulum<select data-k="kur">${Object.entries(KURIKULUM).map(([k, v]) => opt(k, v.singkat, st.kur)).join('')}</select></label>
    <div class="grid3"><label>Jenjang<select data-k="jenjang">${Object.keys(JENJANG).filter((j) => st.kur !== 'kbc' || isMadrasah(j)).map((j) => opt(j, j, st.jenjang)).join('')}</select></label>
    <label>Kelas<select data-k="kelas">${J.kelas.map((k) => opt(k, `Kelas ${k} (${ROMAN[k]})`, st.kelas)).join('')}</select></label>
    <label>Rombel (opsional)<input data-k="rombel" value="${esc(st.rombel || '')}" placeholder="Contoh: A"></label></div>
    <div class="grid3"><label>Semester<select data-k="semester">${opt(1, 'Ganjil (1)', st.semester)}${opt(2, 'Genap (2)', st.semester)}</select></label>
    <label>Tahun ajaran<input data-k="tahunAjaran" value="${esc(st.tahunAjaran || school.tahunAjaran || '')}" placeholder="2026/2027"></label><label>Nama wali kelas<input data-k="wali" value="${esc(st.wali || school.guru || '')}"></label></div>
    <label>NIP wali kelas (kosongkan bila tidak ada)<input data-k="waliNip" value="${esc(st.waliNip || school.guruNip || '')}"></label>
    <div class="ad-foot"><button class="btn ghost" data-x="0">Batal</button><button class="btn primary" data-x="1">Buat proyek</button></div></div>`;
  };
  draw();
  d.el.addEventListener('change', (e) => { const k = e.target.dataset.k; if (!k) return; st[k] = e.target.value; if (['kur', 'jenjang'].includes(k)) { const keep = { ...st }; draw(); Object.assign(st, keep); } });
  d.el.addEventListener('input', (e) => { const k = e.target.dataset.k; if (k && ['rombel', 'tahunAjaran', 'wali', 'waliNip'].includes(k)) st[k] = e.target.value; });
  d.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x !== '1') return d.close();
    const f = { ...st, tahunAjaran: st.tahunAjaran || school.tahunAjaran, wali: st.wali ?? school.guru, waliNip: st.waliNip ?? school.guruNip };
    const p = R.newProject(f); const groups = mapelList(p.jenjang, p.kelas, p.kur); defaultMapel(p).forEach((n) => p.mapel.push(R.newMapel(n, p.kur)));
    projects.push(p); curId = p.id; save(); d.close(); toast('Proyek dibuat. Lanjut isi data siswa.'); go('siswa');
  });
}

function defaultMapel(p) {
  const groups = mapelList(p.jenjang, p.kelas, p.kur).filter((g) => /Wajib|Madrasah|Tematik|Mata pelajaran|Kelompok A/i.test(g.grup)); const out = [];
  groups.flatMap((g) => g.items).forEach((n) => { if (/^Pendidikan Agama/.test(n) && !/Islam/.test(n)) return; if (/^Seni (Musik|Teater|Tari)$/.test(n)) return; if (/Tematik/.test(n) && false) return; out.push(n); });
  return out;
}

/* ---------- siswa ---------- */
function renderSiswa() {
  const p = P(); const box = $('#siswaBody'); if (!p) { box.innerHTML = emptyCard; return; }
  box.innerHTML = `<div class="ph"><h1>Data siswa</h1><p>${p.siswa.length} siswa. Ketik langsung pada tabel, atau gunakan impor.</p></div>
  <div class="row" style="margin-bottom:12px"><button class="btn primary sm" id="sAdd"><i data-lucide="user-plus"></i>Tambah siswa</button><button class="btn sm" id="sPaste"><i data-lucide="clipboard-paste"></i>Tempel dari Excel</button><button class="btn sm" id="sImp"><i data-lucide="file-up"></i>Impor Excel/CSV</button><button class="btn sm" id="sTpl"><i data-lucide="file-down"></i>Unduh templat</button><input type="file" id="sFile" accept=".xlsx,.xls,.csv" hidden></div>
  <div class="tbl-wrap grid-wrap"><table class="tbl"><thead><tr><th>No</th><th class="nm">Nama</th><th>NIS</th><th>NISN</th><th>L/P</th><th>Detail</th><th></th></tr></thead><tbody>${p.siswa.map((s, i) => `<tr data-id="${s.id}"><td>${i + 1}</td><td class="nm"><input data-f="nama" value="${esc(s.nama)}" style="min-width:200px"></td><td><input data-f="nis" value="${esc(s.nis)}" style="width:110px"></td><td><input data-f="nisn" value="${esc(s.nisn)}" style="width:130px"></td><td><select data-f="jk"><option value="L" ${s.jk === 'L' ? 'selected' : ''}>L</option><option value="P" ${s.jk === 'P' ? 'selected' : ''}>P</option></select></td><td><button class="btn sm ghost" data-det="${s.id}">Lengkapi</button></td><td><button class="btn sm ghost danger" data-rm="${s.id}">&times;</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Belum ada siswa</td></tr>'}</tbody></table></div>`;
  icons();
  const body = $('tbody', box);
  body.oninput = (e) => { const tr = e.target.closest('tr'); const s = p.siswa.find((x) => x.id === tr.dataset.id); if (s && e.target.dataset.f) { s[e.target.dataset.f] = e.target.value; touch(); } };
  body.onclick = async (e) => {
    const rm = e.target.closest('[data-rm]'), de = e.target.closest('[data-det]');
    if (rm && await confirmBox('Hapus siswa ini beserta nilainya?', 'Hapus')) { p.siswa = p.siswa.filter((x) => x.id !== rm.dataset.rm); touch(); renderSiswa(); renderBar(); }
    if (de) detailSiswa(p.siswa.find((x) => x.id === de.dataset.det));
  };
  $('#sAdd').onclick = () => { p.siswa.push(R.newSiswa()); touch(); renderSiswa(); renderBar(); const inp = $$('tbody tr:last-child input')[0]; inp && inp.focus(); };
  $('#sPaste').onclick = () => {
    const d = dialog(`<h3>Tempel daftar siswa</h3><p class="muted sm">Salin dari Excel dengan kolom berurutan: Nama, NIS, NISN, L/P. Satu siswa per baris.</p><textarea id="pasteTa" style="min-height:200px" placeholder="Ahmad Fauzi&#9;1001&#9;0123456789&#9;L"></textarea><div class="ad-foot"><button class="btn ghost" data-x="0">Batal</button><button class="btn primary" data-x="1">Tambahkan</button></div>`);
    d.el.addEventListener('click', (e) => { const b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === '1') { const n = addRows(p, $('#pasteTa', d.el).value.split(/\r?\n/).map((l) => l.split(/\t|;/))); toast(`${n} siswa ditambahkan.`); renderSiswa(); renderBar(); } d.close(); });
  };
  $('#sImp').onclick = () => $('#sFile').click();
  $('#sFile').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const X = await lib.xlsx(); const wb = X.read(await f.arrayBuffer()); const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false }); const n = addRows(p, rows); toast(`${n} siswa diimpor.`); renderSiswa(); renderBar(); } catch (er) { toast('Berkas tidak bisa dibaca: ' + er.message, 'err'); } e.target.value = ''; };
  $('#sTpl').onclick = async () => { const X = await lib.xlsx(); const ws = X.utils.aoa_to_sheet([['Nama', 'NIS', 'NISN', 'L/P'], ['Contoh Nama Siswa', '1001', '0123456789', 'L']]); ws['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 16 }, { wch: 6 }]; const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Siswa'); downloadBlob(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), 'Templat_Data_Siswa.xlsx'); };
}
function addRows(p, rows) {
  let n = 0; let start = 0; const h = (rows[0] || []).map((x) => String(x || '').toLowerCase()); if (h.some((x) => /^nama/.test(x))) start = 1;
  for (let i = start; i < rows.length; i++) { const r = rows[i]; if (!r || !String(r[0] || '').trim()) continue; const jk = String(r[3] || '').trim().toUpperCase().startsWith('P') ? 'P' : 'L'; if (p.siswa.some((s) => s.nis && String(r[1] || '').trim() && s.nis === String(r[1]).trim())) continue; p.siswa.push(R.newSiswa({ nama: String(r[0]).trim(), nis: String(r[1] || '').trim(), nisn: String(r[2] || '').trim(), jk })); n++; }
  touch(); return n;
}
function detailSiswa(s) {
  const f = (k, l, t = 'text') => `<label>${l}<input data-k="${k}" type="${t}" value="${esc(s[k] || '')}"></label>`;
  const d = dialog(`<h3>${esc(s.nama || 'Siswa')}</h3><div class="grid2">${f('tl', 'Tempat lahir')}${f('tgl', 'Tanggal lahir', 'text')}${f('agama', 'Agama')}${f('ayah', 'Nama ayah')}${f('ibu', 'Nama ibu')}<label class="full">Alamat<input data-k="alamat" value="${esc(s.alamat || '')}"></label></div><p class="muted sm">Dipakai pada halaman identitas peserta didik (opsional).</p><div class="ad-foot"><button class="btn primary" data-x="1">Simpan</button></div>`, { wide: true });
  d.el.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) { $$('[data-k]', d.el).forEach((i) => { s[i.dataset.k] = i.value.trim(); }); touch(); d.close(); } });
}

/* ---------- mapel dan TP ---------- */
const tpToText = (p, m) => m.tp.map((t) => (p.kur === 'k13' ? `${t.kd3} | ${t.kd4}` : t.teks)).join('\n');
function parseTP(p, m, text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean); const old = m.tp;
  m.tp = lines.map((l, i) => { const t = old[i] || R.newTP(); if (p.kur === 'k13') { const [a, b] = l.split('|').map((x) => x.trim()); t.kd3 = a || ''; t.kd4 = b || a || ''; t.teks = t.kd3; } else t.teks = l.replace(/^\d+[.)]\s*/, ''); return t; });
}
function renderMapel() {
  const p = P(); const box = $('#mapelBody'); if (!p) { box.innerHTML = emptyCard; return; }
  const k13 = p.kur === 'k13'; const groups = mapelList(p.jenjang, p.kelas, p.kur); const have = new Set(p.mapel.map((m) => m.nama));
  box.innerHTML = `<div class="ph"><h1>Mata pelajaran dan ${k13 ? 'KD' : 'tujuan pembelajaran'}</h1><p>${k13 ? 'Satu baris = satu pasangan KD: "3.1 KD pengetahuan | 4.1 KD keterampilan". Tiap baris menjadi satu kolom nilai.' : 'Satu baris = satu tujuan pembelajaran (TP) atau lingkup materi yang dinilai sumatif. Tiap baris menjadi satu kolom nilai.'}</p></div>
  <div class="card"><div class="row"><select id="addM" style="flex:1;min-width:220px">${groups.map((g) => `<optgroup label="${esc(g.grup)}">${g.items.filter((i) => !have.has(i)).map((i) => opt(i, i)).join('')}</optgroup>`).join('')}</select><button class="btn" id="addMb">Tambah mapel</button><input id="addC" placeholder="atau tulis mapel lain" style="flex:1;min-width:180px"><button class="btn" id="addCb">Tambah</button></div>
  ${k13 ? '' : `<div class="row" style="margin-top:12px"><label style="max-width:230px">Bobot rata-rata sumatif lingkup<input type="number" id="bL" min="0" max="100" value="${p.bobot.lingkup}"></label><label style="max-width:230px">Bobot sumatif akhir semester<input type="number" id="bS" min="0" max="100" value="${p.bobot.sas}"></label><div class="hint" style="max-width:360px">Nilai akhir = (rata-rata sumatif lingkup x bobot + SAS x bobot) / jumlah bobot. Sesuaikan dengan kebijakan sekolah.</div></div>`}</div>
  ${p.mapel.map((m, i) => `<div class="mcard" data-m="${m.id}"><div class="row between"><b>${i + 1}. ${esc(m.nama)}</b><div class="row"><button class="btn sm ghost" data-up="${m.id}" aria-label="Naik">&uarr;</button><button class="btn sm ghost" data-dn="${m.id}" aria-label="Turun">&darr;</button><button class="btn sm" data-ai="${m.id}"><i data-lucide="sparkles"></i>Bantu isi dengan AI</button><button class="btn sm ghost danger" data-rm="${m.id}">Hapus</button></div></div>
  <div class="row" style="margin:10px 0"><label style="max-width:200px">${k13 ? 'KKM' : 'KKTP (batas tuntas)'}<input type="number" min="0" max="100" data-kk value="${m.kktp}"></label></div>
  <label>${k13 ? 'Daftar KD' : 'Daftar TP / lingkup materi'}<textarea data-tp placeholder="${k13 ? '3.1 Menjelaskan ... | 4.1 Menyajikan ...' : 'Menjelaskan konsep pecahan senilai\nMenyelesaikan masalah penjumlahan pecahan'}">${esc(tpToText(p, m))}</textarea></label></div>`).join('')}`;
  icons();
  $('#addMb').onclick = () => { const v = $('#addM').value; if (v) { p.mapel.push(R.newMapel(v, p.kur)); touch(); renderMapel(); renderBar(); } };
  $('#addCb').onclick = () => { const v = $('#addC').value.trim(); if (v) { p.mapel.push(R.newMapel(v, p.kur)); touch(); renderMapel(); renderBar(); } };
  if (!k13) { $('#bL').onchange = () => { p.bobot.lingkup = Math.max(0, +$('#bL').value || 0); touch(); }; $('#bS').onchange = () => { p.bobot.sas = Math.max(0, +$('#bS').value || 0); touch(); }; }
  box.onchange = (e) => { const c = e.target.closest('.mcard'); if (!c) return; const m = p.mapel.find((x) => x.id === c.dataset.m); if (e.target.matches('[data-kk]')) { m.kktp = Math.max(0, Math.min(100, +e.target.value || 0)); touch(); } if (e.target.matches('[data-tp]')) { parseTP(p, m, e.target.value); touch(); } };
  box.onclick = async (e) => {
    const g = (a) => { const b = e.target.closest(a); return b ? p.mapel.findIndex((x) => x.id === b.dataset[a.slice(6, -1)]) : -1; };
    const rm = e.target.closest('[data-rm]'), up = e.target.closest('[data-up]'), dn = e.target.closest('[data-dn]'), ai = e.target.closest('[data-ai]');
    if (rm && await confirmBox('Hapus mata pelajaran ini beserta nilainya?', 'Hapus')) { p.mapel = p.mapel.filter((x) => x.id !== rm.dataset.rm); touch(); renderMapel(); renderBar(); }
    if (up || dn) { const i = p.mapel.findIndex((x) => x.id === (up || dn).dataset[up ? 'up' : 'dn']); const j = up ? i - 1 : i + 1; if (j >= 0 && j < p.mapel.length) { [p.mapel[i], p.mapel[j]] = [p.mapel[j], p.mapel[i]]; touch(); renderMapel(); } }
    if (ai) aiTP(p, p.mapel.find((x) => x.id === ai.dataset.ai));
  };
}
async function aiTP(p, m) {
  if (!(await quota(p))) return; const k13 = p.kur === 'k13'; const ui2 = busy('AI menyusun daftar...');
  try {
    const prompt = `Susun daftar ${k13 ? 'pasangan Kompetensi Dasar (KD pengetahuan dan KD keterampilan) Kurikulum 2013' : 'tujuan pembelajaran (TP) per lingkup materi Kurikulum Merdeka Fase ' + faseOf(p.kelas)} untuk mata pelajaran ${m.nama}, ${p.jenjang} kelas ${p.kelas}, semester ${p.semester}. Beri 5 sampai 8 butir yang realistis dan berurutan. ${k13 ? 'Pakai KD resmi sesuai nomor (3.x dan 4.x).' : 'Tiap TP satu kalimat dimulai "Peserta didik dapat ...".'} Keluarkan JSON saja: ${k13 ? '{"daftar":[{"kd3":"3.1 ...","kd4":"4.1 ..."}]}' : '{"daftar":["..."]}'}`;
    const j = await aiJSON({ system: 'Kamu guru senior penyusun perangkat ajar Indonesia. Jawab hanya JSON valid, teks polos tanpa markdown, bahasa Indonesia baku.', parts: [{ text: prompt }], maxTokens: 6000, produk: PRODUK });
    const arr = Array.isArray(j.daftar) ? j.daftar : []; if (!arr.length) throw new Error('AI tidak mengembalikan daftar.');
    m.tp = arr.map((x, i) => { const t = m.tp[i] || R.newTP(); if (k13) { t.kd3 = String(x.kd3 || ''); t.kd4 = String(x.kd4 || x.kd3 || ''); t.teks = t.kd3; } else t.teks = String(x).replace(/\*\*/g, ''); return t; });
    touch(); ui2.done(); renderMapel(); toast('Daftar terisi. Periksa dan sesuaikan dengan dokumen sekolah.');
  } catch (e) { ui2.done(); toast(e.message || 'AI gagal.', 'err', 6000); }
}

/* ---------- nilai ---------- */
function gridFields(p, m) {
  const k13 = p.kur === 'k13'; const f = [];
  m.tp.forEach((t, i) => f.push({ key: 'tp:' + t.id, label: (k13 ? 'P' : 'TP') + (i + 1), title: (k13 ? t.kd3 : t.teks) }));
  if (k13) { f.push({ key: 'pts', label: 'PTS' }, { key: 'pas', label: 'PAS' }); m.tp.forEach((t, i) => f.push({ key: 'kp:' + t.id, label: 'K' + (i + 1), title: t.kd4 })); } else f.push({ key: 'sas', label: 'SAS', title: 'Sumatif akhir semester' });
  return f;
}
const getV = (p, sid, mid, key) => { const c = R.cell(p, sid, mid); if (key.startsWith('tp:')) return (c.tp || {})[key.slice(3)]; if (key.startsWith('kp:')) return (c.kp || {})[key.slice(3)]; return c[key]; };
function setV(p, sid, mid, key, v) { p.nilai[sid] = p.nilai[sid] || {}; const c = (p.nilai[sid][mid] = p.nilai[sid][mid] || {}); if (key.startsWith('tp:')) { c.tp = c.tp || {}; c.tp[key.slice(3)] = v; } else if (key.startsWith('kp:')) { c.kp = c.kp || {}; c.kp[key.slice(3)] = v; } else c[key] = v; }
function calcCells(p, m, sid) { if (p.kur === 'k13') { const n = R.nilaiK13(p, sid, m); return { np: n.np, nk: n.nk }; } return { na: R.nilaiAkhir(p, sid, m) }; }
function renderNilai() {
  const p = P(); const box = $('#nilaiBody'); if (!p) { box.innerHTML = emptyCard; return; }
  if (!p.mapel.length) { box.innerHTML = '<div class="card empty">Tambahkan mata pelajaran terlebih dahulu di menu Mapel dan TP/KD.</div>'; return; }
  if (!p.mapel.find((m) => m.id === ui.nilaiMapel)) ui.nilaiMapel = p.mapel[0].id; const m = p.mapel.find((x) => x.id === ui.nilaiMapel); const k13 = p.kur === 'k13'; const F = gridFields(p, m);
  const warn = !m.tp.length ? '<div class="note info" style="margin-bottom:10px">Mapel ini belum punya daftar TP/KD. Isi dulu di menu Mapel dan TP/KD agar deskripsi capaian tersusun.</div>' : '';
  box.innerHTML = `<div class="ph"><h1>Input nilai</h1><p>Ketik angka 0 sampai 100. Tempel dari Excel juga bisa: pilih sel awal lalu Ctrl+V. Panah atas/bawah atau Enter pindah baris.</p></div>${warn}
  <div class="row" style="margin-bottom:12px"><select id="nmSel" style="max-width:340px">${p.mapel.map((x) => opt(x.id, x.nama, m.id)).join('')}</select><button class="btn sm" id="nTpl"><i data-lucide="file-down"></i>Templat Excel</button><button class="btn sm" id="nImp"><i data-lucide="file-up"></i>Impor Excel</button><input type="file" id="nFile" accept=".xlsx,.xls" hidden><button class="btn sm ghost" id="nClr">Kosongkan mapel ini</button></div>
  <div class="tbl-wrap grid-wrap"><table class="tbl" id="grid"><thead><tr><th>No</th><th class="nm">Nama</th>${F.map((x) => `<th title="${esc(x.title || '')}">${x.label}</th>`).join('')}${k13 ? '<th>NA Pengetahuan</th><th>NA Keterampilan</th>' : '<th>Nilai Akhir</th>'}</tr></thead><tbody>${p.siswa.map((s, ri) => { const cc = calcCells(p, m, s.id); return `<tr data-s="${s.id}"><td>${ri + 1}</td><td class="nm" title="${esc(s.nama)}">${esc(s.nama)}</td>${F.map((x, ci) => `<td><input class="num" inputmode="decimal" data-r="${ri}" data-c="${ci}" data-k="${x.key}" value="${esc(getV(p, s.id, m.id, x.key) ?? '')}"></td>`).join('')}${k13 ? `<td class="calc" data-na="np">${cc.np ?? ''}</td><td class="calc" data-na="nk">${cc.nk ?? ''}</td>` : `<td class="calc" data-na="na">${cc.na ?? ''}</td>`}</tr>`; }).join('')}</tbody></table></div>
  <p class="hint">${k13 ? 'NA pengetahuan = (2 x rata-rata P + PTS + PAS) / 4. NA keterampilan = rata-rata K. KKM mapel ini: ' + m.kktp : `Nilai akhir = rata-rata TP (bobot ${p.bobot.lingkup}) dan SAS (bobot ${p.bobot.sas}). KKTP mapel ini: ${m.kktp}`}.</p>`;
  icons();
  $('#nmSel').onchange = (e) => { ui.nilaiMapel = e.target.value; renderNilai(); };
  const grid = $('#grid');
  const refresh = (tr) => { const cc = calcCells(p, m, tr.dataset.s); $$('[data-na]', tr).forEach((td) => { const v = cc[td.dataset.na]; td.textContent = v ?? ''; td.style.color = v != null && v < m.kktp ? '#fca5a5' : ''; }); };
  $$('tbody tr', grid).forEach(refresh);
  grid.addEventListener('input', (e) => { const i = e.target; if (!i.dataset.k) return; const v = i.value.replace(',', '.'); const n = R.num(v); i.classList.toggle('bad', v !== '' && (n == null || n < 0 || n > 100)); const tr = i.closest('tr'); setV(p, tr.dataset.s, m.id, i.dataset.k, v === '' || n == null || n < 0 || n > 100 ? '' : String(n)); refresh(tr); touch(); });
  grid.addEventListener('keydown', (e) => { const i = e.target; if (!i.dataset.k) return; const r = +i.dataset.r, c = +i.dataset.c; let t = null; if (e.key === 'Enter' || e.key === 'ArrowDown') t = [r + 1, c]; else if (e.key === 'ArrowUp') t = [r - 1, c]; else if (e.key === 'ArrowRight' && i.selectionStart === i.value.length) t = [r, c + 1]; else if (e.key === 'ArrowLeft' && i.selectionStart === 0) t = [r, c - 1]; if (t) { const n = $(`input[data-r="${t[0]}"][data-c="${t[1]}"]`, grid); if (n) { e.preventDefault(); n.focus(); n.select(); } } });
  grid.addEventListener('paste', (e) => { const i = e.target; if (!i.dataset.k) return; const txt = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\t\n]/.test(txt.trim())) return; e.preventDefault(); const rows = txt.replace(/\r/g, '').trimEnd().split('\n').map((l) => l.split('\t')); const r0 = +i.dataset.r, c0 = +i.dataset.c; rows.forEach((row, dr) => row.forEach((val, dc) => { const inp = $(`input[data-r="${r0 + dr}"][data-c="${c0 + dc}"]`, grid); if (inp) { inp.value = val.trim().replace(',', '.'); inp.dispatchEvent(new Event('input', { bubbles: true })); } })); });
  $('#nClr').onclick = async () => { if (await confirmBox(`Kosongkan semua nilai ${m.nama}?`, 'Kosongkan')) { p.siswa.forEach((s) => { if (p.nilai[s.id]) delete p.nilai[s.id][m.id]; }); touch(); renderNilai(); } };
  $('#nTpl').onclick = () => exportTemplate(p);
  $('#nImp').onclick = () => $('#nFile').click();
  $('#nFile').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const n = await importNilai(p, f); toast(`${n} nilai diimpor.`); renderNilai(); } catch (er) { toast('Impor gagal: ' + er.message, 'err', 6000); } e.target.value = ''; };
}
const sheetName = (s, used) => { let n = String(s).replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Mapel'; let k = n, i = 2; while (used.has(k)) k = n.slice(0, 26) + ' ' + i++; used.add(k); return k; };
async function exportTemplate(p) {
  const X = await lib.xlsx(); const wb = X.utils.book_new(); const used = new Set();
  p.mapel.forEach((m) => { const F = gridFields(p, m); const aoa = [['NIS', 'Nama', ...F.map((x) => x.label)], ...p.siswa.map((s) => [s.nis, s.nama, ...F.map((x) => { const v = getV(p, s.id, m.id, x.key); return v === undefined || v === '' ? '' : Number(v); })])]; const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 12 }, { wch: 30 }, ...F.map(() => ({ wch: 7 }))]; X.utils.book_append_sheet(wb, ws, sheetName(m.nama, used)); });
  downloadBlob(new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })]), `Templat_Nilai_${safeName(p.nama)}.xlsx`);
}
async function importNilai(p, file) {
  const X = await lib.xlsx(); const wb = X.read(await file.arrayBuffer()); let n = 0; const used = new Set(); const names = p.mapel.map((m) => sheetName(m.nama, used));
  p.mapel.forEach((m, mi) => {
    const sn = wb.SheetNames.includes(names[mi]) ? names[mi] : wb.SheetNames[mi]; if (!sn) return; const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' }); const F = gridFields(p, m);
    rows.slice(1).forEach((r) => { const s = p.siswa.find((x) => (x.nis && String(r[0]).trim() === String(x.nis).trim()) || String(r[1]).trim().toLowerCase() === x.nama.trim().toLowerCase()); if (!s) return; F.forEach((x, ci) => { const raw = r[2 + ci]; const v = R.num(raw); if (v != null && v >= 0 && v <= 100) { setV(p, s.id, m.id, x.key, String(v)); n++; } }); });
  });
  touch(); return n;
}

/* ---------- sikap / kokurikuler ---------- */
function renderKarakter() {
  const p = P(); const box = $('#karakterBody'); if (!p) { box.innerHTML = emptyCard; return; }
  if (p.kur === 'k13') {
    const sel = (cur, list, ph) => `<option value="">${ph}</option>${list.map((x) => opt(x, x, cur)).join('')}`;
    box.innerHTML = `<div class="ph"><h1>Penilaian sikap</h1><p>Pilih predikat, hal yang menonjol, dan yang perlu ditingkatkan. Deskripsi tersusun otomatis pada rapor.</p></div><div class="row" style="margin-bottom:10px"><button class="btn sm" data-fill="SB">Isi semua Baik</button></div>
    <div class="tbl-wrap grid-wrap"><table class="tbl"><thead><tr><th>No</th><th class="nm">Nama</th><th>Spiritual</th><th>Menonjol</th><th>Perlu ditingkatkan</th><th>Sosial</th><th>Menonjol</th><th>Perlu ditingkatkan</th></tr></thead><tbody>${p.siswa.map((s, i) => { const k = p.sikap[s.id] || {}; const pr = (key, v) => `<select data-s="${s.id}" data-f="${key}"><option value="">-</option>${Object.entries(R.SKALA).map(([a, b]) => opt(a, b, v)).join('')}</select>`; const as = (key, list, v) => `<select data-s="${s.id}" data-f="${key}">${sel(v, list, '-')}</select>`; return `<tr><td>${i + 1}</td><td class="nm">${esc(s.nama)}</td><td>${pr('sp', k.sp)}</td><td>${as('spMenonjol', R.ASPEK_SPIRITUAL, k.spMenonjol)}</td><td>${as('spPerlu', R.ASPEK_SPIRITUAL, k.spPerlu)}</td><td>${pr('so', k.so)}</td><td>${as('soMenonjol', R.ASPEK_SOSIAL, k.soMenonjol)}</td><td>${as('soPerlu', R.ASPEK_SOSIAL, k.soPerlu)}</td></tr>`; }).join('')}</tbody></table></div>`;
    box.onchange = (e) => { const t = e.target; if (!t.dataset.f) return; p.sikap[t.dataset.s] = p.sikap[t.dataset.s] || {}; p.sikap[t.dataset.s][t.dataset.f] = t.value; touch(); };
    box.onclick = (e) => { if (e.target.closest('[data-fill]')) { p.siswa.forEach((s) => { p.sikap[s.id] = { ...(p.sikap[s.id] || {}), sp: p.sikap[s.id]?.sp || 'B', so: p.sikap[s.id]?.so || 'B' }; }); touch(); renderKarakter(); } };
    return;
  }
  const k = p.koku; const dims = DIMENSI_LULUSAN.map((d) => d.s);
  box.innerHTML = `<div class="ph"><h1>Kokurikuler</h1><p>Isi tema dan pilih dimensi yang dinilai pada semester ini, lalu beri capaian tiap siswa (SB, B, C, K). Narasi rapor tersusun otomatis dan bisa diubah.</p></div>
  <div class="card"><label>Tema atau judul kegiatan kokurikuler${p.kur === 'kbc' ? ' (sertakan topik Panca Cinta)' : ''}<input id="kTema" value="${esc(k.tema)}" placeholder="${p.kur === 'kbc' ? 'Contoh: Kebun Madrasah Kami (Cinta Lingkungan)' : 'Contoh: Gerakan Sekolah Bersih'}"></label>
  <label style="margin-top:10px">Dimensi yang dinilai</label><div class="pick" id="kDim">${dims.map((d) => `<label><input type="checkbox" value="${esc(d)}" ${k.dimensi.includes(d) ? 'checked' : ''}>${esc(d)}</label>`).join('')}</div></div>
  ${k.dimensi.length ? `<div class="row" style="margin:12px 0"><button class="btn sm" data-fill="B">Isi semua B (berkembang sesuai harapan)</button><span class="hint">SB sangat berkembang, B berkembang sesuai harapan, C cukup berkembang, K mulai berkembang</span></div>
  <div class="tbl-wrap grid-wrap"><table class="tbl"><thead><tr><th>No</th><th class="nm">Nama</th>${k.dimensi.map((d) => `<th>${esc(d)}</th>`).join('')}<th>Narasi rapor</th></tr></thead><tbody>${p.siswa.map((s, i) => `<tr data-s="${s.id}"><td>${i + 1}</td><td class="nm">${esc(s.nama)}</td>${k.dimensi.map((d) => `<td><select data-d="${esc(d)}"><option value="">-</option>${['SB', 'B', 'C', 'K'].map((x) => opt(x, x, (k.data[s.id] || {})[d])).join('')}</select></td>`).join('')}<td><textarea data-desc placeholder="${esc(R.kokuText(p, s.id))}">${esc((k.desc || {})[s.id] || '')}</textarea></td></tr>`).join('')}</tbody></table></div>` : '<div class="note info" style="margin-top:12px">Pilih minimal satu dimensi untuk mulai menilai.</div>'}`;
  $('#kTema').oninput = (e) => { k.tema = e.target.value; touch(); };
  $('#kDim').onchange = () => { k.dimensi = $$('#kDim input:checked').map((i) => i.value); touch(); renderKarakter(); };
  box.onchange = (e) => { const t = e.target; if (t.dataset.d) { const sid = t.closest('tr').dataset.s; k.data[sid] = k.data[sid] || {}; k.data[sid][t.dataset.d] = t.value; touch(); const ta = $('[data-desc]', t.closest('tr')); ta.placeholder = R.kokuText(p, sid); } };
  box.oninput = (e) => { if (e.target.matches('[data-desc]')) { k.desc = k.desc || {}; k.desc[e.target.closest('tr').dataset.s] = e.target.value; touch(); } };
  box.onclick = (e) => { const f = e.target.closest('[data-fill]'); if (f) { p.siswa.forEach((s) => { k.data[s.id] = k.data[s.id] || {}; k.dimensi.forEach((d) => { if (!k.data[s.id][d]) k.data[s.id][d] = f.dataset.fill; }); }); touch(); renderKarakter(); } };
}

/* ---------- kehadiran, ekskul, catatan ---------- */
function renderTambahan() {
  const p = P(); const box = $('#tambahanBody'); if (!p) { box.innerHTML = emptyCard; return; }
  const tabs = [['kehadiran', 'Kehadiran'], ['ekskul', 'Ekstrakurikuler'], ['catatan', 'Catatan wali kelas'], ...(p.kur === 'k13' ? [['prestasi', 'Prestasi']] : []), ...(p.semester === 2 ? [['kenaikan', 'Kenaikan kelas']] : [])];
  if (!tabs.find((t) => t[0] === ui.tab)) ui.tab = 'kehadiran';
  let body = '';
  if (ui.tab === 'kehadiran') body = `<div class="tbl-wrap grid-wrap"><table class="tbl"><thead><tr><th>No</th><th class="nm">Nama</th><th>Sakit</th><th>Izin</th><th>Tanpa keterangan</th></tr></thead><tbody>${p.siswa.map((s, i) => { const a = p.absen[s.id] || {}; return `<tr data-s="${s.id}"><td>${i + 1}</td><td class="nm">${esc(s.nama)}</td>${['s', 'i', 'a'].map((k) => `<td><input class="num" type="number" min="0" data-a="${k}" value="${a[k] ?? ''}"></td>`).join('')}</tr>`; }).join('')}</tbody></table></div>`;
  if (ui.tab === 'ekskul') body = `<datalist id="ekList">${['Pramuka', 'Paskibra', 'PMR', 'Seni Tari', 'Seni Musik', 'Futsal', 'Bola Voli', 'Bulu Tangkis', 'Pencak Silat', 'Tahfiz Al-Qur\'an', 'Hadrah', 'Dokter Kecil', 'KIR', 'Olimpiade Sains', 'Bahasa Inggris'].map((x) => `<option value="${esc(x)}">`).join('')}</datalist><div class="tbl-wrap grid-wrap"><table class="tbl"><thead><tr><th>No</th><th class="nm">Nama</th><th>Ekskul 1</th><th>Predikat</th><th>Ekskul 2</th><th>Predikat</th></tr></thead><tbody>${p.siswa.map((s, i) => { const e = p.ekskul[s.id] || []; return `<tr data-s="${s.id}"><td>${i + 1}</td><td class="nm">${esc(s.nama)}</td>${[0, 1].map((n) => `<td><input list="ekList" data-e="${n}" data-f="nama" value="${esc((e[n] || {}).nama || '')}" style="min-width:150px"></td><td><select data-e="${n}" data-f="p">${['SB', 'B', 'C', 'K'].map((x) => opt(x, x, (e[n] || {}).p || 'B')).join('')}</select></td>`).join('')}</tr>`; }).join('')}</tbody></table></div>`;
  if (ui.tab === 'catatan') body = `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="auto">Isi otomatis dari nilai</button><button class="btn sm" data-act="ai"><i data-lucide="sparkles"></i>Susun dengan AI</button><span class="hint">Kolom kosong tetap memakai catatan otomatis saat dicetak.</span></div><div class="tbl-wrap grid-wrap"><table class="tbl"><thead><tr><th>No</th><th class="nm">Nama</th><th>Catatan wali kelas</th></tr></thead><tbody>${p.siswa.map((s, i) => `<tr data-s="${s.id}"><td>${i + 1}</td><td class="nm">${esc(s.nama)}</td><td><textarea data-c placeholder="${esc(R.catatanOtomatis(p, s.id))}">${esc(p.catatan[s.id] || '')}</textarea></td></tr>`).join('')}</tbody></table></div>`;
  if (ui.tab === 'prestasi') body = `<div class="tbl-wrap grid-wrap"><table class="tbl"><thead><tr><th>No</th><th class="nm">Nama</th><th>Jenis prestasi</th><th>Keterangan</th></tr></thead><tbody>${p.siswa.map((s, i) => { const x = (p.prestasi[s.id] || [])[0] || {}; return `<tr data-s="${s.id}"><td>${i + 1}</td><td class="nm">${esc(s.nama)}</td><td><input data-pr="jenis" value="${esc(x.jenis || '')}" placeholder="Akademik/Olahraga/Seni"></td><td><input data-pr="ket" value="${esc(x.ket || '')}" style="min-width:260px"></td></tr>`; }).join('')}</tbody></table></div>`;
  if (ui.tab === 'kenaikan') body = `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="kn">Isi otomatis (naik bila nilai terisi dan rata-rata di atas batas)</button></div><div class="tbl-wrap grid-wrap"><table class="tbl"><thead><tr><th>No</th><th class="nm">Nama</th><th>Rata-rata</th><th>Keputusan</th></tr></thead><tbody>${p.siswa.map((s, i) => { const r = R.rataSiswa(p, s.id); return `<tr data-s="${s.id}"><td>${i + 1}</td><td class="nm">${esc(s.nama)}</td><td class="calc">${r == null ? '' : r.toFixed(1)}</td><td><select data-kn><option value="">-</option>${opt('naik', 'Naik kelas', p.kenaikan[s.id])}${opt('tinggal', 'Tinggal kelas', p.kenaikan[s.id])}</select></td></tr>`; }).join('')}</tbody></table></div>`;
  box.innerHTML = `<div class="ph"><h1>Kehadiran dan catatan</h1><p>Lengkapi data pendukung rapor.</p></div><div class="docs-tabs">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${ui.tab === k ? 'on' : ''}">${t}</button>`).join('')}</div>${body}`; icons();
  box.onclick = async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { ui.tab = t.dataset.tab; renderTambahan(); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'auto') { p.siswa.forEach((s) => { if (!p.catatan[s.id]) p.catatan[s.id] = R.catatanOtomatis(p, s.id); }); touch(); renderTambahan(); }
    if (a.dataset.act === 'kn') { p.siswa.forEach((s) => { const r = R.rataSiswa(p, s.id); if (r != null) p.kenaikan[s.id] = r >= (p.mapel.length ? Math.min(...p.mapel.map((m) => m.kktp)) : 70) - 5 ? 'naik' : 'tinggal'; }); touch(); renderTambahan(); }
    if (a.dataset.act === 'ai') aiCatatan(p);
  };
  box.oninput = (e) => { const t = e.target; const tr = t.closest('tr'); if (!tr) return; const sid = tr.dataset.s;
    if (t.dataset.a) { p.absen[sid] = p.absen[sid] || {}; p.absen[sid][t.dataset.a] = Math.max(0, parseInt(t.value) || 0); touch(); }
    if (t.dataset.c !== undefined) { p.catatan[sid] = t.value; touch(); }
    if (t.dataset.pr) { p.prestasi[sid] = p.prestasi[sid] || [{}]; p.prestasi[sid][0][t.dataset.pr] = t.value; touch(); }
    if (t.dataset.e !== undefined && t.dataset.f === 'nama') { p.ekskul[sid] = p.ekskul[sid] || []; p.ekskul[sid][+t.dataset.e] = p.ekskul[sid][+t.dataset.e] || { p: 'B' }; p.ekskul[sid][+t.dataset.e].nama = t.value; touch(); } };
  box.onchange = (e) => { const t = e.target; const tr = t.closest('tr'); if (!tr) return; const sid = tr.dataset.s;
    if (t.dataset.kn !== undefined) { p.kenaikan[sid] = t.value; touch(); }
    if (t.dataset.e !== undefined && t.dataset.f === 'p') { p.ekskul[sid] = p.ekskul[sid] || []; p.ekskul[sid][+t.dataset.e] = p.ekskul[sid][+t.dataset.e] || { nama: '' }; p.ekskul[sid][+t.dataset.e].p = t.value; touch(); } };
}
async function aiCatatan(p) {
  if (!(await quota(p))) return; const u = busy('AI menyusun catatan...'); const rows = p.siswa.map((s) => ({ id: s.id, nama: s.nama, rata: (R.rataSiswa(p, s.id) || 0).toFixed(0), kurang: p.mapel.filter((m) => { const n = p.kur === 'k13' ? R.nilaiK13(p, s.id, m).np : R.nilaiAkhir(p, s.id, m); return n != null && n < m.kktp; }).map((m) => m.nama), alpa: (p.absen[s.id] || {}).a || 0 }));
  try {
    for (let i = 0; i < rows.length; i += 15) {
      u.text('AI menyusun catatan...', `${Math.min(i + 15, rows.length)} dari ${rows.length} siswa`);
      const chunk = rows.slice(i, i + 15);
      const j = await aiJSON({ system: 'Kamu wali kelas berpengalaman di Indonesia. Tulis catatan rapor yang hangat, spesifik, dan natural, seperti ditulis guru sungguhan. Satu sampai dua kalimat per siswa, bahasa Indonesia baku, tanpa markdown, tanpa klise berlebihan, tiap catatan berbeda. Jawab hanya JSON.', parts: [{ text: `Data siswa (rata = rata-rata nilai, kurang = mapel di bawah KKM, alpa = hari tanpa keterangan):\n${JSON.stringify(chunk)}\nKeluarkan JSON: {"catatan":[{"id":"...","teks":"..."}]}` }], maxTokens: 8000, produk: PRODUK });
      (j.catatan || []).forEach((c) => { if (c.id && c.teks && p.siswa.some((s) => s.id === c.id)) p.catatan[c.id] = String(c.teks).replace(/\*\*/g, '').trim(); });
    }
    touch(); u.done(); renderTambahan(); toast('Catatan tersusun. Periksa sebelum dicetak.');
  } catch (e) { u.done(); toast(e.message || 'AI gagal.', 'err', 6000); }
}

/* ---------- cetak rapor ---------- */
function completeness(p) {
  const w = []; const k13 = p.kur === 'k13';
  if (!p.siswa.length) w.push('Belum ada siswa.'); if (!p.mapel.length) w.push('Belum ada mata pelajaran.');
  p.mapel.forEach((m) => { const miss = p.siswa.filter((s) => (k13 ? R.nilaiK13(p, s.id, m).np == null : R.nilaiAkhir(p, s.id, m) == null)).length; if (miss) w.push(`${m.nama}: ${miss} siswa belum ada nilai.`); if (!m.tp.length) w.push(`${m.nama}: daftar ${k13 ? 'KD' : 'TP'} kosong, deskripsi capaian tidak akan muncul.`); });
  if (!school.nama) w.push('Profil sekolah belum diisi.'); if (!p.wali) w.push('Nama wali kelas belum diisi.'); if (!school.kepsek) w.push('Nama kepala sekolah belum diisi.');
  if (p.kur !== 'k13' && !p.koku.dimensi.length) w.push('Kokurikuler belum diisi (bagian B rapor akan kosong).');
  return w;
}
function renderCetak() {
  const p = P(); const box = $('#cetakBody'); if (!p) { box.innerHTML = emptyCard; return; } school = loadSchool();
  if (ui.cetakSiswa !== 'all' && !p.siswa.find((s) => s.id === ui.cetakSiswa)) ui.cetakSiswa = p.siswa[0] ? p.siswa[0].id : 'all'; const pv = ui.cetakSiswa === 'all' ? p.siswa[0] : p.siswa.find((s) => s.id === ui.cetakSiswa); const w = completeness(p);
  box.innerHTML = `<div class="ph"><h1>Cetak rapor</h1><p>Pratinjau satu siswa, lalu unduh atau cetak untuk seluruh kelas.</p></div>
  ${w.length ? `<div class="note info" style="margin-bottom:12px"><b>Perlu dilengkapi:</b><ul class="warn-list">${w.slice(0, 10).map((x) => `<li>${esc(x)}</li>`).join('')}${w.length > 10 ? `<li>dan ${w.length - 10} lainnya</li>` : ''}</ul></div>` : ''}
  <div class="card"><div class="grid4"><label>Tanggal rapor<input id="oTgl" value="${esc(p.tanggal || tanggalID())}"></label><label>Pratinjau siswa<select id="oSis">${p.siswa.map((s) => opt(s.id, s.nama, ui.cetakSiswa === s.id ? s.id : pv && pv.id)).join('')}</select></label>
  <label style="display:flex;gap:8px;align-items:center;margin-top:24px"><input type="checkbox" id="oKop" ${p.opsi.kop ? 'checked' : ''}>Tampilkan kop sekolah</label><label style="display:flex;gap:8px;align-items:center;margin-top:24px"><input type="checkbox" id="oId" ${p.opsi.identitas ? 'checked' : ''}>Sertakan halaman identitas</label></div></div>
  <div class="toolbar"><button class="btn primary sm" data-x="pdf"><i data-lucide="file-down"></i>PDF satu kelas</button><button class="btn sm" data-x="docx"><i data-lucide="file-type-2"></i>Word satu kelas</button><button class="btn sm" data-x="print"><i data-lucide="printer"></i>Cetak satu kelas</button><button class="btn ghost sm" data-x="zip"><i data-lucide="archive"></i>ZIP PDF per siswa</button><button class="btn ghost sm" data-x="one"><i data-lucide="file"></i>PDF siswa ini</button></div>
  <div class="paperwrap"><div class="paper" id="paper">${pv ? Doc.toHTML(R.docRapor(p, school, pv)) : '<div class="empty">Belum ada siswa.</div>'}</div></div>`; icons(); fitPaper();
  $('#oTgl').onchange = (e) => { p.tanggal = e.target.value; touch(); renderCetak(); };
  $('#oSis').onchange = (e) => { ui.cetakSiswa = e.target.value; renderCetak(); };
  $('#oKop').onchange = (e) => { p.opsi.kop = e.target.checked; touch(); renderCetak(); };
  $('#oId').onchange = (e) => { p.opsi.identitas = e.target.checked; touch(); renderCetak(); };
}
function fitPaper() { const pw = $('.page.on .paperwrap'), pp = $('.page.on .paper'); if (!pw || !pp) return; pp.style.zoom = ''; const k = Math.min(1, (pw.clientWidth - 24) / pp.offsetWidth); if (k < 1) pp.style.zoom = k.toFixed(3); }
window.addEventListener('resize', fitPaper);
const dopt = (p, school, land = false) => ({ landscape: land, title: 'Rapor ' + p.nama, author: p.wali || 'Arif Digital', font: 'Times New Roman', size: 11 });
$('#cetakBody').addEventListener('click', async (e) => {
  const x = e.target.closest('[data-x]'); if (!x) return; const p = P(); if (!p || !p.siswa.length) return toast('Belum ada siswa.', 'err');
  if (!(await quota(p))) return; school = loadSchool(); const u = busy('Menyiapkan rapor...');
  try {
    const nm = `Rapor_${safeName(p.nama)}`;
    if (x.dataset.x === 'pdf') downloadBlob(await Doc.toPdfBlob(R.docRaporKelas(p, school), dopt(p, school)), nm + '.pdf');
    else if (x.dataset.x === 'docx') downloadBlob(await Doc.toDocx(R.docRaporKelas(p, school), dopt(p, school)), nm + '.docx');
    else if (x.dataset.x === 'print') { const tmp = document.createElement('div'); tmp.innerHTML = Doc.toHTML(R.docRaporKelas(p, school)); u.done(); Doc.print(tmp.firstElementChild, { title: nm }); return; }
    else if (x.dataset.x === 'one') { const s = p.siswa.find((q) => q.id === ($('#oSis').value)) || p.siswa[0]; downloadBlob(await Doc.toPdfBlob(R.docRapor(p, school, s), dopt(p, school)), `Rapor_${safeName(s.nama)}.pdf`); }
    else if (x.dataset.x === 'zip') { const files = []; let i = 0; for (const s of p.siswa) { u.text('Menyiapkan rapor...', `${++i}/${p.siswa.length}: ${s.nama}`); u.progress((i / p.siswa.length) * 100); files.push({ name: `${String(i).padStart(2, '0')}_${safeName(s.nama)}.pdf`, blob: await Doc.toPdfBlob(R.docRapor(p, school, s), dopt(p, school)) }); } downloadBlob(await zipFiles(files), nm + '.zip'); }
  } catch (er) { toast(er.message || 'Gagal membuat berkas.', 'err', 6000); }
  u.done();
});

/* ---------- leger ---------- */
function renderLeger() {
  const p = P(); const box = $('#legerBody'); if (!p) { box.innerHTML = emptyCard; return; } school = loadSchool(); const d = R.docLeger(p, school); ui.legerDoc = d;
  box.innerHTML = `<div class="ph"><h1>Leger dan rekap nilai</h1><p>Rekap nilai akhir seluruh siswa pada semua mata pelajaran, lengkap dengan jumlah, rata-rata, dan peringkat.</p></div>
  <div class="toolbar"><button class="btn primary sm" data-l="xlsx"><i data-lucide="table"></i>Excel</button><button class="btn sm" data-l="pdf"><i data-lucide="file-down"></i>PDF</button><button class="btn sm" data-l="docx"><i data-lucide="file-type-2"></i>Word</button><button class="btn sm" data-l="print"><i data-lucide="printer"></i>Cetak</button></div>
  <div class="paperwrap"><div class="paper land" id="paper">${Doc.toHTML(d.blocks)}</div></div>`; icons(); fitPaper();
}
$('#legerBody').addEventListener('click', async (e) => {
  const x = e.target.closest('[data-l]'); if (!x) return; const p = P(); if (!p || !(await quota(p))) return; const d = R.docLeger(p, loadSchool()); const u = busy('Menyiapkan berkas...'); const nm = `Leger_${safeName(p.nama)}`; const o = { landscape: true, title: 'Leger', author: p.wali || 'Arif Digital', size: 10 };
  try { if (x.dataset.l === 'xlsx') downloadBlob(await Doc.toXlsx(d.blocks, 'Leger'), nm + '.xlsx'); else if (x.dataset.l === 'pdf') downloadBlob(await Doc.toPdfBlob(d.blocks, o), nm + '.pdf'); else if (x.dataset.l === 'docx') downloadBlob(await Doc.toDocx(d.blocks, o), nm + '.docx'); else { u.done(); Doc.print($('#paper'), { landscape: true, title: 'Leger' }); return; } } catch (er) { toast(er.message || 'Gagal.', 'err', 6000); }
  u.done();
});

/* ---------- sekolah ---------- */
function renderSekolah() {
  school = loadSchool(); let logo = school.logo || ''; const root = $('#schoolForm'); root.innerHTML = schoolFormHTML(school); bindSchoolForm(root, () => logo, (v) => { logo = v; });
  $('#saveSchool').onclick = () => { const s = readSchoolForm(root, school); s.logo = logo; saveSchool(s); school = s; toast('Profil sekolah tersimpan.'); };
}

/* ---------- mulai ---------- */
(async function init() {
  icons(); $('#keyPanel').innerHTML = keyPanelHTML(); bindKeyPanel($('#keyPanel')); mountAccountBar($('#acct'), PRODUK);
  const pull = async () => { if (!session()) return; await syncSchoolFromCloud(); school = loadSchool(); if (!projects.length) { const c = await cloud.get(PRODUK, 'projects'); if (Array.isArray(c) && c.length) { projects = c; curId = c[0].id; lsSet('ad_rapor_projects', projects); lsSet('ad_rapor_cur', curId); go('proyek'); } } };
  await pull(); onAccountChange(pull);
  if (curId && !P()) curId = null; renderProyek(); renderBar();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('../sw.js').catch(() => {});
  window.__rapor = { get projects() { return projects; }, go, R };
})();
