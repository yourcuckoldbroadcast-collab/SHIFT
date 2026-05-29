'use strict';

/* ============================================================
   SHIFT RADIOLOGI — engine + UI  (v0.3)
   v0.3: PENYESUAIAN JADWAL — cuti, pengganti berwarna (hijau/oranye/
         merah), double shift, arsip hutang dinas, deteksi konflik.
   Pengguna: Fakhrul Aldia (Aldi). Offline-first PWA.
   ============================================================ */

/* ---------------- Konfigurasi ---------------- */
const CYCLE = ['P','P','S','S','M','M','L','L'];
const REF   = Date.UTC(2026, 4, 1);

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
  P:{ key:'P', label:'Pagi',  time:'06.50 – 14.10', cls:'pagi'  },
  S:{ key:'S', label:'Sore',  time:'13.45 – 20.10', cls:'sore'  },
  M:{ key:'M', label:'Malam', time:'19.45 – 07.10', cls:'malam' },
  L:{ key:'L', label:'Libur', time:'',              cls:'libur' },
  C:{ key:'C', label:'Cuti',  time:'',              cls:'cuti'  },
};

const HOLIDAYS = {
  '2026-01-01':'Tahun Baru Masehi', '2026-05-01':'Hari Buruh',
  '2026-06-01':'Hari Lahir Pancasila', '2026-08-17':'Hari Kemerdekaan RI', '2026-12-25':'Hari Natal',
};
const ABSEN = [
  { label:'SI-PASTI', sub:'Absen utama',    url:'https://pasti.seruyankab.go.id/' },
  { label:'SI-PALUI', sub:'Absen cadangan', url:'https://palui.seruyankab.go.id/' },
];
const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI3 = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BULAN3= ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

/* ---------------- Engine dasar ---------------- */
const USER = STAFF.find(s=>s.isUser);
const byId = id => STAFF.find(s=>s.id===id);
const dayNo  = d => Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()) - REF)/86400000);
const pad    = n => String(n).padStart(2,'0');
const keyOf  = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromKey= k => { const [y,m,da]=k.split('-').map(Number); return new Date(y,m-1,da); };
const addDays= (d,n)=> new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const isSun  = d => d.getDay()===0;
const holiday= d => HOLIDAYS[keyOf(d)]||null;
const sameDay= (a,b)=> a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const esc    = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function baseShiftOf(s, d){
  if (s.type==='rotator') return CYCLE[(((s.phase+dayNo(d))%8)+8)%8];
  return (isSun(d)||holiday(d)) ? 'L' : 'P';
}

/* ---------------- Penyimpanan penyesuaian ---------------- */
const ADJ_KEY = 'shift-radiologi-adj-v1';
function loadAdj(){ try{ return JSON.parse(localStorage.getItem(ADJ_KEY))||[]; }catch(e){ return []; } }
function saveAdj(){ try{ localStorage.setItem(ADJ_KEY, JSON.stringify(ADJ)); }catch(e){} }
let ADJ = loadAdj();
function addAdj(a){ a.id = 'a'+Date.now()+Math.floor(Math.random()*1000); ADJ.push(a); saveAdj(); }
function removeAdj(id){ ADJ = ADJ.filter(a=>a.id!==id); saveAdj(); }
function findAdj(id){ return ADJ.find(a=>a.id===id); }

/* ---------------- Mesin pengganti (warna istirahat) ---------------- */
const onCuti = (id,k) => ADJ.some(a=>a.type==='cuti'&&a.staffId===id&&a.date===k);

