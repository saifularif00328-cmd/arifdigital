import { $, $$, esc, uid, lsGet, lsSet, toast, dialog, confirmBox, busy, mountAccountBar, useQuota, loadSchool, syncSchoolFromCloud, saveSchool, schoolFormHTML, readSchoolForm, bindSchoolForm, schoolDialog, kopBlock, readFiles, fileParts, FILE_ACCEPT, aiJSON, Doc, downloadBlob, safeName, zipFiles, icons, cloud, session, getUserKey, setUserKey, keyPanelHTML, bindKeyPanel, onAccountChange } from '../shared/core.js';
import { JENJANG, KURIKULUM, ROMAN, faseOf, isMadrasah, mapelList, DOKUMEN, MODEL_BELAJAR, DIMENSI_LULUSAN, DIMENSI_P5, PANCA_CINTA, BULAN_GANJIL, BULAN_GENAP } from '../shared/kurikulum.js';
import * as P from './prompts.js';

const PRODUK = 'generator-perangkat-ajar';
const num = (x, d = 0) => { const n = parseFloat(x); return isFinite(n) ? n : d; };
const DEF = { kur: 'merdeka', jenjang: 'SD', kelas: 5, smt: 'ganjil', mapel: '', mapelCustom: '', cakupan: 'semester', topik: '', tpGuru: '', siswa: '', catatan: '', jpMinggu: 4, menit: 35, jpTopik: 8, nPert: 2, nModul: 2, model: 'auto', profil: 'lulusan', dimensi: [], cinta: [], kktp: 75, pg: 20, opsi: 4, isian: 5, uraian: 3, tanggal: '', docs: {}, bulanGanjil: BULAN_GANJIL.map((x) => [...x]), bulanGenap: BULAN_GENAP.map((x) => [...x]) };
let f = { ...DEF, ...(lsGet('ad_gen_form', {}) || {}) };
let school = loadSchool(); let files = []; let results = null; let current = 0;
const save = () => lsSet('ad_gen_form', f);

/* ---------- navigasi ---------- */
function go(p) {
  $$('.page').forEach((e) => e.classList.toggle('on', e.id === 'p-' + p));
  $$('[data-p]').forEach((b) => b.classList.toggle('on', b.dataset.p === p));
  if (p === 'hasil') renderHasil(); if (p === 'riwayat') renderRiwayat(); if (p === 'sekolah') renderSekolah();
  window.scrollTo({ top: 0 });
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) go(b.dataset.p); });

