'use strict';

/* ============================================================
   SHIFT RADIOLOGI — engine + UI  (v0.1)
   Aplikasi jadwal shift mandiri, offline-first (PWA).
   Pengguna saat ini: Fakhrul Aldia Nugraha (Aldi).

   Catatan arsitektur:
   - Jadwal = POLA DASAR (deterministik) + PENYESUAIAN (menyusul).
   - Versi ini mengisi pola dasar + Beranda + Kalender ternavigasi.
   - Lapisan penyesuaian (cuti, pengganti, double shift, hutang
     dinas, deteksi konflik berwarna) menyusul di versi berikutnya.
   ============================================================ */

/* ---------------- Konfigurasi dasar ---------------- */

// Siklus rotasi 8 hari: 2 Pagi, 2 Sore, 2 Malam, 2 Libur.
const CYCLE = ['P', 'P', 'S', 'S', 'M', 'M', 'L', 'L'];

// Titik jangkar: 1 Mei 2026. `phase` = indeks awal tiap rotator di tanggal ini.
const REF = Date.UTC(2026, 4, 1);

// Daftar petugas. Dua kelas: 'rotator' (ikut siklus) & 'cadangan' (pagi + libur).
const STAFF = [
  { id:'dina',     name:'dr. Dina Rahman, Sp.Rad',         short:'dr. Dina', role:'Dokter Sp. Radiologi',  type:'cadangan', canSub:false, phone:'085156862399' },
  { id:'anisa',    name:'Anisa, A.MR',                     short:'Anisa',    role:'Radiografer',           type:'cadangan', canSub:true,  phone:'082149890001' },
  { id:'didit',    name:'Didit Rahmani, A.MR',             short:'Didit',    role:'Radiografer',           type:'rotator',  phase:0,      phone:'085291714535' },
  { id:'humaidi',  name:'Humaidi, A.MR',                   short:'Humaidi',  role:'Radiografer',           type:'rotator',  phase:6,      phone:'082358584801' },
  { id:'aldi',     name:'Fakhrul Aldia Nugraha, A.Md.Rad', short:'Aldi',     role:'Radiografer',           type:'rotator',  phase:2,      phone:'082150246446', isUser:true, nip:'199703152019031001' },
  { id:'luthfi',   name:'Muhamad Luthfi S, A.Md.Rad',      short:'Luthfi',   role:'Radiografer',           type:'rotator',  phase:4,      phone:'082228374650' },
  { id:'muhraini', name:'Muhraini Apriani, A.Md.Rad',      short:'Muhraini', role:'Radiografer (pengganti)', type:'cadangan', canSub:true, isSubstitute:true, phone:'082150429380' },
  { id:'ano',      name:'Ano',                             short:'Ano',      role:'Petugas',               type:'cadangan', canSub:true,  phone:'081549326959' },
];

// Info tiap shift: label, rentang jam, kelas warna (lihat styles.css).
const SHIFT = {
  P: { key:'P', label:'Pagi',  time:'06.50 – 14.10', cls:'pagi'  },
  S: { key:'S', label:'Sore',  time:'13.45 – 20.10', cls:'sore'  },
  M: { key:'M', label:'Malam', time:'19.45 – 07.10', cls:'malam' },
  L: { key:'L', label:'Libur', time:'',              cls:'libur' },
};

// Tanggal merah nasional (tetap). Petugas cadangan otomatis libur pada
// hari Minggu + tanggal di bawah ini. Tambah / sinkronkan daftarnya di sini.
const HOLIDAYS = {
  '2026-01-01': 'Tahun Baru Masehi',
  '2026-05-01': 'Hari Buruh',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-08-17': 'Hari Kemerdekaan RI',
  '2026-12-25': 'Hari Natal',
};

// Tautan absensi institusi. Aplikasi ini berdiri sendiri — hanya menautkan,
// dan tautan terbuka di browser yang sedang dipakai (sesuai default pengguna).
const ABSEN = [
  { label:'SI-PASTI', sub:'Absen utama',    url:'https://pasti.seruyankab.go.id/' },
  { label:'SI-PALUI', sub:'Absen cadangan', url:'https://palui.seruyankab.go.id/' },
];

const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI3 = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];           // grid mulai Senin
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

/* ---------------- Engine ---------------- */

const USER = STAFF.find(s => s.isUser);