function restColor(coverer, X, d){
  const yc = baseShiftOf(coverer, d);
  const duties = yc==='L' ? [X] : [yc, X];
  const prev = baseShiftOf(coverer, addDays(d,-1));
  const next = baseShiftOf(coverer, addDays(d,1));
  if (duties.includes('P') && prev==='M') return 'red';
  if (duties.includes('M') && next==='P') return 'red';
  if (duties.length===2) return duties.includes('S') ? 'orange' : 'green';
  return 'green';
}
function candidatesFor(absentId, d){
  const X = baseShiftOf(byId(absentId), d);
  if (!['P','S','M'].includes(X)) return { X, list:[] };
  const k = keyOf(d);
  const muhBusy = ADJ.some(a=>a.coverage && a.coverage.covererId==='muhraini' && a.date===k);
  const list = [];
  for (const s of STAFF){
    if (s.type!=='rotator' || s.id===absentId || onCuti(s.id,k)) continue;
    const yc = baseShiftOf(s, d);
    if (yc===X) continue;
    const color = restColor(s, X, d);
    const kind  = yc==='L' ? 'libur' : 'double';
    const score = color==='red' ? 99 : (kind==='libur' ? (color==='green'?1:3) : (color==='green'?2:3));
    list.push({ covererId:s.id, kind, color, debt:true, score, base:yc, X });
  }
  if (!onCuti('muhraini',k)){
    if (!muhBusy) list.push({ covererId:'muhraini', kind:'substitute', color:'green', debt:false, score:0, X });
    else list.push({ covererId:'muhraini', kind:'double-akhir', color:'orange', debt:true, score:4, X });
  }
  list.sort((a,b)=>a.score-b.score);
  return { X, list };
}
const COVER_COLOR = { green:'Disarankan', orange:'Kurang ideal', red:'Tidak bisa' };
function coverHow(c){
  if (c.kind==='substitute')   return 'Pengganti';
  if (c.kind==='double-akhir') return 'Upaya terakhir';
  if (c.kind==='libur')        return 'Masuk dari libur';
  return `Double ${c.base}+${c.X}`;
}

/* ---------------- Resolusi satu hari (untuk tampilan) ---------------- */
function resolveDay(date){
  const k = keyOf(date);
  const adjs = ADJ.filter(a=>a.date===k);
  const eff = {};
  for (const s of STAFF) eff[s.id] = { base:baseShiftOf(s,date), cuti:false, covers:[] };
  for (const a of adjs){
    if (a.type==='cuti') eff[a.staffId].cuti = true;
    if (a.coverage) eff[a.coverage.covererId].covers.push(a.coverage);
  }
  const byShift = { P:[], S:[], M:[], L:[], C:[] };
  for (const s of STAFF){
    const e = eff[s.id];
    if (e.cuti){ byShift.C.push({ staff:s }); continue; }
    const subRole = e.covers.some(c=>c.kind==='substitute'||c.kind==='double-akhir');
    const shifts = [];
    if (!subRole && ['P','S','M'].includes(e.base)) shifts.push({ sh:e.base, tag:'base' });
    for (const c of e.covers) shifts.push({ sh:c.shift, tag:c.kind });
    const seen = {};
    const dbl = shifts.length>1;
    for (const it of shifts){
      if (seen[it.sh]) continue; seen[it.sh]=1;
      byShift[it.sh].push({ staff:s, cover:it.tag!=='base', double:dbl && it.tag==='base' || (dbl && it.tag!=='base') });
    }
    if (!shifts.length) byShift.L.push({ staff:s }); // base libur, no cover
  }
  const conflicts = [];
  for (const sh of ['P','S','M']) if (byShift[sh].length===0) conflicts.push(sh);
  return { byShift, conflicts, adjs };
}
// info shift Aldi (untuk Beranda & sel kalender)
function userInfo(date){
  const r = resolveDay(date);
  if (r.byShift.C.some(x=>x.staff.isUser)) return { state:'cuti', label:'Cuti' };
  const shifts = [];
  for (const sh of ['P','S','M']) if (r.byShift[sh].some(x=>x.staff.isUser)) shifts.push(sh);
  if (!shifts.length) return { state:'libur', label:'Libur', cls:'libur' };
  const dbl = shifts.length>1;
  return { state: dbl?'double':'work', shifts, primary:shifts[0], cls:SHIFT[shifts[0]].cls, dbl };
}
function dayHasAdj(date){ return ADJ.some(a=>a.date===keyOf(date)); }

/* ---------------- Konflik global ---------------- */
function allConflicts(){
  const dates = [...new Set(ADJ.map(a=>a.date))];
  const out = [];
  for (const k of dates){ const r = resolveDay(fromKey(k)); for (const sh of r.conflicts) out.push({ k, sh }); }
  return out;
}
function debtList(){ return ADJ.filter(a=>a.coverage && a.coverage.debt); }