/* ---------- form ---------- */
function ensureDocs() {
  const list = DOKUMEN[f.kur]; const next = {};
  list.forEach((d) => { next[d.id] = f.docs && d.id in f.docs ? !!f.docs[d.id] : d.on; });
  if (f.cakupan === 'topik') { next.prota = false; next.promes = false; }
  f.docs = next;
}
function ensureMapel() {
  const groups = mapelList(f.jenjang, f.kelas, f.kur); const all = groups.flatMap((g) => g.items);
  if (f.mapel !== '__lain' && !all.includes(f.mapel)) f.mapel = all[0];
}
function normalize() {
  const J = JENJANG[f.jenjang];
  if (!J.kelas.includes(+f.kelas)) f.kelas = J.kelas[Math.min(J.kelas.length - 1, 1)];
  if (f.kur === 'kbc' && !isMadrasah(f.jenjang)) f.jenjang = 'MI', f.kelas = 5, f.menit = JENJANG.MI.menit;
  if (f.cakupan === 'topik' && f.smt === 'tahun') f.smt = 'ganjil';
  ensureMapel(); ensureDocs();
}
function renderKur() {
  normalize(); const J = JENJANG[f.jenjang]; const groups = mapelList(f.jenjang, f.kelas, f.kur);
  const opt = (v, t, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;
  $('#cKur').innerHTML = `
  <div class="kur">${Object.entries(KURIKULUM).map(([k, v]) => `<button data-kur="${k}" class="${f.kur === k ? 'on' : ''}"><b>${esc(v.singkat)}</b><span>${esc(v.info)}</span></button>`).join('')}</div>
  <div class="grid4" style="margin-top:14px">
    <label>Jenjang<select data-b="jenjang">${Object.keys(JENJANG).filter((j) => f.kur !== 'kbc' || isMadrasah(j)).map((j) => opt(j, j, f.jenjang)).join('')}</select></label>
    <label>Kelas<select data-b="kelas">${J.kelas.map((k) => opt(k, `Kelas ${k} (${ROMAN[k]})`, f.kelas)).join('')}</select></label>
    <label>Fase<input value="Fase ${faseOf(f.kelas)}" disabled></label>
    <label>Semester<select data-b="smt">${[['ganjil', 'Ganjil (1)'], ['genap', 'Genap (2)'], ...(f.cakupan === 'topik' ? [] : [['tahun', 'Satu tahun (1 dan 2)']])].map(([v, t]) => opt(v, t, f.smt)).join('')}</select></label>
    <label class="full">Mata pelajaran<select data-b="mapel">${groups.map((g) => `<optgroup label="${esc(g.grup)}">${g.items.map((i) => opt(i, i, f.mapel)).join('')}</optgroup>`).join('')}${opt('__lain', 'Lainnya (tulis sendiri)...', f.mapel)}</select></label>
    ${f.mapel === '__lain' ? `<label class="full">Nama mata pelajaran<input data-b="mapelCustom" value="${esc(f.mapelCustom)}" placeholder="Tulis nama mata pelajaran"></label>` : ''}
  </div>
  <div style="margin-top:12px"><label>Cakupan</label><div class="seg"><button data-cak="semester" class="${f.cakupan === 'semester' ? 'on' : ''}">Satu semester atau tahun penuh</button><button data-cak="topik" class="${f.cakupan === 'topik' ? 'on' : ''}">Satu topik atau bab saja</button></div></div>`;
  icons();
}
function dimPick() {
  if (f.kur === 'k13') return '';
  const L = f.profil === 'p5' ? DIMENSI_P5 : DIMENSI_LULUSAN;
  return `<div class="full"><label>${f.profil === 'p5' ? 'Dimensi Profil Pelajar Pancasila' : 'Dimensi Profil Lulusan'} yang ditekankan (kosongkan agar dipilihkan otomatis)</label><div class="pick" data-multi="dimensi">${L.map((d) => `<label><input type="checkbox" value="${esc(d.s)}" ${f.dimensi.includes(d.s) ? 'checked' : ''}>${esc(d.s)}</label>`).join('')}</div></div>`;
}
function renderSet() {
  const opt = (v, t, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;
  const sems = P.semesters(f); const weeks = (s) => (s === 1 ? f.bulanGanjil : f.bulanGenap);
  $('#cSet').innerHTML = `<div class="grid4">
    <label>JP per pekan untuk mapel ini<input type="number" min="1" max="12" data-b="jpMinggu" value="${f.jpMinggu}"></label>
    <label>Menit per JP<input type="number" min="20" max="60" data-b="menit" value="${f.menit}"></label>
    ${f.cakupan === 'topik' ? `<label>Total JP topik ini<input type="number" min="2" max="60" data-b="jpTopik" value="${f.jpTopik}"></label>` : `<label>Jumlah modul/RPP yang dibuat<input type="number" min="1" max="8" data-b="nModul" value="${f.nModul}"></label>`}
    <label>Pertemuan per modul/RPP<input type="number" min="1" max="6" data-b="nPert" value="${f.nPert}"></label>
    <label>Model pembelajaran<select data-b="model">${MODEL_BELAJAR.map(([v, t]) => opt(v, t, f.model)).join('')}</select></label>
    ${f.kur === 'k13' ? '' : `<label>Rujukan profil<select data-b="profil">${opt('lulusan', 'Profil Lulusan (8 dimensi, terbaru)', f.profil)}${opt('p5', 'Profil Pelajar Pancasila (6 dimensi)', f.profil)}</select></label>`}
    ${f.kur === 'k13' ? '' : `<label>Nilai KKTP<input type="number" min="50" max="95" data-b="kktp" value="${f.kktp}"></label>`}
    <label>Tanggal dokumen<input data-b="tanggal" value="${esc(f.tanggal || P.tanggalID())}"></label>
    ${dimPick()}
    ${f.kur === 'kbc' ? `<div class="full"><label>Panca Cinta yang ditekankan (kosongkan agar dipilihkan otomatis)</label><div class="pick" data-multi="cinta">${PANCA_CINTA.map((d) => `<label><input type="checkbox" value="${esc(d.s)}" ${f.cinta.includes(d.s) ? 'checked' : ''}>${esc(d.s)}</label>`).join('')}</div></div>` : ''}
  </div>
  <h3 style="margin-top:16px">Jumlah soal asesmen</h3>
  <div class="grid4"><label>Pilihan ganda<input type="number" min="0" max="50" data-b="pg" value="${f.pg}"></label><label>Opsi jawaban<select data-b="opsi">${[3, 4, 5].map((n) => opt(n, n + ' opsi', f.opsi)).join('')}</select></label><label>Isian singkat<input type="number" min="0" max="20" data-b="isian" value="${f.isian}"></label><label>Uraian<input type="number" min="0" max="15" data-b="uraian" value="${f.uraian}"></label></div>
  ${f.cakupan === 'topik' ? '' : `<details class="card" style="margin-top:14px;background:var(--surface2)"><summary>Pekan efektif per bulan (untuk Promes dan Prota)</summary><p class="muted sm" style="margin-top:6px">Isi jumlah pekan efektif belajar tiap bulan sesuai kalender pendidikan sekolah Anda. Pekan terakhir tiap semester disisihkan untuk asesmen sumatif.</p>
  ${sems.map((s) => `<h3 style="margin-top:10px">Semester ${s}</h3><div class="wk">${weeks(s).map((b, i) => `<label>${b[0]}<input type="number" min="0" max="5" data-wk="${s}-${i}" value="${b[1]}"></label>`).join('')}</div>`).join('')}</details>`}`;
}
function renderDocs() {
  const list = DOKUMEN[f.kur];
  $('#cDocs').innerHTML = `<div class="doclist">${list.map((d) => { const off = f.cakupan === 'topik' && (d.id === 'prota' || d.id === 'promes'); return `<label style="${off ? 'opacity:.45' : ''}"><input type="checkbox" data-doc="${d.id}" ${f.docs[d.id] ? 'checked' : ''} ${off ? 'disabled' : ''}><span>${esc(d.nama)}<small>${esc(d.ket)}${off ? ' (hanya untuk cakupan semester)' : ''}</small></span></label>`; }).join('')}</div>
  <div class="row" style="margin-top:10px"><button class="btn ghost sm" data-all="1">Pilih semua</button><button class="btn ghost sm" data-all="0">Kosongkan</button></div>`;
  paintCTA();
}
function paintCTA() {
  const n = Object.values(f.docs).filter(Boolean).length;
  $('#ctaTitle').textContent = n ? `${n} jenis dokumen dipilih` : 'Pilih minimal satu dokumen';
  $('#ctaSub').textContent = `${schoolOK() ? school.nama : 'Profil sekolah belum diisi'} | ${f.mapel === '__lain' ? f.mapelCustom || 'Mapel' : f.mapel} kelas ${f.kelas}`;
}
const schoolOK = () => !!(school.nama && school.nama.trim());
function renderFiles() {
  $('#fileList').innerHTML = files.map((x, i) => `<span class="f">${esc(x.name)} <span class="muted sm">${(x.size / 1024).toFixed(0)} KB</span><button data-rm="${i}" aria-label="Hapus">&times;</button></span>`).join('');
}
function bindForm() {
  $('#fTopik').value = f.topik; $('#fTP').value = f.tpGuru; $('#fSiswa').value = f.siswa; $('#fCatatan').value = f.catatan;
  [['fTopik', 'topik'], ['fTP', 'tpGuru'], ['fSiswa', 'siswa'], ['fCatatan', 'catatan']].forEach(([id, k]) => $('#' + id).addEventListener('input', (e) => { f[k] = e.target.value; save(); }));
  const root = $('#p-buat');
  root.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kur]'); if (k) { f.kur = k.dataset.kur; f.docs = {}; if (f.kur === 'kbc') { f.jenjang = 'MI'; f.kelas = 5; f.menit = JENJANG.MI.menit; } f.mapel = ''; redraw(); return; }
    const c = e.target.closest('[data-cak]'); if (c) { f.cakupan = c.dataset.cak; f.docs = {}; if (f.cakupan === 'topik' && f.smt === 'tahun') f.smt = 'ganjil'; redraw(); return; }
    const a = e.target.closest('[data-all]'); if (a) { DOKUMEN[f.kur].forEach((d) => { if (!(f.cakupan === 'topik' && (d.id === 'prota' || d.id === 'promes'))) f.docs[d.id] = a.dataset.all === '1'; }); renderDocs(); save(); return; }
    const r = e.target.closest('[data-rm]'); if (r) { files.splice(+r.dataset.rm, 1); renderFiles(); }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.b) {
      const k = t.dataset.b; let v = t.value; if (['kelas', 'jpMinggu', 'menit', 'jpTopik', 'nPert', 'nModul', 'kktp', 'pg', 'opsi', 'isian', 'uraian'].includes(k)) v = num(v, DEF[k]);
      f[k] = v;
      if (k === 'jenjang') { f.menit = JENJANG[v].menit; f.mapel = ''; f.kelas = JENJANG[v].kelas[1] || JENJANG[v].kelas[0]; }
      if (['kelas', 'smt', 'profil'].includes(k)) { if (k === 'kelas') f.mapel = f.mapel; if (k === 'profil') f.dimensi = []; }
      save(); if (['jenjang', 'kelas', 'smt', 'mapel', 'profil'].includes(k)) redraw(); else paintCTA(); return;
    }
    if (t.dataset.wk) { const [s, i] = t.dataset.wk.split('-').map(Number); (s === 1 ? f.bulanGanjil : f.bulanGenap)[i][1] = Math.max(0, Math.min(5, num(t.value))); save(); return; }
    if (t.dataset.doc) { f.docs[t.dataset.doc] = t.checked; save(); paintCTA(); return; }
    const m = t.closest('[data-multi]'); if (m) { f[m.dataset.multi] = $$('input:checked', m).map((x) => x.value); save(); }
  });
  root.addEventListener('input', (e) => { const t = e.target; if (t.dataset.b === 'mapelCustom') { f.mapelCustom = t.value; save(); paintCTA(); } if (t.dataset.b === 'tanggal') { f.tanggal = t.value; save(); } });
  const drop = $('#drop'), inp = $('#fFiles'); inp.accept = FILE_ACCEPT;
  const add = (list) => { files.push(...[...list]); renderFiles(); };
  drop.addEventListener('click', () => inp.click()); drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') inp.click(); });
  inp.addEventListener('change', () => { add(inp.files); inp.value = ''; });
  ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); if (ev === 'drop') add(e.dataTransfer.files); }));
  document.addEventListener('paste', (e) => { const fl = [...(e.clipboardData ? e.clipboardData.files : [])]; if (fl.length && $('#p-buat').classList.contains('on')) add(fl); });
  $('#btnGen').addEventListener('click', generate);
}
function redraw() { save(); renderKur(); renderSet(); renderDocs(); }

