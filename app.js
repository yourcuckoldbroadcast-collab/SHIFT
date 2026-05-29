'use strict';

/* ============================================================
   SHIFT RADIOLOGI — engine + UI  (v0.2)
   PWA jadwal shift, offline-first. Pengguna: Fakhrul Aldia (Aldi).
   v0.2: tampilan premium (gelap, serif, aksen hijau logo),
         kalender tanpa jam di sel, navigasi lompat bulan/tahun.
   ============================================================ */

/* ---------------- Konfigurasi dasar ---------------- */

const CYCLE = ['P','P','S','S','M','M','L','L'];          // 2 Pagi · 2 Sore · 2 Malam · 2 Libur
const REF   = Date.UTC(2026, 4, 1);                        // jangkar: 1 Mei 2026

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

const SHIFT = {
  P: { key:'P', label:'Pagi',  time:'06.50 – 14.10', cls:'pagi'  },
  S: { key:'S', label:'Sore',  time:'13.45 – 20.10', cls:'sore'  },
  M: { key:'M', label:'Malam', time:'19.45 – 07.10', cls:'malam' },
  L: { key:'L', label:'Libur', time:'',              cls:'libur' },
};

const HOLIDAYS = {
  '2026-01-01':'Tahun Baru Masehi', '2026-05-01':'Hari Buruh',
  '2026-06-01':'Hari Lahir Pancasila', '2026-08-17':'Hari Kemerdekaan RI',
  '2026-12-25':'Hari Natal',
};

const ABSEN = [
  { label:'SI-PASTI', sub:'Absen utama',    url:'https://pasti.seruyankab.go.id/' },
  { label:'SI-PALUI', sub:'Absen cadangan', url:'https://palui.seruyankab.go.id/' },
];

const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI3 = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BULAN3= ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

/* ---------------- Engine ---------------- */

