// Arif Digital - modul bersama untuk Generator Perangkat Ajar dan E-Rapor
// Isi: util UI, akun + uji coba, penyimpanan awan, profil sekolah (kop), AI Gemini, pembaca berkas, dan mesin dokumen (HTML, Word, PDF, cetak).
const CFG = window.AD_CONFIG;

/* ====================== util ====================== */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const lsGet = (k, d = null) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
export const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
export const lsDel = (k) => { try { localStorage.removeItem(k); } catch { /* abaikan */ } };

const loaded = {};
export function loadScript(src) {
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error('Gagal memuat ' + src)); };
    document.head.appendChild(s);
  });
  return loaded[src];
}
export function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
export const safeName = (s) => String(s || 'dokumen').replace(/[^\p{L}\p{N}._ -]/gu, '').trim().replace(/\s+/g, '_').slice(0, 80) || 'dokumen';

let toastT;
export function toast(msg, type = 'ok', ms = 3600) {
  let el = $('#adToast');
  if (!el) { el = document.createElement('div'); el.id = 'adToast'; el.className = 'ad-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.className = `ad-toast show ${type}`; clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms);
}

export function dialog(html, { wide = false, onClose } = {}) {
  const ov = document.createElement('div'); ov.className = 'ad-ov';
  ov.innerHTML = `<div class="ad-dlg ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  const close = (v) => { ov.remove(); document.removeEventListener('keydown', key); onClose && onClose(v); };
  const key = (e) => { if (e.key === 'Escape') close(null); };
  document.addEventListener('keydown', key);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(null); });
  document.body.appendChild(ov);
  const f = ov.querySelector('input,select,textarea,button.primary'); f && f.focus();
  return { el: ov.firstElementChild, close };
}
export const confirmBox = (msg, ok = 'Ya, lanjutkan') => new Promise((res) => {
  const d = dialog(`<h3>Konfirmasi</h3><p class="muted">${esc(msg)}</p><div class="ad-foot"><button class="btn ghost" data-x="0">Batal</button><button class="btn primary" data-x="1">${esc(ok)}</button></div>`, { onClose: (v) => res(v === true) });
  d.el.addEventListener('click', (e) => { const b = e.target.closest('[data-x]'); if (b) d.close(b.dataset.x === '1'); });
});

export function busy(text = 'Memproses...') {
  const ov = document.createElement('div'); ov.className = 'ad-ov busy';
  ov.innerHTML = `<div class="ad-dlg slim"><div class="spin"></div><div class="busy-t">${esc(text)}</div><div class="bar"><i></i></div><div class="busy-s muted"></div></div>`;
  document.body.appendChild(ov);
  return {
    text(t, sub) { ov.querySelector('.busy-t').textContent = t; if (sub !== undefined) ov.querySelector('.busy-s').textContent = sub; },
    progress(p) { ov.querySelector('.bar i').style.width = Math.max(2, Math.min(100, p)) + '%'; },
    done() { ov.remove(); }
  };
}

/* ====================== Supabase + akun + uji coba ====================== */
let sbPromise;
export function getSB() {
  if (!sbPromise) sbPromise = import(CFG.SUPABASE_ESM).then(({ createClient }) => createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } }));
  return sbPromise;
}
async function rpc(name, args) { const sb = await getSB(); const { data, error } = await sb.rpc(name, args); if (error) throw error; return data; }

const K_SESSION = 'ad_session', K_DEVICE = 'ad_device', K_LOCAL_TRIAL = 'ad_trial_local';
export function device() { let d = lsGet(K_DEVICE); if (!d) { d = uid(); lsSet(K_DEVICE, d); } return d; }
export const session = () => lsGet(K_SESSION);
export const currentUser = () => (session() || {}).user || null;
const listeners = new Set();
export const onAccountChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => listeners.forEach((f) => { try { f(); } catch { /* abaikan */ } });

export async function login(username, password) {
  const r = await rpc('login_user', { p_username: username, p_password: password });
  if (!r || !r.ok) {
    const e = new Error(r && r.error === 'terlalu_banyak_percobaan' ? 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' : 'Username atau kata sandi salah, atau akun sudah tidak aktif.');
    throw e;
  }
  lsSet(K_SESSION, { token: r.token, user: r.user }); notify(); return r.user;
}
export async function logout() {
  const s = session(); lsDel(K_SESSION); notify();
  if (s) { try { await rpc('logout_user', { p_token: s.token }); } catch { /* abaikan */ } }
}
export async function verifySession() {
  const s = session(); if (!s) return null;
  try { const u = await rpc('check_session', { p_token: s.token }); if (!u) { lsDel(K_SESSION); notify(); return null; } lsSet(K_SESSION, { token: s.token, user: u }); return u; }
  catch { return s.user; } // jaringan bermasalah: tetap percaya sesi lokal
}
export function hasProduct(slug) { const u = currentUser(); return !!u && (!u.produk || u.produk.includes(slug)); }

function localTrialStatus(produk, limit = 3) { const m = lsGet(K_LOCAL_TRIAL, {}); const used = m[produk] || 0; return { used, limit, remaining: Math.max(limit - used, 0) }; }
export async function trialStatus(produk) {
  try { const r = await rpc('trial_status', { p_device: device(), p_produk: produk }); return r; } catch { return localTrialStatus(produk); }
}
/** Panggil sebelum tindakan yang memakai jatah (membuat dokumen, mencetak rapor). Mengembalikan {ok, mode}. */
export async function useQuota(produk) {
  if (session()) { const u = await verifySession(); if (u) { if (!hasProduct(produk)) { toast('Akun Anda belum punya akses ke produk ini. Hubungi admin.', 'err', 6000); return { ok: false }; } return { ok: true, mode: 'user' }; } }
  let r;
  try { r = await rpc('consume_trial', { p_device: device(), p_produk: produk }); }
  catch (e) {
    // server belum siap: jatah dihitung di perangkat ini saja
    const m = lsGet(K_LOCAL_TRIAL, {}); const lim = 3; const used = m[produk] || 0;
    if (used >= lim) r = { ok: false, remaining: 0, limit: lim }; else { m[produk] = used + 1; lsSet(K_LOCAL_TRIAL, m); r = { ok: true, remaining: lim - used - 1, limit: lim }; }
  }
  if (r.ok) { lastRemaining = r.remaining; notify(); return { ok: true, mode: 'trial', remaining: r.remaining }; }
  lastRemaining = 0; notify();
  const logged = await loginDialog('Uji coba gratis Anda sudah habis. Masuk dengan akun dari Arif Digital untuk melanjutkan.');
  return logged ? { ok: true, mode: 'user' } : { ok: false };
}
let lastRemaining = null;

export function loginDialog(reason) {
  return new Promise((resolve) => {
    let done = false;
    const wa = `https://wa.me/${CFG.WHATSAPP}?text=${encodeURIComponent('Halo, saya ingin mengaktifkan akun untuk aplikasi Arif Digital.')}`;
    const d = dialog(`<h3>Masuk</h3>${reason ? `<p class="muted">${esc(reason)}</p>` : ''}
      <form id="adLogin" class="stack" autocomplete="on"><label>Username<input name="u" autocomplete="username" required></label>
      <label>Kata sandi<input name="p" type="password" autocomplete="current-password" required></label>
      <div class="note err" id="adLoginErr" role="alert"></div>
      <div class="ad-foot"><a class="btn ghost" href="${wa}" target="_blank" rel="noopener">Minta akun</a><button class="btn primary" type="submit">Masuk</button></div></form>`, { onClose: () => { if (!done) resolve(false); } });
    const f = d.el.querySelector('#adLogin');
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const b = f.querySelector('button.primary'); b.disabled = true; $('#adLoginErr', d.el).textContent = '';
      try { await login(f.u.value, f.p.value); done = true; d.close(true); resolve(true); toast('Berhasil masuk.'); }
      catch (err) { $('#adLoginErr', d.el).textContent = err.message || 'Gagal masuk.'; b.disabled = false; }
    });
  });
}