/* ---------- pembuatan ---------- */
const PRIORITY = { cptp: 1, silabus: 1, kktp: 2, kkm: 2, prota: 3, promes: 4, modul: 5, rpp: 5, lkpd: 6, bahan: 7, kisi: 8, soal: 9, kunci: 10, remedial: 11, koku: 12 };
const prio = (d) => PRIORITY[d.id.replace(/\d+$/, '')] ?? 20;

async function generate() {
  normalize(); save();
  if (!Object.values(f.docs).some(Boolean)) return toast('Pilih minimal satu dokumen.', 'err');
  if (f.mapel === '__lain' && !f.mapelCustom.trim()) return toast('Tulis nama mata pelajaran.', 'err');
  if (!schoolOK()) { const s = await schoolDialog({ title: 'Isi profil sekolah dulu' }); if (!s) return; school = s; paintCTA(); }
  const q = await useQuota(PRODUK); if (!q.ok) return;
  const ff = { ...f, mapel: f.mapel === '__lain' ? f.mapelCustom.trim() : f.mapel, tanggal: f.tanggal || P.tanggalID() };
  const ui = busy('Menyiapkan bahan...'); const jobId = uid();
  try {
    let rf = { texts: [], images: [], pdfs: [], skipped: [] };
    if (files.length) { ui.text('Membaca materi yang diunggah...', files.length + ' berkas'); rf = await readFiles(files, (i, n, name) => ui.text('Membaca materi yang diunggah...', `${i + 1}/${n}: ${name}`)); }
    const out = await runPipeline(ff, school, rf, ui, jobId);
    results = { id: uid(), at: Date.now(), f: ff, docs: out.docs, skipped: rf.skipped };
    current = 0; persist(); ui.done(); go('hasil');
    if (out.fails) toast(`${out.fails} dokumen gagal dibuat. Tekan "Coba lagi" pada tab yang bertanda.`, 'err', 7000);
    if (rf.skipped.length) toast('Berkas dilewati: ' + rf.skipped.join(', '), 'err', 8000);
  } catch (e) {
    ui.done(); if (e.name === 'AbortError') return;
    dialog(`<h3>Pembuatan gagal</h3><p class="muted">${esc(e.message || 'Terjadi kesalahan.')}</p><p class="muted sm">Jatah uji coba yang terpakai tidak dikembalikan, tetapi Anda bisa mencoba lagi. Periksa koneksi internet dan kunci API.</p><div class="ad-foot"><button class="btn primary" onclick="this.closest('.ad-ov').remove()">Mengerti</button></div>`);
  }
}