/* ---------------- State ---------------- */
const today = new Date();
const state = { view:'beranda', y:today.getFullYear(), m:today.getMonth() };
let pickYear = state.y;
let addCtx = null; // {date, staffId} saat memilih pengganti

/* ---------------- Komponen ---------------- */
function chip(staff, key, item){
  const tag = item && item.cover ? `<span class="chip__tag">${item.double?'double':'ganti'}</span>` : '';
  return `<span class="chip chip--${SHIFT[key].cls}${staff.isUser?' chip--me':''}">${esc(staff.short)}${tag}</span>`;
}
function shiftGroup(key, list){
  if (!list.length) return '';
  const s = SHIFT[key];
  return `<div class="grp grp--${s.cls}">
    <div class="grp__head"><span class="grp__dot"></span><span class="grp__label">${s.label}</span>
      ${s.time?`<span class="grp__time">${s.time}</span>`:''}<span class="grp__count">${list.length}</span></div>
    <div class="grp__chips">${list.map(it=>chip(it.staff,key,it)).join('')}</div></div>`;
}
const sectionTitle = (t,extra='') => `<div class="section-title">${t}${extra}</div>`;

/* ---------------- Beranda ---------------- */
function renderBeranda(){
  const ui = userInfo(today);
  const cls = ui.state==='cuti' ? 'cuti' : (ui.cls||'libur');
  const r = resolveDay(today);
  const hol = holiday(today);
  let bigword, note;
  if (ui.state==='cuti'){ bigword='Cuti'; note='Kamu mengambil cuti hari ini.'; }
  else if (ui.state==='libur'){ bigword='Libur'; note='Tidak ada jadwal hari ini — selamat beristirahat.'; }
  else if (ui.state==='double'){ bigword=SHIFT[ui.shifts[0]].label; note=`Double shift: ${ui.shifts.map(s=>SHIFT[s].label).join(' + ')}.`; }
  else { bigword=SHIFT[ui.primary].label; note=`Bertugas pukul ${SHIFT[ui.primary].time}.`; }

  return `
  <header class="topbar">
    <div class="topbar__row">
      <div class="brand"><img class="brand__logo" src="./icon-192.png" alt="" /><span class="brand__name">Shift Radiologi</span></div>
      <button class="iconbtn" type="button" aria-label="Pengaturan" disabled>•••</button>
    </div>
    <div class="hi"><div class="hi__greet">${greeting(today.getHours())},</div>
      <div class="hi__name">${esc(USER.short)}</div>
      <div class="hi__sub">${esc(USER.role)} · NIP ${esc(USER.nip)}</div></div>
  </header>
  <main class="page">
    <section class="hero hero--${cls}">
      <div class="hero__eyebrow"><span class="dot"></span>Shift hari ini</div>
      <div class="hero__date">${HARI[today.getDay()]}, ${today.getDate()} ${BULAN[today.getMonth()]} ${today.getFullYear()}</div>
      ${hol?`<div class="hero__flag">Tanggal merah · ${esc(hol)}</div>`:''}
      <div class="hero__shift">${bigword}</div>
      <div class="hero__rule"></div>
      <div class="hero__note">${note}</div>
    </section>
    ${sectionTitle('Bertugas hari ini')}
    <div class="stack">
      ${shiftGroup('P',r.byShift.P)}${shiftGroup('S',r.byShift.S)}${shiftGroup('M',r.byShift.M)}
      ${r.byShift.C.length?`<div class="restline restline--cuti">Cuti — ${r.byShift.C.map(x=>esc(x.staff.short)).join(', ')}</div>`:''}
      ${r.byShift.L.length?`<div class="restline">Libur — ${r.byShift.L.map(x=>esc(x.staff.short)).join(', ')}</div>`:''}
    </div>
    ${sectionTitle('Lanjut absen')}
    <p class="hint">Aplikasi terpisah dari sistem absensi — tombol membuka situsnya di tab baru.</p>
    <div class="absen">${ABSEN.map(a=>`<a class="absen__btn" href="${a.url}" target="_blank" rel="noopener noreferrer">
      <span class="absen__label">${a.label}</span><span class="absen__sub">${a.sub}</span><span class="absen__go">↗</span></a>`).join('')}</div>
  </main>`;
}
const greeting = h => h<11?'Selamat pagi':h<15?'Selamat siang':h<19?'Selamat sore':'Selamat malam';