const USER = STAFF.find(s => s.isUser);
const dayNo  = d => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - REF) / 86400000);
const pad    = n => String(n).padStart(2,'0');
const keyOf  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const isSun  = d => d.getDay() === 0;
const holiday= d => HOLIDAYS[keyOf(d)] || null;
const sameDay= (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

function shiftOf(staff, date){
  if (staff.type === 'rotator'){
    const idx = (((staff.phase + dayNo(date)) % 8) + 8) % 8;
    return CYCLE[idx];
  }
  return (isSun(date) || holiday(date)) ? 'L' : 'P';
}
function teamForDate(date){
  const out = { P:[], S:[], M:[], L:[] };
  for (const s of STAFF) out[shiftOf(s, date)].push(s);
  return out;
}
function monthTally(staff, year, month){
  const t = { P:0,S:0,M:0,L:0 };
  const n = new Date(year, month+1, 0).getDate();
  for (let d=1; d<=n; d++) t[shiftOf(staff, new Date(year, month, d))]++;
  return t;
}
const greeting = h => h<11 ? 'Selamat pagi' : h<15 ? 'Selamat siang' : h<19 ? 'Selamat sore' : 'Selamat malam';

/* ---------------- State ---------------- */

const today = new Date();
const state = { view:'beranda', y:today.getFullYear(), m:today.getMonth() };
let pickYear = state.y;

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- Komponen ---------------- */

function chip(staff, key){
  return `<span class="chip chip--${SHIFT[key].cls}${staff.isUser?' chip--me':''}">${esc(staff.short)}</span>`;
}
function shiftGroup(key, list){
  if (!list.length) return '';
  const s = SHIFT[key];
  return `<div class="grp grp--${s.cls}">
    <div class="grp__head">
      <span class="grp__dot"></span><span class="grp__label">${s.label}</span>
      ${s.time?`<span class="grp__time">${s.time}</span>`:''}
      <span class="grp__count">${list.length}</span>
    </div>
    <div class="grp__chips">${list.map(p=>chip(p,key)).join('')}</div>
  </div>`;
}
const sectionTitle = t => `<div class="section-title">${t}</div>`;

/* ---------------- Beranda ---------------- */

function renderBeranda(){
  const sh = shiftOf(USER, today), s = SHIFT[sh];
  const team = teamForDate(today), hol = holiday(today);
  const note = sh==='L'
    ? 'Tidak ada jadwal hari ini — selamat beristirahat.'
    : `Bertugas pukul ${s.time}.`;

  return `
  <header class="topbar">
    <div class="topbar__row">
      <div class="brand">
        <img class="brand__logo" src="./icon-192.png" alt="" />
        <span class="brand__name">Shift Radiologi</span>
      </div>
      <button class="iconbtn" type="button" aria-label="Pengaturan" disabled>•••</button>
    </div>
    <div class="hi">
      <div class="hi__greet">${greeting(today.getHours())},</div>
      <div class="hi__name">${esc(USER.short)}</div>
      <div class="hi__sub">${esc(USER.role)} · NIP ${esc(USER.nip)}</div>
    </div>
  </header>

  <main class="page">
    <section class="hero hero--${s.cls}">
      <div class="hero__eyebrow"><span class="dot"></span>Shift hari ini</div>
      <div class="hero__date">${HARI[today.getDay()]}, ${today.getDate()} ${BULAN[today.getMonth()]} ${today.getFullYear()}</div>
      ${hol?`<div class="hero__flag">Tanggal merah · ${esc(hol)}</div>`:''}
      <div class="hero__shift">${s.label}</div>
      <div class="hero__rule"></div>
      <div class="hero__note">${note}</div>
    </section>

    ${sectionTitle('Bertugas hari ini')}
    <div class="stack">
      ${shiftGroup('P',team.P)}${shiftGroup('S',team.S)}${shiftGroup('M',team.M)}
      ${team.L.length?`<div class="restline">Libur — ${team.L.map(p=>esc(p.short)).join(', ')}</div>`:''}
    </div>

    ${sectionTitle('Lanjut absen')}
    <p class="hint">Aplikasi terpisah dari sistem absensi — tombol membuka situsnya di tab baru.</p>
    <div class="absen">
      ${ABSEN.map(a=>`<a class="absen__btn" href="${a.url}" target="_blank" rel="noopener noreferrer">
        <span class="absen__label">${a.label}</span><span class="absen__sub">${a.sub}</span>
        <span class="absen__go" aria-hidden="true">↗</span></a>`).join('')}
    </div>
  </main>`;
}

/* ---------------- Kalender ---------------- */

function renderKalender(){
  const { y, m } = state;
  const tally = monthTally(USER, y, m);
  const lead  = (new Date(y,m,1).getDay() + 6) % 7;
  const days  = new Date(y, m+1, 0).getDate();

  let cells = '';
  for (let i=0;i<lead;i++) cells += `<div class="cell cell--empty"></div>`;
  for (let d=1; d<=days; d++){
    const date = new Date(y,m,d), sh = shiftOf(USER,date), s = SHIFT[sh];
    const tn = sameDay(date,today)?' cell--today':'';
    const hl = holiday(date)?' cell--holiday':'';
    cells += `<button type="button" class="cell cell--${s.cls}${tn}${hl}" data-day="${d}">
      <span class="cell__num">${d}</span>
      <span class="cell__sh">${sh==='L'?'Libur':s.label}</span>
    </button>`;
  }

  return `
  <header class="topbar topbar--cal">
    <div class="topbar__row">
      <button class="cal__title" type="button" data-pick>${BULAN[m]} ${y} <span class="cal__caret">▾</span></button>
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
      <div class="dow">${HARI3.map(d=>`<span>${d}</span>`).join('')}</div>
      <div class="grid">${cells}</div>
    </section>

    ${sectionTitle('Rekap '+BULAN[m])}
    <section class="tally">
      ${['P','S','M','L'].map(k=>`<div class="tally__item tally__item--${SHIFT[k].cls}">
        <span class="tally__n">${tally[k]}</span><span class="tally__l">${SHIFT[k].label}</span></div>`).join('')}
    </section>

    <div class="legend">
      ${['P','S','M','L'].map(k=>`<span class="legend__i"><span class="legend__d legend__d--${SHIFT[k].cls}"></span>${SHIFT[k].label}</span>`).join('')}
    </div>
  </main>`;
}

/* ---------------- Lembar: detail tanggal ---------------- */

const sheetEl = () => document.getElementById('sheet');
function closeSheet(){ sheetEl().classList.remove('is-open'); }

function openDay(d){
  const date = new Date(state.y,state.m,d), team = teamForDate(date), hol = holiday(date);
  const my = SHIFT[shiftOf(USER,date)];
  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true" aria-label="Detail jadwal">
      <div class="sheet__grab"></div>
      <div class="sheet__head">
        <div>
          <div class="sheet__eyebrow">${HARI[date.getDay()]}</div>
          <div class="sheet__date">${d} ${BULAN[date.getMonth()]} ${date.getFullYear()}</div>
          ${hol?`<div class="sheet__flag">Tanggal merah · ${esc(hol)}</div>`:''}
        </div>
        <button class="iconbtn" type="button" data-close aria-label="Tutup">✕</button>
      </div>
      <div class="sheet__me sheet__me--${my.cls}">
        <span class="sheet__me-k">Kamu</span>
        <span class="sheet__me-v">${my.label}${my.time?` · ${my.time}`:''}</span>
      </div>
      <div class="sheet__body">
        ${shiftGroup('P',team.P)}${shiftGroup('S',team.S)}${shiftGroup('M',team.M)}${shiftGroup('L',team.L)}
      </div>
    </div>`;
  sheetEl().classList.add('is-open');
}

/* ---------------- Lembar: pemilih bulan & tahun (lompat tanggal) ---------------- */

function openPicker(){ pickYear = state.y; renderPicker(); }
function renderPicker(){
  sheetEl().innerHTML = `
    <div class="sheet__card sheet__card--pick" role="dialog" aria-modal="true" aria-label="Pilih bulan">
      <div class="sheet__grab"></div>
      <div class="sheet__eyebrow" style="text-align:center">Lompat ke</div>
      <div class="pick__year">
        <button class="navbtn" type="button" data-ystep="-1" aria-label="Tahun sebelumnya">‹</button>
        <span class="pick__y">${pickYear}</span>
        <button class="navbtn" type="button" data-ystep="1" aria-label="Tahun berikutnya">›</button>
      </div>
      <div class="pick__grid">
        ${BULAN3.map((b,i)=>{
          const on = (i===state.m && pickYear===state.y) ? ' pick__m--on' : '';
          const now= (i===today.getMonth() && pickYear===today.getFullYear()) ? ' pick__m--now' : '';
          return `<button class="pick__m${on}${now}" type="button" data-jump="${pickYear}.${i}">${b}</button>`;
        }).join('')}
      </div>
    </div>`;
  sheetEl().classList.add('is-open');
}

/* ---------------- Navigasi bawah + mount ---------------- */

const NAV = [
  { id:'beranda',  label:'Beranda',  icon:'⌂' },
  { id:'kalender', label:'Kalender', icon:'▦' },
];
function renderNav(){
  return `<nav class="tabbar">${NAV.map(n=>`
    <button type="button" class="tab ${state.view===n.id?'tab--on':''}" data-view="${n.id}">
      <span class="tab__icon" aria-hidden="true">${n.icon}</span><span class="tab__label">${n.label}</span>
    </button>`).join('')}</nav>`;
}
function render(){
  document.getElementById('view').innerHTML = state.view==='beranda' ? renderBeranda() : renderKalender();
  document.getElementById('nav').innerHTML = renderNav();
  window.scrollTo({ top:0 });
}

/* ---------------- Events ---------------- */

document.addEventListener('click', e => {
  const view = e.target.closest('[data-view]');
  if (view){ state.view = view.dataset.view; closeSheet(); render(); return; }

  const nav = e.target.closest('[data-nav]');
  if (nav){
    const v = nav.dataset.nav;
    if (v==='now'){ state.y=today.getFullYear(); state.m=today.getMonth(); }
    else { state.m += Number(v); if (state.m<0){state.m=11;state.y--;} if (state.m>11){state.m=0;state.y++;} }
    render(); return;
  }

  if (e.target.closest('[data-pick]')){ openPicker(); return; }

  const ystep = e.target.closest('[data-ystep]');
  if (ystep){ pickYear += Number(ystep.dataset.ystep); renderPicker(); return; }

  const jump = e.target.closest('[data-jump]');
  if (jump){ const [yy,mm] = jump.dataset.jump.split('.'); state.y=+yy; state.m=+mm; closeSheet(); render(); return; }

  const day = e.target.closest('[data-day]');
  if (day){ openDay(Number(day.dataset.day)); return; }

  if (e.target.closest('[data-close]') || e.target.id==='sheet'){ closeSheet(); }
});
document.addEventListener('keydown', e => { if (e.key==='Escape') closeSheet(); });

render();

/* ---------------- Service worker ---------------- */
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