/** Menampilkan status akun/uji coba di elemen yang diberikan. */
export function mountAccountBar(el, produk) {
  const paint = async () => {
    const u = currentUser();
    if (u) { el.innerHTML = `<span class="chip ok">${esc(u.nama || u.username)}</span><button class="btn ghost sm" data-a="out">Keluar</button>`; }
    else {
      let rem = lastRemaining; if (rem == null) { try { rem = (await trialStatus(produk)).remaining; lastRemaining = rem; } catch { rem = null; } }
      el.innerHTML = `<span class="chip ${rem === 0 ? 'warn' : ''}">${rem == null ? 'Uji coba gratis' : `Sisa uji coba: ${rem}x`}</span><button class="btn ghost sm" data-a="in">Masuk</button>`;
    }
  };
  el.addEventListener('click', async (e) => { const b = e.target.closest('[data-a]'); if (!b) return; if (b.dataset.a === 'in') await loginDialog(); else { await logout(); toast('Anda sudah keluar.'); } });
  onAccountChange(paint); paint();
  verifySession().then(paint);
}

/* ====================== penyimpanan awan per pengguna ====================== */
export const cloud = {
  async get(app, key) { const s = session(); if (!s) return null; try { return await rpc('get_user_data', { p_token: s.token, p_app: app, p_key: key }); } catch { return null; } },
  async set(app, key, value) { const s = session(); if (!s) return false; try { return !!(await rpc('set_user_data', { p_token: s.token, p_app: app, p_key: key, p_value: value })); } catch { return false; } },
  async del(app, key) { const s = session(); if (!s) return false; try { return !!(await rpc('delete_user_data', { p_token: s.token, p_app: app, p_key: key })); } catch { return false; } }
};

/* ====================== profil sekolah dan kop ====================== */
const defaultYear = () => { const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`; };
export const SCHOOL_DEFAULT = {
  naungan: 'kemendikdasmen', baris1: '', baris2: '', nama: '', npsn: '', alamat: '', kecamatan: '', kabupaten: '', provinsi: '', kodepos: '', telepon: '', email: '', website: '', logo: '',
  kepsek: '', kepsekNip: '', guru: '', guruNip: '', kota: '', tahunAjaran: defaultYear(), jenjang: 'SD'
};
export const NAUNGAN = {
  kemendikdasmen: { label: 'Kemendikdasmen (SD, SMP, SMA)', b1: 'PEMERINTAH {PROV}', b2: 'DINAS PENDIDIKAN' },
  kemenag: { label: 'Kemenag (MI, MTs, MA)', b1: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA', b2: 'KANTOR KEMENTERIAN AGAMA KABUPATEN/KOTA {KAB}' },
  swasta: { label: 'Yayasan / swasta', b1: '', b2: 'YAYASAN' }
};
export function loadSchool() { return { ...SCHOOL_DEFAULT, ...(lsGet('ad_school', {}) || {}) }; }
export async function syncSchoolFromCloud() { const c = await cloud.get('shared', 'school'); if (c && typeof c === 'object') { lsSet('ad_school', { ...loadSchool(), ...c }); return true; } return false; }
export function saveSchool(p) { lsSet('ad_school', p); cloud.set('shared', 'school', p); }

export function kopBlock(p) {
  const pre = NAUNGAN[p.naungan] || NAUNGAN.kemendikdasmen;
  const rep = (s) => String(s || '').replace('{PROV}', (p.provinsi || '').toUpperCase()).replace('{KAB}', (p.kabupaten || '').toUpperCase()).trim();
  const lines = [p.baris1 || rep(pre.b1), p.baris2 || rep(pre.b2)].filter(Boolean);
  const alamat = [p.alamat, p.kecamatan && `Kec. ${p.kecamatan}`, p.kabupaten, p.provinsi, p.kodepos].filter(Boolean).join(', ');
  const kontak = [p.npsn && `NPSN: ${p.npsn}`, p.telepon && `Telp. ${p.telepon}`, p.email && `Email: ${p.email}`, p.website].filter(Boolean).join('  |  ');
  return { t: 'kop', lines, nama: (p.nama || 'NAMA SEKOLAH').toUpperCase(), alamat, kontak, logo: p.logo || '' };
}
async function imageToDataURL(file, max = 360) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
export function schoolFormHTML(p, { guru = true } = {}) {
  const f = (k, label, ph = '', type = 'text') => `<label>${label}<input data-k="${k}" type="${type}" value="${esc(p[k] || '')}" placeholder="${esc(ph)}"></label>`;
  return `<div class="grid2">
    <label>Naungan<select data-k="naungan">${Object.entries(NAUNGAN).map(([k, v]) => `<option value="${k}" ${p.naungan === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
    ${f('nama', 'Nama sekolah / madrasah', 'Contoh: SDN 1 Grobogan')}${f('npsn', 'NPSN', '8 digit')}${f('tahunAjaran', 'Tahun ajaran', '2026/2027')}
    ${f('baris1', 'Baris kop 1 (kosongkan untuk otomatis)', 'PEMERINTAH KABUPATEN ...')}${f('baris2', 'Baris kop 2 (kosongkan untuk otomatis)', 'DINAS PENDIDIKAN')}
    <label class="full">Alamat (jalan, desa)<input data-k="alamat" value="${esc(p.alamat || '')}"></label>
    ${f('kecamatan', 'Kecamatan')}${f('kabupaten', 'Kabupaten/Kota')}${f('provinsi', 'Provinsi')}${f('kodepos', 'Kode pos')}${f('telepon', 'Telepon')}${f('email', 'Email', '', 'email')}${f('website', 'Website')}
    ${f('kota', 'Kota/tempat tanda tangan', 'Contoh: Grobogan')}${f('kepsek', 'Nama kepala sekolah')}${f('kepsekNip', 'NIP kepala sekolah', 'Kosongkan jika tidak ada')}
    ${guru ? `${f('guru', 'Nama guru (penyusun)')}${f('guruNip', 'NIP guru', 'Kosongkan jika tidak ada')}` : ''}
    <label class="full">Logo sekolah (opsional)<input type="file" data-logo accept="image/*"></label>
    <div class="full logo-pv">${p.logo ? `<img src="${p.logo}" alt="Logo" style="height:56px"> <button type="button" class="btn ghost sm" data-clearlogo>Hapus logo</button>` : ''}</div></div>`;
}
export function readSchoolForm(root, base) {
  const p = { ...base };
  $$('[data-k]', root).forEach((el) => { p[el.dataset.k] = el.value.trim(); });
  return p;
}
export function bindSchoolForm(root, getLogo, setLogo) {
  const file = $('[data-logo]', root);
  file && file.addEventListener('change', async () => {
    if (!file.files[0]) return; try { const d = await imageToDataURL(file.files[0]); setLogo(d); $('.logo-pv', root).innerHTML = `<img src="${d}" alt="Logo" style="height:56px"> <button type="button" class="btn ghost sm" data-clearlogo>Hapus logo</button>`; } catch { toast('Gambar logo tidak bisa dibaca.', 'err'); }
  });
  root.addEventListener('click', (e) => { if (e.target.closest('[data-clearlogo]')) { setLogo(''); $('.logo-pv', root).innerHTML = ''; } });
}
export function schoolDialog({ guru = true, title = 'Profil sekolah dan kop surat' } = {}) {
  return new Promise((resolve) => {
    let p = loadSchool(); let logo = p.logo || '';
    const d = dialog(`<h3>${esc(title)}</h3><p class="muted">Data ini dipakai otomatis untuk kop dan tanda tangan di semua dokumen. Cukup isi sekali.</p><div id="sf">${schoolFormHTML(p, { guru })}</div>
      <div class="ad-foot"><button class="btn ghost" data-x="0">Batal</button><button class="btn primary" data-x="1">Simpan</button></div>`, { wide: true, onClose: (v) => resolve(v === true ? loadSchool() : null) });
    bindSchoolForm(d.el, () => logo, (v) => { logo = v; });
    d.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === '1') { p = readSchoolForm(d.el, p); p.logo = logo; saveSchool(p); toast('Profil sekolah tersimpan.'); d.close(true); } else d.close(false);
    });
  });
}