/* ---------------- Kalender ---------------- */
function renderKalender(){
  const { y, m } = state;
  const lead = (new Date(y,m,1).getDay()+6)%7;
  const days = new Date(y,m+1,0).getDate();
  const tally = { P:0,S:0,M:0,L:0 };
  for (let d=1; d<=days; d++){ const ui=userInfo(new Date(y,m,d)); if(ui.state==='cuti') {} else if(ui.state==='libur') tally.L++; else ui.shifts.forEach(s=>{ if(tally[s]!=null) tally[s]++; }); }

  let cells='';
  for (let i=0;i<lead;i++) cells+=`<div class="cell cell--empty"></div>`;
  for (let d=1; d<=days; d++){
    const date=new Date(y,m,d), ui=userInfo(date);
    const cls = ui.state==='cuti'?'cuti':(ui.cls||'libur');
    const lbl = ui.state==='cuti'?'Cuti':(ui.state==='libur'?'Libur':(ui.dbl?SHIFT[ui.shifts[0]].label+'+':SHIFT[ui.primary].label));
    const tn = sameDay(date,today)?' cell--today':'';
    const hl = holiday(date)?' cell--holiday':'';
    const adj= dayHasAdj(date)?'<span class="cell__adj"></span>':'';
    cells+=`<button type="button" class="cell cell--${cls}${tn}${hl}" data-day="${d}">
      ${adj}<span class="cell__num">${d}</span><span class="cell__sh">${lbl}</span></button>`;
  }
  return `
  <header class="topbar topbar--cal">
    <div class="topbar__row">
      <button class="cal__title" type="button" data-pick>${BULAN[m]} ${y} <span class="cal__caret">▾</span></button>
      <div class="cal__nav">
        <button class="navbtn" type="button" data-nav="-1" aria-label="Sebelumnya">‹</button>
        <button class="navbtn navbtn--now" type="button" data-nav="now">Hari ini</button>
        <button class="navbtn" type="button" data-nav="1" aria-label="Berikutnya">›</button>
      </div>
    </div>
    <div class="cal__sub">Jadwal ${esc(USER.short)} · ketuk tanggal untuk lihat tim & atur</div>
  </header>
  <main class="page">
    <section class="calwrap"><div class="dow">${HARI3.map(d=>`<span>${d}</span>`).join('')}</div>
      <div class="grid">${cells}</div></section>
    ${sectionTitle('Rekap '+BULAN[m])}
    <section class="tally">${['P','S','M','L'].map(k=>`<div class="tally__item tally__item--${SHIFT[k].cls}">
      <span class="tally__n">${tally[k]}</span><span class="tally__l">${SHIFT[k].label}</span></div>`).join('')}</section>
    <div class="legend">${['P','S','M','L'].map(k=>`<span class="legend__i"><span class="legend__d legend__d--${SHIFT[k].cls}"></span>${SHIFT[k].label}</span>`).join('')}</div>
  </main>`;
}