const dayNo  = d => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - REF) / 86400000);
const pad    = n => String(n).padStart(2, '0');
const keyOf  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const isSun  = d => d.getDay() === 0;
const holiday= d => HOLIDAYS[keyOf(d)] || null;
const sameDay= (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

// Shift dasar seseorang pada satu tanggal (sebelum penyesuaian).
function shiftOf(staff, date){
  if (staff.type === 'rotator'){
    const idx = (((staff.phase + dayNo(date)) % 8) + 8) % 8;
    return CYCLE[idx];
  }
  return (isSun(date) || holiday(date)) ? 'L' : 'P';   // cadangan
}

// Susunan tim pada satu tanggal → { P:[...], S:[...], M:[...], L:[...] }.
function teamForDate(date){
  const out = { P:[], S:[], M:[], L:[] };
  for (const s of STAFF) out[shiftOf(s, date)].push(s);
  return out;
}

// Rekap shift seseorang dalam satu bulan.
function monthTally(staff, year, month){
  const t = { P:0, S:0, M:0, L:0 };
  const n = new Date(year, month+1, 0).getDate();
  for (let d=1; d<=n; d++) t[shiftOf(staff, new Date(year, month, d))]++;
  return t;
}

const greeting = h => h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam';

/* ---------------- State ---------------- */

const today = new Date();
const state = { view:'beranda', y: today.getFullYear(), m: today.getMonth() };

/* ---------------- Util render ---------------- */

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function chip(staff, shiftKey){
  const me = staff.isUser ? ' chip--me' : '';
  return `<span class="chip chip--${SHIFT[shiftKey].cls}${me}">${esc(staff.short)}</span>`;
}

function shiftGroup(label, key, list){
  if (!list.length) return '';
  const s = SHIFT[key];
  return `
    <div class="grp grp--${s.cls}">
      <div class="grp__head">
        <span class="grp__dot"></span>
        <span class="grp__label">${s.label}</span>
        ${s.time ? `<span class="grp__time">${s.time}</span>` : ''}
        <span class="grp__count">${list.length}</span>
      </div>
      <div class="grp__chips">${list.map(p => chip(p, key)).join('')}</div>
    </div>`;
}

/* ---------------- Beranda ---------------- */

function renderBeranda(){
  const sh = shiftOf(USER, today);
  const s  = SHIFT[sh];
  const team = teamForDate(today);
  const hol  = holiday(today);

  const heroNote = sh === 'L'
    ? 'Tidak ada jadwal hari ini — selamat beristirahat.'
    : `Dinas <strong>${s.label}</strong> hari ini, pukul ${s.time}.`;

  return `
  <header class="topbar">
    <div class="topbar__row">
      <div class="brand">
        <span class="brand__mark" aria-hidden="true"></span>
        <span class="brand__name">Shift Radiologi</span>
      </div>
      <button class="iconbtn" type="button" aria-label="Pengaturan" disabled>⋯</button>
    </div>
    <div class="hi">
      <div class="hi__greet">${greeting(today.getHours())},</div>
      <div class="hi__name">${esc(USER.short)}</div>
      <div class="hi__sub">${esc(USER.role)} · NIP ${esc(USER.nip)}</div>
    </div>
  </header>

  <main class="page">
    <section class="hero hero--${s.cls}">
      <div class="hero__date">${HARI[today.getDay()]}, ${today.getDate()} ${BULAN[today.getMonth()]} ${today.getFullYear()}</div>
      ${hol ? `<div class="hero__flag">Tanggal merah · ${esc(hol)}</div>` : ''}
      <div class="hero__shift">${s.label}</div>
      <div class="hero__note">${heroNote}</div>
    </section>

    <section class="block">
      <h2 class="block__title">Bertugas hari ini</h2>
      ${shiftGroup('Pagi','P',team.P)}
      ${shiftGroup('Sore','S',team.S)}
      ${shiftGroup('Malam','M',team.M)}
      ${team.L.length ? `<div class="restline">Libur: ${team.L.map(p=>esc(p.short)).join(', ')}</div>` : ''}
    </section>

    <section class="block">
      <h2 class="block__title">Lanjut absen</h2>
      <p class="block__hint">Aplikasi terpisah dari sistem absensi — tombol membuka situsnya di tab baru.</p>
      <div class="absen">
        ${ABSEN.map(a => `
          <a class="absen__btn" href="${a.url}" target="_blank" rel="noopener noreferrer">
            <span class="absen__label">${a.label}</span>
            <span class="absen__sub">${a.sub}</span>
            <span class="absen__go" aria-hidden="true">↗</span>
          </a>`).join('')}
      </div>
    </section>
  </main>`;
}

/* ---------------- Kalender ---------------- */

function renderKalender(){
  const { y, m } = state;
  const tally = monthTally(USER, y, m);
  const first = new Date(y, m, 1);
  const lead  = (first.getDay() + 6) % 7;               // berapa sel kosong sebelum tgl 1 (mulai Senin)
  const days  = new Date(y, m+1, 0).getDate();

  let cells = '';
  for (let i = 0; i < lead; i++) cells += `<div class="cell cell--empty"></div>`;
  for (let d = 1; d <= days; d++){
    const date = new Date(y, m, d);
    const sh = shiftOf(USER, date);
    const s  = SHIFT[sh];
    const tn = sameDay(date, today) ? ' cell--today' : '';
    const hl = holiday(date) ? ' cell--holiday' : '';
    cells += `
      <button type="button" class="cell cell--${s.cls}${tn}${hl}" data-day="${d}">
        <span class="cell__num">${d}</span>
        <span class="cell__sh">${sh === 'L' ? 'Libur' : s.label}</span>
        ${s.time ? `<span class="cell__time">${s.time.split(' – ')[0]}</span>` : ''}
      </button>`;
  }

  return `
  <header class="topbar topbar--cal">
    <div class="topbar__row">
      <h1 class="cal__title">${BULAN[m]} ${y}</h1>
      <div class="cal__nav">
        <button class="navbtn" type="button" data-nav="-1" aria-label="Bulan sebelumnya">‹</button>
        <button class="navbtn navbtn--now" type="button" data-nav="now">Hari ini</button>
        <button class="navbtn" type="button" data-nav="1" aria-label="Bulan berikutnya">›</button>
      </div>
    </div>
    <div class="cal__sub">Jadwal ${esc(USER.short)} · ketuk tanggal untuk lihat tim</div>
  </header>

  <main class="page">
    <section class="calwrap">
      <div class="dow">${HARI3.map(d => `<span>${d}</span>`).join('')}</div>
      <div class="grid">${cells}</div>
    </section>

    <section class="tally">
      ${['P','S','M','L'].map(k => `
        <div class="tally__item tally__item--${SHIFT[k].cls}">
          <span class="tally__n">${tally[k]}</span>
          <span class="tally__l">${SHIFT[k].label}</span>
        </div>`).join('')}
    </section>

    <section class="legend">
      ${['P','S','M','L'].map(k => `<span class="legend__i"><span class="legend__d legend__d--${SHIFT[k].cls}"></span>${SHIFT[k].label}</span>`).join('')}
    </section>
  </main>`;
}

/* ---------------- Lembar detail tanggal ---------------- */

function openDay(d){
  const date = new Date(state.y, state.m, d);
  const team = teamForDate(date);
  const hol  = holiday(date);
  const myShift = SHIFT[shiftOf(USER, date)];

  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true" aria-label="Detail jadwal">
      <div class="sheet__grab"></div>
      <div class="sheet__head">
        <div>
          <div class="sheet__date">${HARI[date.getDay()]}, ${d} ${BULAN[date.getMonth()]} ${date.getFullYear()}</div>
          ${hol ? `<div class="sheet__flag">Tanggal merah · ${esc(hol)}</div>` : ''}
        </div>
        <button class="iconbtn" type="button" data-close aria-label="Tutup">✕</button>
      </div>
      <div class="sheet__me sheet__me--${myShift.cls}">
        Kamu: <strong>${myShift.label}</strong>${myShift.time ? ` · ${myShift.time}` : ''}
      </div>
      <div class="sheet__body">
        ${shiftGroup('Pagi','P',team.P)}
        ${shiftGroup('Sore','S',team.S)}
        ${shiftGroup('Malam','M',team.M)}
        ${shiftGroup('Libur','L',team.L)}
      </div>
    </div>`;
  sheet.classList.add('is-open');
}
function closeSheet(){ document.getElementById('sheet').classList.remove('is-open'); }

/* ---------------- Bottom nav + mount ---------------- */

const NAV = [
  { id:'beranda',  label:'Beranda',  icon:'⌂' },
  { id:'kalender', label:'Kalender', icon:'▦' },
];

function renderNav(){
  return `<nav class="tabbar">${NAV.map(n => `
    <button type="button" class="tab ${state.view===n.id?'tab--on':''}" data-view="${n.id}">
      <span class="tab__icon" aria-hidden="true">${n.icon}</span>
      <span class="tab__label">${n.label}</span>
    </button>`).join('')}</nav>`;
}

function render(){
  document.getElementById('view').innerHTML =
    state.view === 'beranda' ? renderBeranda() : renderKalender();
  document.getElementById('nav').innerHTML = renderNav();
  window.scrollTo({ top:0 });
}

/* ---------------- Events ---------------- */

document.addEventListener('click', e => {
  const view = e.target.closest('[data-view]');
  if (view){ state.view = view.dataset.view; render(); return; }

  const nav = e.target.closest('[data-nav]');
  if (nav){
    const v = nav.dataset.nav;
    if (v === 'now'){ state.y = today.getFullYear(); state.m = today.getMonth(); }
    else { state.m += Number(v); if (state.m < 0){ state.m = 11; state.y--; } if (state.m > 11){ state.m = 0; state.y++; } }
    render(); return;
  }

  const day = e.target.closest('[data-day]');
  if (day){ openDay(Number(day.dataset.day)); return; }

  if (e.target.closest('[data-close]') || e.target.id === 'sheet'){ closeSheet(); }
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

render();

/* ---------------- Service worker ---------------- */

if ('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