/* ====================== AI (Gemini) ====================== */
const K_KEY = 'ad_gemini_key';
const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
let serverKeyOk = true, modelListCache = null;
export const getUserKey = () => lsGet(K_KEY, '') || '';
export const setUserKey = (k) => (k ? lsSet(K_KEY, k.trim()) : lsDel(K_KEY));
async function modelList() {
  if (modelListCache) return modelListCache;
  let first = null;
  try { const sb = await getSB(); const { data } = await sb.from('settings').select('key,value').eq('key', 'gemini_model'); first = data && data[0] && data[0].value; } catch { /* abaikan */ }
  modelListCache = [...new Set([first, ...DEFAULT_MODELS].filter(Boolean))]; return modelListCache;
}
export const KEY_URL = 'https://aistudio.google.com/apikey';
export function keyGuideHTML() {
  return `<details class="keyguide"><summary>Cara mendapatkan kunci API Gemini (gratis)</summary>
    <ol>
      <li>Buka <a href="${KEY_URL}" target="_blank" rel="noopener">aistudio.google.com/apikey</a> lalu masuk dengan akun Google Anda.</li>
      <li>Klik tombol <b>Create API key</b> (Buat kunci API). Bila diminta memilih proyek, pilih <b>Create API key in new project</b>.</li>
      <li>Tunggu sebentar sampai kunci muncul, lalu klik ikon salin. Kunci diawali huruf <code>AIza</code> dan panjangnya sekitar 39 karakter.</li>
      <li>Kembali ke sini, tempel kunci pada kolom di atas, tekan <b>Simpan</b>, lalu <b>Uji kunci</b> untuk memastikan kunci bekerja.</li>
    </ol>
    <p class="muted sm">Jatah gratis dibatasi Google per menit dan per hari, besarnya bisa berubah. Kalau muncul pesan batas tercapai, tunggu sebentar atau coba lagi besok. Kunci bersifat pribadi, jangan dibagikan ke orang lain. Di sini kunci hanya disimpan di browser Anda dan dikirim langsung ke Google.</p>
  </details>`;
}
export async function testGeminiKey(key) {
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } });
    if (r.ok) return { ok: true };
    let m = ''; try { m = (await r.json()).error.message; } catch { /* abaikan */ }
    return { ok: false, msg: r.status === 400 || r.status === 403 ? 'Kunci tidak valid atau belum aktif. Periksa lagi hasil salinannya.' : (m || `Gagal menguji (${r.status}).`) };
  } catch { return { ok: false, msg: 'Tidak bisa terhubung ke Google. Periksa koneksi internet.' }; }
}
const maskKey = (k) => (k ? `${k.slice(0, 4)}••••••${k.slice(-4)}` : '');
export function keyPanelHTML() {
  return `<div class="keypanel"><p class="muted sm">Kunci ini dipakai untuk fitur AI. Bila Arif Digital sudah memasang kunci di server, Anda tidak wajib mengisinya. Bila belum, atau jatah server habis, isi kunci Gemini milik Anda sendiri.</p>
    <div class="kp-status" id="kpStatus"></div>
    <div class="row" style="margin:10px 0"><input id="kpInp" type="password" placeholder="Tempel kunci, diawali AIza..." autocomplete="off" spellcheck="false" style="flex:1;min-width:220px"><button class="btn sm ghost" id="kpEye" type="button">Tampilkan</button></div>
    <div class="row"><button class="btn primary sm" id="kpSave" type="button">Simpan</button><button class="btn sm" id="kpTest" type="button">Uji kunci</button><button class="btn sm ghost danger" id="kpDel" type="button">Hapus kunci</button></div>
    ${keyGuideHTML()}</div>`;
}
export function bindKeyPanel(root) {
  const inp = $('#kpInp', root), st = $('#kpStatus', root);
  const paint = () => { const k = getUserKey(); st.innerHTML = k ? `<span class="chip acc">Kunci tersimpan di browser ini: ${esc(maskKey(k))}</span>` : '<span class="chip">Belum ada kunci pribadi</span>'; };
  paint();
  $('#kpEye', root).onclick = (e) => { const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; e.target.textContent = show ? 'Sembunyikan' : 'Tampilkan'; };
  $('#kpSave', root).onclick = () => { const v = inp.value.trim(); if (v.length < 20) return toast('Kunci tampak terlalu pendek. Periksa lagi hasil salinannya.', 'err'); setUserKey(v); inp.value = ''; paint(); toast('Kunci tersimpan di browser ini.'); };
  $('#kpTest', root).onclick = async () => { const v = inp.value.trim() || getUserKey(); if (!v) return toast('Isi kunci terlebih dahulu.', 'err'); const b = $('#kpTest', root); b.disabled = true; b.textContent = 'Menguji...'; const r = await testGeminiKey(v); b.disabled = false; b.textContent = 'Uji kunci'; toast(r.ok ? 'Kunci berfungsi dan siap dipakai.' : r.msg, r.ok ? undefined : 'err', 6000); };
  $('#kpDel', root).onclick = () => { setUserKey(''); inp.value = ''; paint(); toast('Kunci dihapus dari browser ini.'); };
}
export function askKeyDialog() {
  return new Promise((resolve) => {
    let ok = false;
    const d = dialog(`<h3>Kunci API Gemini</h3><p class="muted">Server belum memakai kunci milik Arif Digital atau jatahnya sedang habis, jadi masukkan kunci Gemini Anda sendiri. Kunci hanya disimpan di browser ini dan dikirim langsung ke Google.</p>
      <label>Kunci API<input id="adKey" type="password" placeholder="AIza..." autocomplete="off" spellcheck="false" value="${esc(getUserKey())}"></label>
      ${keyGuideHTML()}
      <div class="ad-foot"><button class="btn ghost" data-x="0">Batal</button><button class="btn" data-x="t">Uji kunci</button><button class="btn primary" data-x="1">Simpan dan lanjut</button></div>`, { onClose: () => { if (!ok) resolve(null); } });
    d.el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-x]'); if (!b) return; const v = $('#adKey', d.el).value.trim();
      if (b.dataset.x === 't') { if (v.length < 20) return toast('Isi kunci terlebih dahulu.', 'err'); b.disabled = true; const r = await testGeminiKey(v); b.disabled = false; return toast(r.ok ? 'Kunci berfungsi.' : r.msg, r.ok ? undefined : 'err', 6000); }
      if (b.dataset.x === '1') { if (v.length < 20) { toast('Kunci tampak terlalu pendek.', 'err'); return; } setUserKey(v); ok = true; d.close(true); resolve(v); } else d.close(false);
    });
  });
}
const wait = (ms, sig) => new Promise((res, rej) => { const t = setTimeout(res, ms); if (sig) sig.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Dibatalkan', 'AbortError')); }); });
function extractText(j) {
  const c = j && j.candidates && j.candidates[0]; if (!c) { const why = j && j.promptFeedback && j.promptFeedback.blockReason; throw new Error(why ? `Permintaan ditolak (${why}).` : 'AI tidak mengembalikan jawaban.'); }
  const t = ((c.content && c.content.parts) || []).map((p) => p.text || '').join('');
  if (!t.trim()) throw new Error('AI mengembalikan jawaban kosong.');
  return { text: t, truncated: c.finishReason === 'MAX_TOKENS' };
}
/** Satu panggilan AI. opts: {system, parts, json, maxTokens, temperature, jobId, produk, signal} */
export async function aiCall(opts) {
  const { system, parts, json = true, maxTokens = 16000, temperature = 0.6, jobId, produk, signal } = opts;
  const body = { contents: [{ role: 'user', parts }], generationConfig: { temperature, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}) } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const models = await modelList(); let lastErr;
  // 1) kunci milik server (Edge Function)
  if (serverKeyOk) {
    for (const model of models) {
      for (let a = 0; a < 3; a++) {
        let res;
        try {
          res = await fetch(`${CFG.SUPABASE_URL}/functions/v1/ai-generate`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CFG.SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ model, body, device_id: device(), token: (session() || {}).token || null, produk, job_id: jobId }) });
        } catch (e) { if (e.name === 'AbortError') throw e; serverKeyOk = false; break; }
        if (res.ok) return extractText(await res.json());
        let err = {}; try { err = await res.json(); } catch { /* abaikan */ }
        if (res.status === 503 && err.error === 'server_key_missing') { serverKeyOk = false; break; }
        if (res.status === 404 && /not found|tidak ditemukan/i.test(JSON.stringify(err))) { lastErr = new Error('Model tidak tersedia'); break; }
        if (res.status === 401 || res.status === 402 || res.status === 403) { const e = new Error(err.message || 'Akses ditolak. Masuk dengan akun Anda.'); e.gate = true; throw e; }
        if (res.status === 404 && err.error === 'function_not_found') { serverKeyOk = false; break; }
        lastErr = new Error((err.error && err.error.message) || err.message || `Kesalahan server AI (${res.status})`);
        if ([429, 500, 502, 503, 504].includes(res.status)) { await wait(1500 * (a + 1) ** 2, signal); continue; }
        throw lastErr;
      }
      if (!serverKeyOk) break;
    }
  }
  // 2) kunci milik pengguna (langsung ke Google)
  let key = getUserKey(); if (!key) key = await askKeyDialog(); if (!key) throw new Error('Kunci API Gemini diperlukan untuk membuat dokumen.');
  for (const model of models) {
    for (let a = 0; a < 3; a++) {
      let res;
      try { res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) }); }
      catch (e) { if (e.name === 'AbortError') throw e; throw new Error('Tidak bisa terhubung ke Google. Periksa koneksi internet.'); }
      if (res.ok) return extractText(await res.json());
      let err = {}; try { err = await res.json(); } catch { /* abaikan */ }
      const msg = (err.error && err.error.message) || `Kesalahan AI (${res.status})`;
      if (res.status === 400 && /API key/i.test(msg)) { setUserKey(''); throw new Error('Kunci API tidak valid. Masukkan ulang kunci yang benar.'); }
      if (res.status === 404) { lastErr = new Error(msg); break; }
      if ([429, 500, 502, 503, 504].includes(res.status)) { lastErr = new Error(res.status === 429 ? 'Batas pemakaian AI tercapai. Tunggu sebentar lalu coba lagi.' : msg); await wait(2000 * (a + 1) ** 2, signal); continue; }
      throw new Error(msg);
    }
  }
  throw lastErr || new Error('AI tidak bisa dihubungi.');
}
export function parseJSON(text) {
  let t = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(t); } catch { /* coba perbaiki */ }
  const a = t.search(/[\[{]/); const b = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* lanjut */ } }
  // perbaikan ringan: koma berlebih dan tanda kutip lurus
  try { return JSON.parse(t.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')); } catch { throw new Error('Jawaban AI tidak bisa dibaca sebagai data. Coba buat ulang.'); }
}
/** Panggilan AI yang mengembalikan objek JSON, dengan satu kali percobaan ulang bila format rusak. */
export async function aiJSON(opts) {
  let r = await aiCall({ ...opts, json: true });
  try { return parseJSON(r.text); } catch (e) {
    r = await aiCall({ ...opts, json: true, temperature: 0.3 }); return parseJSON(r.text);
  }
}
/** Bersihkan sisa markdown dari teks AI. */
export function clean(s) {
  if (s == null) return '';
  return String(s).replace(/\*\*(.*?)\*\*/gs, '$1').replace(/__(.*?)__/gs, '$1').replace(/`+/g, '').replace(/^#{1,6}\s+/gm, '').replace(/^\s*[*•]\s+/gm, '').replace(/\r/g, '').trim();
}
export const cleanArr = (a) => (Array.isArray(a) ? a : a ? [a] : []).map(clean).filter(Boolean);

/* ====================== pembaca berkas ====================== */
const CDN = {
  mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js',
  xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  docx: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
  pdfmake: 'https://cdn.jsdelivr.net/npm/pdfmake@0.2.12/build/pdfmake.min.js',
  vfs: 'https://cdn.jsdelivr.net/npm/pdfmake@0.2.12/build/vfs_fonts.js'
};
export const lib = {
  xlsx: async () => { await loadScript(CDN.xlsx); return window.XLSX; },
  docx: async () => { await loadScript(CDN.docx); return window.docx; },
  async pdfmake() { await loadScript(CDN.pdfmake); await loadScript(CDN.vfs); return window.pdfMake; }
};
const b64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const MAX_TEXT_FILE = 60000, MAX_TEXT_TOTAL = 150000;
async function shrinkImage(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.82).split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}
export const FILE_ACCEPT = '.pdf,.docx,.xlsx,.xls,.csv,.pptx,.txt,.md,.json,.html,image/*';
/** Membaca berkas unggahan: gambar dan PDF dikirim ke AI apa adanya, dokumen lain diambil teksnya. */
export async function readFiles(fileList, onProgress) {
  const out = { texts: [], images: [], pdfs: [], skipped: [] }; let total = 0, bytes = 0; const files = [...fileList];
  for (let i = 0; i < files.length; i++) {
    const f = files[i]; const ext = (f.name.split('.').pop() || '').toLowerCase(); onProgress && onProgress(i, files.length, f.name);
    try {
      if (f.size > 20 * 1024 * 1024) { out.skipped.push(`${f.name} (lebih dari 20 MB)`); continue; }
      if (f.type.startsWith('image/')) { if (bytes > 14e6) { out.skipped.push(`${f.name} (batas total terlampaui)`); continue; } const d = await shrinkImage(f); bytes += d.length; out.images.push({ name: f.name, mime: 'image/jpeg', b64: d }); continue; }
      if (ext === 'pdf') { if (bytes + f.size * 1.34 > 16e6) { out.skipped.push(`${f.name} (batas total terlampaui)`); continue; } const d = b64(await f.arrayBuffer()); bytes += d.length; out.pdfs.push({ name: f.name, b64: d }); continue; }
      let text = '';
      if (ext === 'docx') { await loadScript(CDN.mammoth); text = (await window.mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value; }
      else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') { const X = await lib.xlsx(); const wb = X.read(await f.arrayBuffer()); text = wb.SheetNames.map((n) => `# Lembar: ${n}\n${X.utils.sheet_to_csv(wb.Sheets[n])}`).join('\n\n'); }
      else if (ext === 'pptx') {
        await loadScript(CDN.jszip); const z = await window.JSZip.loadAsync(await f.arrayBuffer());
        const names = Object.keys(z.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
        for (const n of names) { const x = await z.files[n].async('string'); text += `\n[Slide ${parseInt(n.match(/\d+/)[0], 10)}] ` + [...x.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(' '); }
      } else if (['txt', 'md', 'json', 'html', 'htm'].includes(ext)) { text = await f.text(); if (ext.startsWith('htm')) text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); }
      else { out.skipped.push(`${f.name} (format belum didukung)`); continue; }
      text = text.replace(/\u0000/g, '').trim(); if (!text) { out.skipped.push(`${f.name} (tidak ada teks yang terbaca)`); continue; }
      if (text.length > MAX_TEXT_FILE) text = text.slice(0, MAX_TEXT_FILE) + '\n[...dipotong]';
      if (total + text.length > MAX_TEXT_TOTAL) { out.skipped.push(`${f.name} (batas teks total terlampaui)`); continue; }
      total += text.length; out.texts.push({ name: f.name, text });
    } catch (e) { out.skipped.push(`${f.name} (${e.message || 'gagal dibaca'})`); }
  }
  return out;
}
export function fileParts(rf) {
  const parts = [];
  rf.texts.forEach((t) => parts.push({ text: `=== BERKAS MATERI: ${t.name} ===\n${t.text}` }));
  rf.images.forEach((im) => { parts.push({ text: `=== GAMBAR MATERI: ${im.name} ===` }); parts.push({ inline_data: { mime_type: im.mime, data: im.b64 } }); });
  rf.pdfs.forEach((p) => { parts.push({ text: `=== PDF MATERI: ${p.name} ===` }); parts.push({ inline_data: { mime_type: 'application/pdf', data: p.b64 } }); });
  return parts;
}

/* ====================== mesin dokumen ====================== */
// Blok: kop, title, sub, h1, h2, h3, p, ul, ol, table, kv, sign, pagebreak
const bold = (s) => `**${s}**`;
export const Doc = { bold };

function inlineHTML(text) {
  const parts = String(text ?? '').split('**'); let o = '';
  parts.forEach((p, i) => { const h = esc(p).replace(/\n/g, '<br>'); o += i % 2 ? `<b>${h}</b>` : h; });
  return o;
}
const cellObj = (c) => (c && typeof c === 'object' && !Array.isArray(c) ? c : { x: c });

Doc.toHTML = (blocks) => {
  let h = '<div class="doc">';
  for (const b of blocks) {
    switch (b.t) {
      case 'kop': h += `<div class="kop" contenteditable="false" data-kop="${esc(JSON.stringify(b))}"><div class="kop-l">${b.logo ? `<img src="${b.logo}" alt="">` : ''}</div><div class="kop-c">${b.lines.map((l) => `<div class="k1">${esc(l)}</div>`).join('')}<div class="k2">${esc(b.nama)}</div>${b.alamat ? `<div class="k3">${esc(b.alamat)}</div>` : ''}${b.kontak ? `<div class="k3">${esc(b.kontak)}</div>` : ''}</div><div class="kop-r"></div></div>`; break;
      case 'title': h += `<h1 class="dt">${inlineHTML(b.text)}</h1>`; break;
      case 'sub': h += `<div class="ds">${inlineHTML(b.text)}</div>`; break;
      case 'h1': h += `<h2>${inlineHTML(b.text)}</h2>`; break;
      case 'h2': h += `<h3>${inlineHTML(b.text)}</h3>`; break;
      case 'h3': h += `<h4>${inlineHTML(b.text)}</h4>`; break;
      case 'p': h += `<p${b.al ? ` style="text-align:${b.al}"` : ''}>${inlineHTML(b.text)}</p>`; break;
      case 'ul': h += `<ul>${(b.items || []).map((i) => `<li>${inlineHTML(i)}</li>`).join('')}</ul>`; break;
      case 'ol': h += `<ol>${(b.items || []).map((i) => `<li>${inlineHTML(i)}</li>`).join('')}</ol>`; break;
      case 'kv': h += `<table class="kv"><tbody>${(b.rows || []).map((r) => `<tr><td>${inlineHTML(r[0])}</td><td>:</td><td>${inlineHTML(r[1])}</td></tr>`).join('')}</tbody></table>`; break;
      case 'table': {
        const w = b.widths; const cg = w ? `<colgroup>${w.map((x) => `<col style="width:${x}%">`).join('')}</colgroup>` : '';
        const cell = (c, tag) => { const o = cellObj(c); const st = [o.al && `text-align:${o.al}`, o.fill && `background:${o.fill}`].filter(Boolean).join(';'); return `<${tag}${o.cs ? ` colspan="${o.cs}"` : ''}${o.rs ? ` rowspan="${o.rs}"` : ''}${o.fill ? ` data-fill="${o.fill}"` : ''}${st ? ` style="${st}"` : ''}>${inlineHTML(o.x)}</${tag}>`; };
        h += `<table class="t${b.small ? ' small' : ''}">${cg}${b.head && b.head.length ? `<thead>${(Array.isArray(b.head[0]) ? b.head : [b.head]).map((r) => `<tr>${r.map((c) => cell(c, 'th')).join('')}</tr>`).join('')}</thead>` : ''}<tbody>${(b.rows || []).map((r) => `<tr>${r.map((c) => cell(c, 'td')).join('')}</tr>`).join('')}</tbody></table>`; break;
      }
      case 'sign': h += `<div class="sign" contenteditable="false" data-sign="${esc(JSON.stringify(b))}">${(b.cols || []).map((c) => `<div class="sc">${c.top ? `<div>${esc(c.top)}</div>` : '<div>&nbsp;</div>'}<div>${esc(c.role || '')}</div><div class="gap"></div><div class="nm">${esc(c.nama || '..........................')}</div>${c.nip ? `<div>NIP. ${esc(c.nip)}</div>` : ''}</div>`).join('')}</div>`; break;
      case 'pagebreak': h += '<div class="pb" contenteditable="false">&nbsp;</div>'; break;
      default: break;
    }
  }
  return h + '</div>';
};

function markupFromNode(n) {
  let s = '';
  n.childNodes.forEach((c) => {
    if (c.nodeType === 3) s += c.nodeValue.replace(/ /g, ' ');
    else if (c.nodeType === 1) {
      const tag = c.tagName;
      if (tag === 'BR') s += '\n';
      else if (tag === 'B' || tag === 'STRONG' || /bold|[6-9]00/.test(c.style.fontWeight || '')) s += '**' + markupFromNode(c) + '**';
      else s += markupFromNode(c);
    }
  });
  return s.replace(/\*\*\*\*/g, '').replace(/\n+$/g, '');
}
Doc.fromDOM = (root) => {
  const out = [];
  const walk = (parent) => {
    [...parent.children].forEach((el) => {
      const cls = el.classList;
      if (cls.contains('kop')) { try { out.push(JSON.parse(el.dataset.kop)); } catch { /* lewati */ } return; }
      if (cls.contains('sign')) { try { out.push(JSON.parse(el.dataset.sign)); } catch { /* lewati */ } return; }
      if (cls.contains('pb')) { out.push({ t: 'pagebreak' }); return; }
      switch (el.tagName) {
        case 'H1': out.push({ t: 'title', text: markupFromNode(el) }); break;
        case 'H2': out.push({ t: 'h1', text: markupFromNode(el) }); break;
        case 'H3': out.push({ t: 'h2', text: markupFromNode(el) }); break;
        case 'H4': out.push({ t: 'h3', text: markupFromNode(el) }); break;
        case 'P': out.push({ t: 'p', text: markupFromNode(el), al: el.style.textAlign || '' }); break;
        case 'UL': case 'OL': out.push({ t: el.tagName === 'UL' ? 'ul' : 'ol', items: [...el.children].map((li) => markupFromNode(li)) }); break;
        case 'TABLE': {
          if (cls.contains('kv')) { out.push({ t: 'kv', rows: [...el.rows].map((r) => [markupFromNode(r.cells[0]), markupFromNode(r.cells[2] || r.cells[1])]) }); break; }
          const widths = [...el.querySelectorAll('colgroup col')].map((c) => parseFloat(c.style.width)).filter((x) => !isNaN(x));
          const rowOf = (r) => [...r.cells].map((c) => { const o = { x: markupFromNode(c) }; if (c.colSpan > 1) o.cs = c.colSpan; if (c.rowSpan > 1) o.rs = c.rowSpan; if (c.style.textAlign) o.al = c.style.textAlign; if (c.dataset.fill) o.fill = c.dataset.fill; return o; });
          out.push({ t: 'table', widths: widths.length ? widths : null, small: cls.contains('small'), head: el.tHead ? [...el.tHead.rows].map(rowOf) : [], rows: [...(el.tBodies[0] ? el.tBodies[0].rows : [])].map(rowOf) });
          break;
        }
        case 'DIV': if (cls.contains('ds')) out.push({ t: 'sub', text: markupFromNode(el) }); else if (el.querySelector('p,h2,h3,h4,table,ul,ol')) walk(el); else if (el.textContent.trim()) out.push({ t: 'p', text: markupFromNode(el) }); break;
        default: break;
      }
    });
  };
  walk(root.classList.contains('doc') ? root : (root.querySelector('.doc') || root));
  return out;
};

/* ---- Word ---- */
function dataUrlBytes(u) { const b = atob(u.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
function imgSize(u) { return new Promise((res) => { const i = new Image(); i.onload = () => res([i.width, i.height]); i.onerror = () => res([1, 1]); i.src = u; }); }
Doc.toDocx = async (blocks, o = {}) => {
  const D = await lib.docx(); const font = o.font || 'Times New Roman'; const sz = (o.size || 12) * 2; const tsz = Math.round(sz * 0.9);
  const runs = (text, extra = {}) => {
    const out = []; String(text ?? '').split('**').forEach((seg, i) => {
      String(seg).split('\n').forEach((ln, j) => { if (ln === '' && j === 0 && seg === '') return; out.push(new D.TextRun({ text: ln, bold: i % 2 === 1 || extra.bold, italics: extra.italics, font, size: extra.size || sz, break: j > 0 ? 1 : undefined, color: extra.color })); });
    }); return out.length ? out : [new D.TextRun({ text: '', font, size: sz })];
  };
  const NB = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }; const noB = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
  const LB = { style: D.BorderStyle.SINGLE, size: 4, color: '000000' }; const allB = { top: LB, bottom: LB, left: LB, right: LB };
  const numbering = [{ reference: 'bul', levels: [{ level: 0, format: D.LevelFormat.BULLET, text: '•', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }];
  let olCount = 0; const kids = []; const TW = o.landscape ? 14570 : 9355; const dx = (pct) => Math.round((pct / 100) * TW); const DXA = (pct) => ({ size: dx(pct), type: D.WidthType.DXA });
  const al = (x) => ({ center: D.AlignmentType.CENTER, right: D.AlignmentType.RIGHT, justify: D.AlignmentType.JUSTIFIED }[x] || D.AlignmentType.LEFT);
  for (const b of blocks) {
    if (b.t === 'kop') {
      const lines = []; b.lines.forEach((l, i) => lines.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 0 }, children: [new D.TextRun({ text: l, bold: true, font, size: i === 0 ? 24 : 26 })] })));
      lines.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 0 }, children: [new D.TextRun({ text: b.nama, bold: true, font, size: 32 })] }));
      if (b.alamat) lines.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 0 }, children: [new D.TextRun({ text: b.alamat, font, size: 19 })] }));
      if (b.kontak) lines.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 0 }, children: [new D.TextRun({ text: b.kontak, font, size: 19 })] }));
      let left = [new D.Paragraph('')];
      if (b.logo) { const [w, h] = await imgSize(b.logo); const k = 72 / Math.max(w, h); left = [new D.Paragraph({ children: [new D.ImageRun({ data: dataUrlBytes(b.logo), transformation: { width: Math.round(w * k), height: Math.round(h * k) } })] })]; }
      kids.push(new D.Table({ width: DXA(100), layout: D.TableLayoutType.FIXED, borders: noB, columnWidths: [dx(15), dx(70), dx(15)], rows: [new D.TableRow({ children: [
        new D.TableCell({ width: DXA(15), borders: noB, children: left }),
        new D.TableCell({ width: DXA(70), borders: noB, children: lines }),
        new D.TableCell({ width: DXA(15), borders: noB, children: [new D.Paragraph('')] })] })] }));
      kids.push(new D.Paragraph({ spacing: { after: 200 }, border: { bottom: { style: D.BorderStyle.DOUBLE, size: 6, color: '000000', space: 1 } }, children: [] }));
    } else if (b.t === 'title') kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: runs(b.text, { bold: true, size: sz + 4 }) }));
    else if (b.t === 'sub') kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 160 }, children: runs(b.text, { italics: true }) }));
    else if (b.t === 'h1') kids.push(new D.Paragraph({ spacing: { before: 240, after: 100 }, keepNext: true, children: runs(b.text, { bold: true, size: sz + 2 }) }));
    else if (b.t === 'h2') kids.push(new D.Paragraph({ spacing: { before: 160, after: 80 }, keepNext: true, children: runs(b.text, { bold: true }) }));
    else if (b.t === 'h3') kids.push(new D.Paragraph({ spacing: { before: 120, after: 60 }, keepNext: true, children: runs(b.text, { bold: true, italics: true }) }));
    else if (b.t === 'p') kids.push(new D.Paragraph({ alignment: al(b.al || 'justify'), spacing: { after: 100, line: 276 }, children: runs(b.text) }));
    else if (b.t === 'ul') (b.items || []).forEach((i) => kids.push(new D.Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 40 }, children: runs(i) })));
    else if (b.t === 'ol') { const ref = 'ol' + (++olCount); numbering.push({ reference: ref, levels: [{ level: 0, format: D.LevelFormat.DECIMAL, text: '%1.', alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }); (b.items || []).forEach((i) => kids.push(new D.Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 40 }, children: runs(i) }))); }
    else if (b.t === 'kv') kids.push(new D.Table({ width: DXA(100), layout: D.TableLayoutType.FIXED, columnWidths: [dx(28), dx(3), dx(69)], borders: noB, rows: (b.rows || []).map((r) => new D.TableRow({ children: [
      new D.TableCell({ width: DXA(28), borders: noB, children: [new D.Paragraph({ spacing: { after: 20 }, children: runs(r[0]) })] }),
      new D.TableCell({ width: DXA(3), borders: noB, children: [new D.Paragraph({ spacing: { after: 20 }, children: runs(':') })] }),
      new D.TableCell({ width: DXA(69), borders: noB, children: [new D.Paragraph({ spacing: { after: 20 }, children: runs(r[1]) })] })] })) }));
    else if (b.t === 'table') {
      const hs = Array.isArray(b.head && b.head[0]) || (b.head && b.head[0] && typeof b.head[0] === 'object' && !b.head[0].x && !('cs' in b.head[0]) && Array.isArray(b.head[0])) ? b.head : (b.head && b.head.length ? [b.head] : []);
      const headRows = hs.length && Array.isArray(hs[0]) ? hs : (b.head && b.head.length ? [b.head] : []);
      const ncols = b.widths ? b.widths.length : Math.max(1, ...[...headRows, ...(b.rows || [])].map((r) => r.reduce((a, c) => a + (cellObj(c).cs || 1), 0)));
      const cw = b.widths ? b.widths.map((x) => dx(x)) : Array(ncols).fill(Math.round(TW / ncols));
      const mk = (r, isHead, ri) => {
        const cells = []; let col = 0;
        r.forEach((c) => { const ob = cellObj(c); const span = ob.cs || 1; const w = b.widths ? b.widths.slice(col, col + span).reduce((a, x) => a + x, 0) : 100 / Math.max(1, ncols) * span; col += span;
          cells.push(new D.TableCell({ columnSpan: span > 1 ? span : undefined, rowSpan: ob.rs > 1 ? ob.rs : undefined, width: DXA(w), borders: allB, verticalAlign: D.VerticalAlign.CENTER, margins: { top: 40, bottom: 40, left: 80, right: 80 },
            shading: isHead ? { type: D.ShadingType.CLEAR, color: 'auto', fill: 'D9D9D9' } : (ob.fill ? { type: D.ShadingType.CLEAR, color: 'auto', fill: String(ob.fill).replace('#', '') } : undefined),
            children: String(ob.x ?? '').split('\n').map((ln) => new D.Paragraph({ alignment: isHead ? D.AlignmentType.CENTER : al(ob.al || 'left'), spacing: { after: 0 }, children: runs(ln, { bold: isHead, size: b.small ? tsz - 2 : tsz }) })) })); });
        return new D.TableRow({ tableHeader: isHead, cantSplit: true, children: cells });
      };
      kids.push(new D.Table({ width: DXA(100), layout: D.TableLayoutType.FIXED, columnWidths: cw, rows: [...headRows.map((r) => mk(r, true)), ...(b.rows || []).map((r) => mk(r, false))] }));
      kids.push(new D.Paragraph({ spacing: { after: 80 }, children: [] }));
    } else if (b.t === 'sign') {
      const cols = b.cols || []; const w = Math.floor(100 / Math.max(cols.length, 1));
      kids.push(new D.Paragraph({ spacing: { before: 200 }, children: [] }));
      kids.push(new D.Table({ width: DXA(100), layout: D.TableLayoutType.FIXED, columnWidths: cols.map(() => dx(w)), borders: noB, rows: [new D.TableRow({ cantSplit: true, children: cols.map((c) => new D.TableCell({ width: DXA(w), borders: noB, children: [
        new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: runs(c.top || ' ') }), new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: runs(c.role || ' ') }),
        new D.Paragraph({ spacing: { before: 900 }, alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: c.nama || '..........................', bold: true, underline: {}, font, size: sz })] }),
        ...(c.nip ? [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: runs('NIP. ' + c.nip) })] : [])] })) })] }));
    } else if (b.t === 'pagebreak') kids.push(new D.Paragraph({ children: [new D.PageBreak()] }));
  }
  const doc = new D.Document({
    creator: o.author || 'Arif Digital', title: o.title || 'Dokumen', numbering: { config: numbering },
    styles: { default: { document: { run: { font, size: sz } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: o.landscape ? D.PageOrientation.LANDSCAPE : D.PageOrientation.PORTRAIT }, margin: { top: 1134, bottom: 1134, left: o.landscape ? 1134 : 1417, right: 1134 } } },
      footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ children: ['Halaman ', D.PageNumber.CURRENT], font, size: 18, color: '666666' })] })] }) }, children: kids }]
  });
  return D.Packer.toBlob(doc);
};