/* ---------------- Atur (penyesuaian) ---------------- */
function renderAtur(){
  const conflicts = allConflicts();
  const debts = debtList();
  const sorted = [...ADJ].sort((a,b)=>a.date<b.date?-1:1);

  const conflictHTML = conflicts.length ? `<div class="panel panel--warn">
    <div class="panel__h">⚠ Konflik — shift kosong</div>
    ${conflicts.map(c=>`<div class="panel__row">${SHIFT[c.sh].label} · ${fmtKey(c.k)} belum ada petugas</div>`).join('')}
  </div>` : `<div class="panel panel--ok"><div class="panel__h">✓ Tidak ada konflik</div>
    <div class="panel__sub">Semua shift pada hari yang disesuaikan terisi.</div></div>`;

  const adjHTML = sorted.length ? sorted.map(a=>{
    const s = byId(a.staffId);
    let detail = 'Cuti';
    if (a.coverage){ const c=byId(a.coverage.covererId); detail = `Cuti · diganti ${esc(c.short)} (${a.coverage.kind==='substitute'?'pengganti':a.coverage.kind==='libur'?'dari libur':a.coverage.kind==='double-akhir'?'upaya terakhir':'double'})`; }
    else if (['P','S','M'].includes(baseShiftOf(s,fromKey(a.date)))) detail = 'Cuti · belum diganti';
    return `<div class="adj">
      <div class="adj__main"><div class="adj__name">${esc(s.short)}</div>
        <div class="adj__meta">${fmtKey(a.date)} · ${detail}</div></div>
      <button class="adj__del" type="button" data-deladj="${a.id}" aria-label="Hapus">✕</button></div>`;
  }).join('') : `<div class="empty">Belum ada penyesuaian. Buka Kalender, ketuk tanggal, lalu "Tambah penyesuaian".</div>`;

  const debtHTML = debts.length ? debts.map(a=>{
    const ow=byId(a.staffId), cv=byId(a.coverage.covererId);
    return `<div class="debt ${a.settled?'debt--done':''}">
      <div class="debt__main"><div class="debt__txt"><b>${esc(ow.short)}</b> berutang 1 shift ke <b>${esc(cv.short)}</b></div>
        <div class="debt__meta">sejak ${fmtKey(a.date)}${a.settled?' · lunas':''}</div></div>
      <button class="debt__btn" type="button" data-debt="${a.id}">${a.settled?'Batalkan':'Lunas'}</button></div>`;
  }).join('') : `<div class="empty">Belum ada hutang dinas.</div>`;

  return `
  <header class="topbar topbar--cal"><div class="topbar__row"><h1 class="cal__title">Atur</h1></div>
    <div class="cal__sub">Penyesuaian, hutang dinas & konflik</div></header>
  <main class="page">
    ${conflictHTML}
    ${sectionTitle('Penyesuaian aktif')}
    <div class="list">${adjHTML}</div>
    ${sectionTitle('Arsip hutang dinas')}
    <div class="list">${debtHTML}</div>
  </main>`;
}
const fmtKey = k => { const d=fromKey(k); return `${d.getDate()} ${BULAN3[d.getMonth()]} ${d.getFullYear()}`; };

/* ---------------- Lembar: detail tanggal ---------------- */
const sheetEl = () => document.getElementById('sheet');
function closeSheet(){ sheetEl().classList.remove('is-open'); addCtx=null; }