async function runPipeline(ff, sch, rf, ui, jobId) {
  const k13 = ff.kur === 'k13'; const sel = (id) => !!ff.docs[id];
  const base = [{ text: 'KONTEKS PENYUSUNAN:\n' + P.buildContext(ff) }, ...fileParts(rf)];
  const t0 = Date.now(); const secs = () => Math.round((Date.now() - t0) / 1000);
  const call = (prompt, maxTokens = 26000, think = 0) => aiJSON({ system: P.SYSTEM, parts: [...base, { text: prompt }], maxTokens, think, produk: PRODUK, jobId });
  const sems = P.semesters(ff); const targets = {};
  sems.forEach((s) => { targets[s] = ff.cakupan === 'topik' ? Math.max(2, num(ff.jpTopik, 8)) : Math.max(2, (P.weeksOf(ff, s) - 1) * Math.max(1, num(ff.jpMinggu, 2))); });
  ui.text(k13 ? 'Menyusun silabus dan KD...' : 'Menyusun CP, TP, dan alur...', 'Langkah utama, biasanya 10 sampai 30 detik'); ui.progress(6);
  let bj, units; try { bj = await call(k13 ? P.promptSilabus(ff, targets) : P.promptATP(ff, targets), 22000, 1024); units = k13 ? P.unitsFromSilabus(bj, ff, targets) : P.unitsFromATP(bj, ff, targets); }
  catch (e) { throw new Error('Tahap awal gagal: ' + (e.message || e)); }
  const docs = []; const tasks = [];
  const push = (d) => docs.push(d);
  if (k13) { if (sel('silabus')) push(P.docSilabus(ff, sch, bj, units)); } else if (sel('cptp')) push(P.docATP(ff, sch, bj, units));
  if (sel('prota')) push(P.docProta(ff, sch, units));
  if (sel('promes')) P.docPromes(ff, sch, units).forEach(push);
  const groups = P.lingkups(units); const nM = ff.cakupan === 'topik' ? 1 : Math.max(1, Math.min(groups.length, num(ff.nModul, 2)));
  const gsel = ff.cakupan === 'topik' ? [{ nama: ff.topik || ff.mapel, units }] : groups.slice(0, nM);
  const T = (label, fn) => tasks.push({ label, fn });
  if (!k13 && sel('kktp')) T('KKTP', async () => [P.docKKTP(ff, sch, await call(P.promptKKTP(ff, units), 16000), units)]);
  if (k13 && sel('kkm')) T('Analisis KKM', async () => [P.docKKM(ff, sch, await call(P.promptKKM(ff, units), 12000), units)]);
  gsel.forEach((g, i) => {
    if (sel('modul')) T(`Modul ${i + 1}`, async () => [P.docModul(ff, sch, await call(P.promptModul(ff, g, ff.nPert), 32000), g, i + 1)]);
    if (sel('rpp')) T(`RPP ${i + 1}`, async () => [P.docRPP(ff, sch, await call(P.promptRPP(ff, g, ff.nPert), 28000), g, i + 1)]);
    if (sel('lkpd')) T(`LKPD ${i + 1}`, async () => [P.docLKPD(ff, sch, await call(P.promptLKPD(ff, g), 16000), g, i + 1)]);
    if (sel('bahan')) T(`Bahan ajar ${i + 1}`, async () => [P.docBahan(ff, sch, await call(P.promptBahan(ff, g), 20000), g, i + 1)]);
  });
  if (sel('asesmen')) { const cnt = { pg: Math.max(0, num(ff.pg)), opsi: ff.opsi || 4, isian: Math.max(0, num(ff.isian)), uraian: Math.max(0, num(ff.uraian)) }; const su = ff.cakupan === 'topik' ? units : units.filter((u) => u.smt === sems[sems.length - 1]); const scope = su.length ? su : units; T(k13 ? 'Penilaian' : 'Asesmen', async () => P.docsAsesmen(ff, sch, await call(P.promptAsesmen(ff, scope, cnt), 30000), cnt, scope)); }
  if (sel('remedial')) T('Remedial dan pengayaan', async () => [P.docRemedial(ff, sch, await call(P.promptRemedial(ff, units.slice(0, 8)), 14000))]);
  if (sel('kokurikuler')) T('Kokurikuler', async () => [P.docKoku(ff, sch, await call(P.promptKoku(ff, units), 16000))]);

  let done = 0; const total = tasks.length || 1; let fails = 0; const failed = [];
  const runTask = async (t) => {
    try { const r = await t.fn(); r.forEach(push); }
    catch (e) { fails++; if (e.gate) throw e; push({ id: 'gagal-' + t.label, title: t.label + ' (gagal)', failed: true, error: e.message || String(e), blocks: [], retry: t.fn, label: t.label }); }
    done++; ui.progress(10 + (done / total) * 88); ui.text(`Menyusun dokumen... ${done}/${total}`, `${t.label} selesai | ${secs()} detik berjalan`);
  };
  const queue = [...tasks]; const worker = async () => { while (queue.length) await runTask(queue.shift()); };
  ui.text(`Menyusun dokumen... 0/${tasks.length}`, 'Beberapa dokumen dibuat bersamaan'); ui.progress(14);
  await Promise.all(Array.from({ length: Math.min(6, Math.max(1, tasks.length)) }, () => worker()));
  docs.sort((a, b) => prio(a) - prio(b) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  if (!docs.some((d) => !d.failed)) throw new Error('Semua dokumen gagal dibuat. ' + (docs[0] && docs[0].error ? docs[0].error : ''));
  return { docs, fails };
}

/* ---------- hasil ---------- */
function syncCurrent() {
  if (!results) return; const el = $('#paper'); const d = results.docs[current]; if (el && d && !d.failed) { const b = Doc.fromDOM(el); if (b.length) d.blocks = b; }
}
function blocksOf(d) { const el = $('#paper'); if (el && results.docs[current] === d && !d.failed) { const b = Doc.fromDOM(el); if (b.length) { d.blocks = b; } } return d.blocks; }
function renderHasil() {
  const box = $('#hasilBody'); if (!results) { box.innerHTML = '<div class="card empty">Belum ada hasil. Buat perangkat ajar terlebih dahulu atau buka dari Riwayat.</div>'; return; }
  const d = results.docs[current] || results.docs[0];
  box.innerHTML = `<div class="docs-tabs" id="tabs">${results.docs.map((x, i) => `<button data-t="${i}" class="${i === current ? 'on' : ''}">${x.failed ? '! ' : ''}${esc(x.title)}</button>`).join('')}</div>
  ${d.failed ? `<div class="card err-card"><h3>${esc(d.title)}</h3><p class="muted">${esc(d.error)}</p><div class="row"><button class="btn primary" id="retry">Coba lagi</button></div></div>` : `
  <div class="toolbar"><button class="btn primary sm" data-x="docx"><i data-lucide="file-type-2"></i>Word</button><button class="btn sm" data-x="pdf"><i data-lucide="file-down"></i>PDF</button><button class="btn sm" data-x="xlsx"><i data-lucide="table"></i>Excel</button><button class="btn sm" data-x="print"><i data-lucide="printer"></i>Cetak</button><button class="btn ghost sm" data-x="zip"><i data-lucide="archive"></i>Semua (ZIP Word)</button><button class="btn ghost sm" data-x="zippdf"><i data-lucide="archive"></i>Semua (ZIP PDF)</button></div>
  <div class="paperwrap"><div class="paper ${d.landscape ? 'land' : ''}" id="paper" contenteditable="true" spellcheck="false">${Doc.toHTML(d.blocks.map((b) => (b.t === 'kop' ? { ...b, logo: school.logo || b.logo || '' } : b)))}</div></div>`}`;
  icons(); fitPaper();
}
function fitPaper() { const pw = $('.paperwrap'), pp = $('#paper'); if (!pw || !pp) return; pp.style.zoom = ''; const k = Math.min(1, (pw.clientWidth - 24) / pp.offsetWidth); if (k < 1) pp.style.zoom = k.toFixed(3); }
window.addEventListener('resize', fitPaper);
document.addEventListener('click', async (e) => {
  const t = e.target.closest('#tabs [data-t]'); if (t) { persist(); current = +t.dataset.t; renderHasil(); return; }
  if (e.target.closest('#retry')) { const d = results.docs[current]; const ui = busy('Mencoba lagi...'); try { const r = await d.retry(); results.docs.splice(current, 1, ...r); results.docs.sort((a, b) => prio(a) - prio(b)); ui.done(); persist(); renderHasil(); toast('Berhasil dibuat.'); } catch (er) { ui.done(); d.error = er.message || String(er); renderHasil(); toast(d.error, 'err', 6000); } return; }
  const x = e.target.closest('[data-x]'); if (!x || !results) return;
  const d = results.docs[current]; const opt = (dd) => ({ landscape: dd.landscape, title: dd.title, author: school.guru || 'Arif Digital', font: 'Times New Roman', size: dd.landscape ? 11 : 12 });
  const name = (dd, ext) => `${safeName(results.f.mapel)}_Kelas${results.f.kelas}_${safeName(dd.title)}.${ext}`;
  const ui = busy('Menyiapkan berkas...');
  try {
    if (x.dataset.x === 'docx') { downloadBlob(await Doc.toDocx(blocksOf(d), opt(d)), name(d, 'docx')); }
    else if (x.dataset.x === 'pdf') { downloadBlob(await Doc.toPdfBlob(blocksOf(d), opt(d)), name(d, 'pdf')); }
    else if (x.dataset.x === 'xlsx') { downloadBlob(await Doc.toXlsx(blocksOf(d), d.title), name(d, 'xlsx')); }
    else if (x.dataset.x === 'print') { ui.done(); blocksOf(d); Doc.print($('#paper'), { landscape: d.landscape, title: d.title }); return; }
    else { syncCurrent(); const files = []; const good = results.docs.filter((dd) => !dd.failed); let i = 0; for (const dd of good) { ui.text('Menyiapkan berkas...', `${++i}/${good.length}`); const pdf = x.dataset.x === 'zippdf'; files.push({ name: name(dd, pdf ? 'pdf' : 'docx'), blob: pdf ? await Doc.toPdfBlob(dd.blocks, opt(dd)) : await Doc.toDocx(dd.blocks, opt(dd)) }); } downloadBlob(await zipFiles(files), `${safeName(results.f.mapel)}_Kelas${results.f.kelas}_Perangkat_Ajar.zip`); }
    persist();
  } catch (er) { toast(er.message || 'Gagal membuat berkas.', 'err', 6000); }
  ui.done();
});

/* ---------- riwayat ---------- */
function stripLogo(blocks) { return blocks.map((b) => (b.t === 'kop' ? { ...b, logo: '' } : b)); }
function persist() {
  if (!results) return; syncCurrent();
  const rec = { id: results.id, at: results.at, f: { ...results.f, docs: results.f.docs }, docs: results.docs.filter((d) => !d.failed).map((d) => ({ id: d.id, title: d.title, landscape: d.landscape, blocks: stripLogo(d.blocks) })) };
  let h = lsGet('ad_gen_hist', []).filter((x) => x.id !== rec.id); h.unshift(rec);
  while (h.length > 1 && JSON.stringify(h).length > 3.8e6) h.pop(); h = h.slice(0, 12);
  if (!lsSet('ad_gen_hist', h)) { lsSet('ad_gen_hist', h.slice(0, 3)); }
  if (session()) cloud.set(PRODUK, 'riwayat', h.slice(0, 6));
}
async function renderRiwayat() {
  const box = $('#riwayatBody'); let h = lsGet('ad_gen_hist', []);
  if (session()) { const c = await cloud.get(PRODUK, 'riwayat'); if (Array.isArray(c)) { const ids = new Set(h.map((x) => x.id)); h = [...h, ...c.filter((x) => !ids.has(x.id))].sort((a, b) => b.at - a.at); } }
  if (!h.length) { box.innerHTML = '<div class="card empty">Belum ada riwayat.</div>'; return; }
  box.innerHTML = h.map((r) => `<div class="hist"><div><b>${esc(r.f.mapel)} kelas ${r.f.kelas}</b> <span class="chip">${esc(KURIKULUM[r.f.kur].singkat)}</span><div class="muted sm">${new Date(r.at).toLocaleString('id-ID')} | ${r.docs.length} dokumen</div></div><div class="row"><button class="btn sm primary" data-open="${r.id}">Buka</button><button class="btn sm ghost danger" data-del="${r.id}">Hapus</button></div></div>`).join('');
  box.onclick = async (e) => {
    const o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]');
    if (o) { const r = h.find((x) => x.id === o.dataset.open); results = { id: r.id, at: r.at, f: r.f, docs: r.docs.map((x) => ({ ...x })) }; current = 0; go('hasil'); }
    if (d && await confirmBox('Hapus riwayat ini?')) { const nh = lsGet('ad_gen_hist', []).filter((x) => x.id !== d.dataset.del); lsSet('ad_gen_hist', nh); if (session()) cloud.set(PRODUK, 'riwayat', nh.slice(0, 6)); renderRiwayat(); }
  };
}