/* ---- PDF (pdfmake) ---- */
let tinosReady = null;
async function ensureTinos(pm) {
  if (tinosReady !== null) return tinosReady;
  const base = 'https://cdn.jsdelivr.net/gh/google/fonts@main/apache/tinos/';
  const files = { normal: 'Tinos-Regular.ttf', bold: 'Tinos-Bold.ttf', italics: 'Tinos-Italic.ttf', bolditalics: 'Tinos-BoldItalic.ttf' };
  try {
    const entries = await Promise.all(Object.entries(files).map(async ([k, f]) => { const r = await fetch(base + f); if (!r.ok) throw new Error('font'); return [k, f, b64(await r.arrayBuffer())]; }));
    entries.forEach(([, f, d]) => { pm.vfs[f] = d; });
    pm.fonts = { ...(pm.fonts || {}), Tinos: Object.fromEntries(entries.map(([k, f]) => [k, f])) }; tinosReady = true;
  } catch { tinosReady = false; }
  return tinosReady;
}
Doc.pdfDef = async (blocks, o = {}) => {
  const pm = await lib.pdfmake(); const useTinos = (o.font || 'Times New Roman') !== 'Arial' && await ensureTinos(pm); const font = useTinos ? 'Tinos' : 'Roboto';
  const fs = o.size || 12; const land = !!o.landscape; const margins = land ? [40, 40, 40, 40] : [60, 50, 40, 50]; const avail = (land ? 841.89 : 595.28) - margins[0] - margins[2];
  const rich = (t, base = {}) => { const out = []; String(t ?? '').split('**').forEach((s, i) => { if (s) out.push({ text: s, bold: i % 2 === 1 || base.bold, italics: base.italics }); }); return out.length ? out : [{ text: ' ' }]; };
  const content = [];
  for (const b of blocks) {
    if (b.t === 'kop') {
      const stack = [...b.lines.map((l, i) => ({ text: l, bold: true, fontSize: i === 0 ? 12 : 13, alignment: 'center' })), { text: b.nama, bold: true, fontSize: 16, alignment: 'center' }];
      if (b.alamat) stack.push({ text: b.alamat, fontSize: 9, alignment: 'center' }); if (b.kontak) stack.push({ text: b.kontak, fontSize: 9, alignment: 'center' });
      content.push({ columns: [b.logo ? { image: b.logo, width: 58, height: 58 } : { text: '', width: 58 }, { stack, width: '*' }, { text: '', width: 58 }], columnGap: 6 });
      content.push({ canvas: [{ type: 'line', x1: 0, y1: 3, x2: avail, y2: 3, lineWidth: 2 }, { type: 'line', x1: 0, y1: 7, x2: avail, y2: 7, lineWidth: 0.6 }], margin: [0, 0, 0, 10] });
    } else if (b.t === 'title') content.push({ text: rich(b.text, { bold: true }), fontSize: fs + 2, alignment: 'center', margin: [0, 6, 0, 4] });
    else if (b.t === 'sub') content.push({ text: rich(b.text, { italics: true }), alignment: 'center', margin: [0, 0, 0, 8] });
    else if (b.t === 'h1') content.push({ text: rich(b.text, { bold: true }), fontSize: fs + 1, margin: [0, 12, 0, 5] });
    else if (b.t === 'h2') content.push({ text: rich(b.text, { bold: true }), margin: [0, 8, 0, 4] });
    else if (b.t === 'h3') content.push({ text: rich(b.text, { bold: true, italics: true }), margin: [0, 6, 0, 3] });
    else if (b.t === 'p') content.push({ text: rich(b.text), alignment: b.al || 'justify', margin: [0, 0, 0, 5], lineHeight: 1.2 });
    else if (b.t === 'ul') content.push({ ul: (b.items || []).map((i) => ({ text: rich(i) })), margin: [8, 0, 0, 5] });
    else if (b.t === 'ol') content.push({ ol: (b.items || []).map((i) => ({ text: rich(i) })), margin: [8, 0, 0, 5] });
    else if (b.t === 'kv') content.push({ table: { widths: [avail * 0.26, 8, '*'], body: (b.rows || []).map((r) => [{ text: rich(r[0]) }, ':', { text: rich(r[1]) }]) }, layout: 'noBorders', margin: [0, 0, 0, 6] });
    else if (b.t === 'table') {
      const headRows = !b.head || !b.head.length ? [] : (Array.isArray(b.head[0]) ? b.head : [b.head]);
      const ncol = Math.max(...[...headRows, ...(b.rows || [])].map((r) => r.reduce((a, c) => a + (cellObj(c).cs || 1), 0)), 1);
      const usable = avail - ncol * 6 - 2; const widths = b.widths && b.widths.length === ncol ? b.widths.map((w) => (w / 100) * usable) : Array(ncol).fill('*');
      const fsz = b.small ? fs - 4 : fs - 1.5;
      const mkRow = (r, head) => { const row = []; r.forEach((c) => { const ob = cellObj(c); const cell = { text: rich(ob.x, { bold: head }), alignment: head ? 'center' : (ob.al || 'left'), fontSize: fsz, fillColor: head ? '#d9d9d9' : (ob.fill || undefined) }; if (ob.cs > 1) { cell.colSpan = ob.cs; row.push(cell); for (let k = 1; k < ob.cs; k++) row.push({}); } else row.push(cell); }); return row; };
      content.push({ table: { headerRows: headRows.length, widths, body: [...headRows.map((r) => mkRow(r, true)), ...(b.rows || []).map((r) => mkRow(r, false))], dontBreakRows: true }, layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, paddingTop: () => 3, paddingBottom: () => 3, paddingLeft: () => 3, paddingRight: () => 3 }, margin: [0, 0, 0, 8] });
    } else if (b.t === 'sign') {
      const cols = b.cols || [];
      content.push({ columns: cols.map((c) => ({ width: '*', alignment: 'center', stack: [{ text: c.top || ' ' }, { text: c.role || ' ' }, { text: ' ', margin: [0, 28, 0, 0] }, { text: c.nama || '..........................', bold: true, decoration: 'underline' }, ...(c.nip ? [{ text: 'NIP. ' + c.nip }] : [])] })), margin: [0, 14, 0, 0], unbreakable: true });
    } else if (b.t === 'pagebreak') content.push({ text: '', pageBreak: 'after' });
  }
  if (content.length && content[content.length - 1].pageBreak) content.pop();
  return { pageSize: 'A4', pageOrientation: land ? 'landscape' : 'portrait', pageMargins: margins, info: { title: o.title || 'Dokumen', author: o.author || 'Arif Digital' }, defaultStyle: { font, fontSize: fs }, content,
    footer: (cur, total) => ({ text: `Halaman ${cur} dari ${total}`, alignment: 'center', fontSize: 8, color: '#777', margin: [0, 10, 0, 0] }) };
};
Doc.toPdfBlob = async (blocks, o = {}) => { const pm = await lib.pdfmake(); const def = await Doc.pdfDef(blocks, o); return new Promise((res, rej) => { try { pm.createPdf(def).getBlob(res); } catch (e) { rej(e); } }); };