function openDay(d){
  const date=new Date(state.y,state.m,d), r=resolveDay(date), hol=holiday(date);
  const my = userInfo(date);
  const myLabel = my.state==='cuti'?'Cuti':my.state==='libur'?'Libur':my.shifts.map(s=>SHIFT[s].label).join(' + ');
  const myCls = my.state==='cuti'?'cuti':(my.cls||'libur');
  const dayAdj = ADJ.filter(a=>a.date===keyOf(date));
  const adjList = dayAdj.length ? `<div class="sheet__adjs">${dayAdj.map(a=>{
      const s=byId(a.staffId); const cv=a.coverage?byId(a.coverage.covererId):null;
      return `<div class="adj adj--sm"><div class="adj__main"><div class="adj__name">${esc(s.short)} cuti${cv?` → ${esc(cv.short)}`:''}</div></div>
        <button class="adj__del" type="button" data-deladj="${a.id}">✕</button></div>`;}).join('')}</div>` : '';

  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true">
      <div class="sheet__grab"></div>
      <div class="sheet__head"><div>
        <div class="sheet__eyebrow">${HARI[date.getDay()]}</div>
        <div class="sheet__date">${d} ${BULAN[date.getMonth()]} ${date.getFullYear()}</div>
        ${hol?`<div class="sheet__flag">Tanggal merah · ${esc(hol)}</div>`:''}</div>
        <button class="iconbtn" type="button" data-close>✕</button></div>
      <div class="sheet__me sheet__me--${myCls}"><span class="sheet__me-k">Kamu</span><span class="sheet__me-v">${myLabel}</span></div>
      ${r.conflicts.length?`<div class="sheet__warn">⚠ ${r.conflicts.map(s=>SHIFT[s].label).join(', ')} belum ada petugas</div>`:''}
      <div class="sheet__body">
        ${shiftGroup('P',r.byShift.P)}${shiftGroup('S',r.byShift.S)}${shiftGroup('M',r.byShift.M)}${shiftGroup('L',r.byShift.L)}${shiftGroup('C',r.byShift.C)}
      </div>
      ${adjList}
      <button class="bigbtn" type="button" data-add="${d}">＋ Tambah penyesuaian</button>
    </div>`;
  sheetEl().classList.add('is-open');
}

/* ---------------- Lembar: tambah penyesuaian ---------------- */
function openAdd(d){
  const date=new Date(state.y,state.m,d);
  addCtx = { date, day:d };
  const opts = STAFF.map(s=>{ const sh=baseShiftOf(s,date); return `<option value="${s.id}">${esc(s.short)} — ${SHIFT[sh].label} hari ini</option>`; }).join('');
  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true">
      <div class="sheet__grab"></div>
      <div class="sheet__head"><div><div class="sheet__eyebrow">Tambah penyesuaian</div>
        <div class="sheet__date">${d} ${BULAN[date.getMonth()]} ${date.getFullYear()}</div></div>
        <button class="iconbtn" type="button" data-close>✕</button></div>
      <div class="field"><label>Petugas yang cuti</label>
        <select id="adjStaff" class="select">${opts}</select></div>
      <div class="field"><label>Jenis</label>
        <div class="seg"><button class="seg__b seg__b--on" type="button" disabled>Cuti</button></div>
        <p class="hint" style="margin-top:8px">Tukar shift & double manual menyusul — saat ini lewat alur cuti + pengganti.</p></div>
      <button class="bigbtn" type="button" data-addnext>Lanjut</button>
    </div>`;
  sheetEl().classList.add('is-open');
}
function addNext(){
  const id = document.getElementById('adjStaff').value;
  const s = byId(id), date = addCtx.date, k = keyOf(date);
  const base = baseShiftOf(s, date);
  addCtx.staffId = id;
  // cadangan atau rotator yang memang libur → cuti langsung, tak perlu pengganti
  if (s.type==='cadangan' || base==='L'){
    addAdj({ type:'cuti', staffId:id, date:k, coverage:null });
    closeSheet(); render(); return;
  }
  // rotator pada shift kerja → pemilih pengganti berwarna
  renderPicker();
}
function renderPicker(){
  const { date, staffId } = addCtx;
  const { X, list } = candidatesFor(staffId, date);
  const s = byId(staffId);
  const rows = list.map(c=>{
    const cv = byId(c.covererId), dis = c.color==='red';
    return `<button class="cand cand--${c.color}" type="button" ${dis?'disabled':`data-cover="${c.covererId}|${c.X}|${c.kind}|${c.color}|${c.debt?1:0}"`}>
      <span class="cand__dot"></span>
      <span class="cand__body"><span class="cand__name">${esc(cv.short)}</span><span class="cand__how">${coverHow(c)}</span></span>
      <span class="cand__badge cand__badge--${c.color}">${COVER_COLOR[c.color]}</span></button>`;
  }).join('');
  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true">
      <div class="sheet__grab"></div>
      <div class="sheet__head"><div><div class="sheet__eyebrow">Pilih pengganti</div>
        <div class="sheet__date">${esc(s.short)} cuti · shift ${SHIFT[X].label}</div></div>
        <button class="iconbtn" type="button" data-close>✕</button></div>
      <p class="hint">Hijau = ada celah istirahat · Oranye = maraton, istirahat minim · Merah = tak bisa (Malam→Pagi).</p>
      <div class="cands">${rows||'<div class="empty">Tidak ada kandidat.</div>'}</div>
      <button class="bigbtn bigbtn--ghost" type="button" data-cover="|${X}||none|0">Biarkan kosong dulu</button>
    </div>`;
  sheetEl().classList.add('is-open');
}
function applyCover(val){
  const [covererId, X, kind, color, debt] = val.split('|');
  const adj = { type:'cuti', staffId:addCtx.staffId, date:keyOf(addCtx.date), coverage:null, settled:false };
  if (covererId) adj.coverage = { covererId, shift:X, kind, color, debt:debt==='1' };
  addAdj(adj);
  closeSheet(); render();
}

/* ---------------- Lembar: pemilih bulan/tahun ---------------- */
function openPicker(){ pickYear=state.y; renderMonthPicker(); }
function renderMonthPicker(){
  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true">
      <div class="sheet__grab"></div>
      <div class="sheet__eyebrow" style="text-align:center">Lompat ke</div>
      <div class="pick__year"><button class="navbtn" type="button" data-ystep="-1">‹</button>
        <span class="pick__y">${pickYear}</span><button class="navbtn" type="button" data-ystep="1">›</button></div>
      <div class="pick__grid">${BULAN3.map((b,i)=>{
        const on=(i===state.m&&pickYear===state.y)?' pick__m--on':''; const now=(i===today.getMonth()&&pickYear===today.getFullYear())?' pick__m--now':'';
        return `<button class="pick__m${on}${now}" type="button" data-jump="${pickYear}.${i}">${b}</button>`;}).join('')}</div>
    </div>`;
  sheetEl().classList.add('is-open');
}