/* ---------- sekolah ---------- */
function renderSekolah() {
  school = loadSchool(); let logo = school.logo || '';
  $('#schoolForm').innerHTML = schoolFormHTML(school);
  const root = $('#schoolForm'); bindSchoolForm(root, () => logo, (v) => { logo = v; });
  const pv = () => { const p = readSchoolForm(root, school); p.logo = logo; $('#kopPv').innerHTML = Doc.toHTML([kopBlock(p)]); };
  root.oninput = root.onchange = pv; root.addEventListener('click', () => setTimeout(pv, 50)); setTimeout(pv, 80);
  $('#saveSchool').onclick = () => { const p = readSchoolForm(root, school); p.logo = logo; saveSchool(p); school = p; paintCTA(); toast('Profil sekolah tersimpan.'); };
}

/* ---------- mulai ---------- */
(async function init() {
  $('#keyPanel').innerHTML = keyPanelHTML(); bindKeyPanel($('#keyPanel'));
  redraw(); bindForm(); renderFiles(); icons();
  mountAccountBar($('#acct'), PRODUK);
  if (session()) { const ok = await syncSchoolFromCloud(); if (ok) { school = loadSchool(); paintCTA(); } }
  onAccountChange(async () => { if (session()) { const ok = await syncSchoolFromCloud(); if (ok) { school = loadSchool(); paintCTA(); } } });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('../sw.js').catch(() => {});
  window.__gen = { get f() { return f; }, get results() { return results; }, set results(v) { results = v; }, go, runPipeline, P };
})();