/* ---- cetak ---- */
export const DOC_CSS = `
.doc{font-family:'Times New Roman',Tinos,serif;font-size:12pt;line-height:1.45;color:#000;background:#fff}
.doc h1.dt{font-size:14pt;text-align:center;margin:10px 0 4px}.doc .ds{text-align:center;font-style:italic;margin-bottom:10px}
.doc h2{font-size:13pt;margin:18px 0 6px}.doc h3{font-size:12pt;margin:12px 0 5px}.doc h4{font-size:12pt;font-style:italic;margin:9px 0 4px}
.doc p{margin:0 0 7px;text-align:justify}.doc ul,.doc ol{margin:0 0 8px 22px}.doc li{margin-bottom:2px}
.doc table{border-collapse:collapse;width:100%;margin:6px 0 10px}.doc table.t th,.doc table.t td{border:1px solid #000;padding:3px 6px;vertical-align:top;font-size:11pt}.doc table.t.small th,.doc table.t.small td{font-size:9pt;padding:2px 3px}
.doc table.t th{background:#d9d9d9;text-align:center}.doc table.kv td{border:none;padding:1px 4px;vertical-align:top}.doc table.kv td:first-child{width:28%}.doc table.kv td:nth-child(2){width:2%}
.doc .kop{display:grid;grid-template-columns:76px 1fr 76px;align-items:center;gap:6px;border-bottom:3px double #000;padding-bottom:6px;margin-bottom:12px}
.doc .kop img{max-height:72px;max-width:72px}.doc .kop-c{text-align:center}.doc .k1{font-weight:700;font-size:12pt}.doc .k2{font-weight:700;font-size:16pt}.doc .k3{font-size:9.5pt}
.doc .sign{display:flex;justify-content:space-around;gap:12px;margin-top:22px;break-inside:avoid;text-align:center}.doc .sign .sc{flex:1}.doc .sign .gap{height:62px}.doc .sign .nm{font-weight:700;text-decoration:underline}
.doc .pb{break-after:page;height:0;overflow:hidden;color:transparent}
`;
Doc.print = (el, { landscape = false, title = 'Cetak' } = {}) => {
  const cl = el.cloneNode(true); cl.style.zoom = ''; const html = cl.outerHTML.replace(/ contenteditable="[^"]*"/g, '');
  const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'; document.body.appendChild(fr);
  const d = fr.contentDocument; d.open();
  d.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:${landscape ? '12mm' : '18mm 16mm'}}body{margin:0}${DOC_CSS}</style></head><body>${html}</body></html>`); d.close();
  setTimeout(() => { fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(() => fr.remove(), 2000); }, 450);
};

/* ---- Excel: semua tabel pada dokumen menjadi lembar kerja ---- */
Doc.toXlsx = async (blocks, name = 'Dokumen') => {
  const X = await lib.xlsx(); const wb = X.utils.book_new(); let n = 0;
  const plain = (s) => String(s ?? '').replace(/\*\*/g, '');
  const title = (blocks.find((b) => b.t === 'title') || {}).text || name;
  for (const b of blocks) {
    if (b.t !== 'table') continue; n++;
    const aoa = []; const merges = []; const heads = !b.head || !b.head.length ? [] : (Array.isArray(b.head[0]) ? b.head : [b.head]);
    const pushRow = (r) => { const row = []; const ri = aoa.length; let col = 0; r.forEach((c) => { const o = cellObj(c); while (aoa[ri] && 0) col++; row[col] = plain(o.x); if (o.cs > 1) { merges.push({ s: { r: ri, c: col }, e: { r: ri, c: col + o.cs - 1 } }); col += o.cs; } else col++; }); aoa.push(row); };
    heads.forEach(pushRow); (b.rows || []).forEach(pushRow);
    const ws = X.utils.aoa_to_sheet(aoa); ws['!merges'] = merges;
    const cols = []; aoa.forEach((r) => r.forEach((v, i) => { cols[i] = Math.min(60, Math.max(cols[i] || 8, String(v ?? '').split('\n').reduce((m, l) => Math.max(m, l.length), 0) + 2)); })); ws['!cols'] = cols.map((w) => ({ wch: w }));
    X.utils.book_append_sheet(wb, ws, (`Tabel ${n}`).slice(0, 31));
  }
  if (!n) throw new Error('Dokumen ini tidak memiliki tabel untuk diekspor ke Excel.');
  const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/* ---- ZIP beberapa berkas ---- */
export async function zipFiles(files) {
  await loadScript(CDN.jszip); const z = new window.JSZip(); files.forEach((f) => z.file(f.name, f.blob)); return z.generateAsync({ type: 'blob' });
}

/* ---- suntik gaya dokumen ---- */
(function injectDocCSS() { if (typeof document === 'undefined' || document.getElementById('adDocCss')) return; const s = document.createElement('style'); s.id = 'adDocCss'; s.textContent = DOC_CSS; document.head.appendChild(s); })();

/* ---- ikon (Lucide) ---- */
export function icons() { if (window.lucide) window.lucide.createIcons(); }