/* ---------------- Nav + mount ---------------- */
const NAV = [{id:'beranda',label:'Beranda',icon:'⌂'},{id:'kalender',label:'Kalender',icon:'▦'},{id:'atur',label:'Atur',icon:'⚙'}];
function renderNav(){
  const badge = (allConflicts().length)? '<span class="tab__badge"></span>':'';
  return `<nav class="tabbar tabbar--3">${NAV.map(n=>`<button type="button" class="tab ${state.view===n.id?'tab--on':''}" data-view="${n.id}">
    <span class="tab__icon">${n.icon}${n.id==='atur'?badge:''}</span><span class="tab__label">${n.label}</span></button>`).join('')}</nav>`;
}
function render(){
  const v = document.getElementById('view');
  v.innerHTML = state.view==='beranda'?renderBeranda():state.view==='kalender'?renderKalender():renderAtur();
  document.getElementById('nav').innerHTML = renderNav();
  window.scrollTo({top:0});
}

/* ---------------- Events ---------------- */
document.addEventListener('click', e => {
  const view=e.target.closest('[data-view]'); if(view){ state.view=view.dataset.view; closeSheet(); render(); return; }
  const nav=e.target.closest('[data-nav]'); if(nav){ const v=nav.dataset.nav;
    if(v==='now'){state.y=today.getFullYear();state.m=today.getMonth();} else {state.m+=+v; if(state.m<0){state.m=11;state.y--;} if(state.m>11){state.m=0;state.y++;}} render(); return; }
  if(e.target.closest('[data-pick]')){ openPicker(); return; }
  const ys=e.target.closest('[data-ystep]'); if(ys){ pickYear+=+ys.dataset.ystep; renderMonthPicker(); return; }
  const jm=e.target.closest('[data-jump]'); if(jm){ const [y,m]=jm.dataset.jump.split('.'); state.y=+y;state.m=+m; closeSheet(); render(); return; }
  const add=e.target.closest('[data-add]'); if(add){ openAdd(+add.dataset.add); return; }
  if(e.target.closest('[data-addnext]')){ addNext(); return; }
  const cov=e.target.closest('[data-cover]'); if(cov){ applyCover(cov.dataset.cover); return; }
  const del=e.target.closest('[data-deladj]'); if(del){ removeAdj(del.dataset.deladj); if(sheetEl().classList.contains('is-open')) closeSheet(); render(); return; }
  const dbt=e.target.closest('[data-debt]'); if(dbt){ const a=findAdj(dbt.dataset.debt); if(a){ a.settled=!a.settled; saveAdj(); } render(); return; }
  const day=e.target.closest('[data-day]'); if(day){ openDay(+day.dataset.day); return; }
  if(e.target.closest('[data-close]')||e.target.id==='sheet'){ closeSheet(); }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSheet(); });

render();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
