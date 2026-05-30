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
  // 2026 — resmi (SKB 3 Menteri / Setneg)
  '2026-01-01':'Tahun Baru Masehi', '2026-01-16':'Isra Mikraj Nabi Muhammad',
  '2026-02-17':'Tahun Baru Imlek 2577', '2026-03-19':'Hari Suci Nyepi',
  '2026-03-21':'Idul Fitri 1447 H', '2026-03-22':'Idul Fitri 1447 H (hari ke-2)',
  '2026-04-03':'Wafat Yesus Kristus', '2026-04-05':'Paskah',
  '2026-05-01':'Hari Buruh', '2026-05-14':'Kenaikan Yesus Kristus',
  '2026-05-27':'Idul Adha 1447 H', '2026-05-31':'Hari Raya Waisak 2570 BE',
  '2026-06-01':'Hari Lahir Pancasila', '2026-06-16':'Tahun Baru Islam 1448 H',
  '2026-08-17':'Hari Kemerdekaan RI', '2026-08-25':'Maulid Nabi Muhammad',
  '2026-12-25':'Hari Raya Natal',
  // 2027 — tanggal tetap pasti; tanggal hijriah masih perkiraan (lihat HOLIDAY_EST)
  '2027-01-01':'Tahun Baru Masehi',
  '2027-03-10':'Idul Fitri 1448 H', '2027-05-16':'Idul Adha 1448 H',
  '2027-08-17':'Hari Kemerdekaan RI', '2027-12-25':'Hari Raya Natal',
};
// tanggal hijriah 2027 — perkiraan, menunggu SKB resmi pemerintah
const HOLIDAY_EST = new Set(['2027-03-10','2027-05-16']);

/* Hari libur instansi (manual) — fallback bila instansi menetapkan libur di luar nasional.
   scope: 'all' = semua petugas libur (rotator + cadangan); 'pagi' = hanya petugas dinas pagi/cadangan. */
const HOL_KEY = 'shift-radiologi-holidays-v1';
function loadHol(){ try{ return JSON.parse(localStorage.getItem(HOL_KEY))||[]; }catch(e){ return []; } }
function saveHol(){ try{ localStorage.setItem(HOL_KEY, JSON.stringify(HOL_USER)); }catch(e){} }
let HOL_USER = loadHol();
function addHol(h){ HOL_USER = HOL_USER.filter(x=>x.date!==h.date); HOL_USER.push(h); HOL_USER.sort((a,b)=>a.date<b.date?-1:1); saveHol(); }
function removeHol(date){ HOL_USER = HOL_USER.filter(h=>h.date!==date); saveHol(); }

/* Foto profil pengguna — dipilih dari galeri/berkas, dikecilkan & disimpan di localStorage (dataURL). */
const PHOTO_KEY = 'shift-radiologi-photo-v1';
function loadPhoto(){ try{ return localStorage.getItem(PHOTO_KEY)||null; }catch(e){ return null; } }
let PHOTO = loadPhoto();
function savePhoto(v){ try{ localStorage.setItem(PHOTO_KEY, v); PHOTO=v; return true; }catch(e){ return false; } }
function clearPhoto(){ try{ localStorage.removeItem(PHOTO_KEY); }catch(e){} PHOTO=null; }
// kecilkan & potong-tengah ke kotak SxS, ekspor JPEG ringan
function shrinkPhoto(file, cb){
  const img=new Image(), url=URL.createObjectURL(file);
  img.onload=()=>{ const S=256, c=document.createElement('canvas'); c.width=S; c.height=S;
    const x=c.getContext('2d'); const sc=Math.max(S/img.width,S/img.height);
    const w=img.width*sc, h=img.height*sc; x.drawImage(img,(S-w)/2,(S-h)/2,w,h);
    URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg',0.82)); };
  img.onerror=()=>{ URL.revokeObjectURL(url); };
  img.src=url;
}
// buka pemilih berkas (galeri / file manager) lalu simpan
function pickPhoto(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.addEventListener('change',()=>{ const f=inp.files&&inp.files[0]; if(!f) return;
    shrinkPhoto(f, data=>{ savePhoto(data); render(); }); });
  inp.click();
}
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
// Info libur pada tanggal: nasional (cakupan 'pagi' = hanya cadangan) atau instansi (cakupan tersimpan)
function holidayInfo(d){ const k=keyOf(d);
  if (HOLIDAYS[k]) return { name:HOLIDAYS[k], scope:'pagi', source:'national' };
  const u = HOL_USER.find(h=>h.date===k); if (u) return { name:u.name, scope:u.scope||'pagi', source:'user' };
  return null;
}
const holiday= d => { const h=holidayInfo(d); return h?h.name:null; };
const sameDay= (a,b)=> a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const esc    = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function baseShiftOf(s, d){
  const h = holidayInfo(d);
  if (s.type==='rotator'){
    if (h && h.scope==='all') return 'L';            // libur instansi menyeluruh → rotator ikut libur
    return CYCLE[(((s.phase+dayNo(d))%8)+8)%8];
  }
  return (isSun(d)||h) ? 'L' : 'P';                  // cadangan/dinas pagi libur tiap Minggu & semua tanggal merah
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
  for (const s of STAFF) eff[s.id] = { base:baseShiftOf(s,date), cuti:false, covers:[], repayOff:false, forceBase:null };
  for (const a of adjs){
    if (a.type==='cuti'){ eff[a.staffId].cuti = true; if (a.coverage) eff[a.coverage.covererId].covers.push(a.coverage); }
    else if (a.type==='swap'){ eff[a.aId].forceBase = baseShiftOf(byId(a.bId),date); eff[a.bId].forceBase = baseShiftOf(byId(a.aId),date); }
    else if (a.type==='double'){ eff[a.staffId].covers.push({ shift:a.shift, kind:'double-manual' }); }
  }
  // pelunasan hutang terjadwal pada tanggal ini: kreditur libur, debitur masuk gantikan
  for (const d of ADJ){
    if (d.coverage && d.coverage.debt && d.repay && d.repay.date===k){
      eff[d.coverage.covererId].repayOff = true;
      eff[d.staffId].covers.push({ shift:d.repay.shift, kind:'repay' });
    }
  }
  const tagOf = (tag, dbl) => tag==='swap' ? 'tukar'
    : tag==='repay' ? 'bayar'
    : (tag==='double'||tag==='double-manual'||tag==='double-akhir') ? 'double'
    : tag!=='base' ? 'ganti' : '';
  const byShift = { P:[], S:[], M:[], L:[], C:[] };
  for (const s of STAFF){
    const e = eff[s.id];
    if (e.cuti){ byShift.C.push({ staff:s }); continue; }
    const base = e.repayOff ? 'L' : (e.forceBase!=null ? e.forceBase : e.base);
    const baseTag = e.forceBase!=null ? 'swap' : 'base';
    const subRole = e.covers.some(c=>c.kind==='substitute'||c.kind==='double-akhir');
    const shifts = [];
    if (!subRole && ['P','S','M'].includes(base)) shifts.push({ sh:base, tag:baseTag });
    for (const c of e.covers) shifts.push({ sh:c.shift, tag:c.kind });
    const seen = {};
    const dbl = shifts.length>1;
    for (const it of shifts){
      if (seen[it.sh]) continue; seen[it.sh]=1;
      byShift[it.sh].push({ staff:s, tagLabel: tagOf(it.tag, dbl) });
    }
    if (!shifts.length) byShift.L.push({ staff:s });
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
function dayHasAdj(date){ const k=keyOf(date); return ADJ.some(a=>a.date===k || (a.coverage&&a.coverage.debt&&a.repay&&a.repay.date===k)); }
// Fase shift pengguna: hari ke-n dari total hari blok shift yang sama (siklus 2-harian → 1/2 atau 2/2)
function cyclePhase(date){
  if (USER.type!=='rotator') return null;
  const base = baseShiftOf(USER, date);
  let back=0, fwd=0;
  for (let i=1;i<8;i++){ if (baseShiftOf(USER, addDays(date,-i))===base) back++; else break; }
  for (let i=1;i<8;i++){ if (baseShiftOf(USER, addDays(date, i))===base) fwd++;  else break; }
  return { n:back+1, total:back+1+fwd, base };
}

/* ---------------- Konflik global ---------------- */
function allConflicts(){
  const dates = [...new Set(ADJ.map(a=>a.date))];
  const out = [];
  for (const k of dates){ const r = resolveDay(fromKey(k)); for (const sh of r.conflicts) out.push({ k, sh }); }
  return out;
}
function debtList(){ return ADJ.filter(a=>a.coverage && a.coverage.debt); }
// status pelunasan: belum dijadwalkan / dalam proses (tanggal belum lewat) / lunas (tanggal sudah lewat)
function debtStatus(d){
  if (!d.repay) return { key:'belum', label:'Belum dijadwalkan' };
  return (d.repay.date < keyOf(today)) ? { key:'lunas', label:'Lunas' } : { key:'proses', label:'Dalam proses' };
}

/* ---------------- State ---------------- */
const today = new Date();
const state = { view:'beranda', y:today.getFullYear(), m:today.getMonth() };
let pickYear = state.y;
let addCtx = null; // {date, staffId} saat memilih pengganti
let holScope = 'all'; // cakupan saat menambah hari libur instansi

/* ---------------- Komponen ---------------- */
function chip(staff, key, item){
  const tag = item && item.tagLabel ? `<span class="chip__tag">${item.tagLabel}</span>` : '';
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

/* ---------------- Konteks kartu hero Beranda ---------------- */
// Penyesuaian yang menyentuh pengguna pada tanggal ini (untuk menjelaskan "kenapa")
function userAdjToday(date){
  const k=keyOf(date), me=USER.id;
  for (const a of ADJ){
    if (a.coverage && a.coverage.debt && a.repay && a.repay.date===k){
      if (a.coverage.covererId===me) return { kind:'repay-credit', byId:a.staffId };
      if (a.staffId===me)            return { kind:'repay-debt', toId:a.coverage.covererId, shift:a.repay.shift };
    }
  }
  for (const a of ADJ){
    if (a.date!==k) continue;
    if (a.type==='cuti'){
      if (a.staffId===me) return { kind:'cuti' };
      if (a.coverage && a.coverage.covererId===me) return { kind:a.coverage.kind, forId:a.staffId, shift:a.coverage.shift };
    } else if (a.type==='double' && a.staffId===me){
      return { kind:'double-manual', shift:a.shift };
    } else if (a.type==='swap' && (a.aId===me||a.bId===me)){
      return { kind:'swap', withId:a.aId===me?a.bId:a.aId };
    }
  }
  return null;
}
// Teks acuan informatif tiap fase shift default (dipakai sebagai quote di kartu Beranda)
const ACUAN = {
  P1:'Hari pertama shift Pagi. Besok Anda masih melanjutkan tugas pada jam yang sama.',
  P2:'Hari kedua shift Pagi. Setelah menyelesaikan tugas hari ini, besok Anda beralih ke shift Sore.',
  S1:'Hari pertama shift Sore. Besok Anda masih bertugas pada periode yang sama.',
  S2:'Hari kedua shift Sore. Siklus kerja berlanjut ke shift Malam mulai besok.',
  M1:'Hari pertama shift Malam. Besok Anda masih menjalani dinas pada periode ini.',
  M2:'Hari kedua shift Malam. Setelah malam ini selesai, waktunya beristirahat mulai besok.',
  L1:'Hari pertama masa istirahat. Nikmati jeda yang ada, besok Anda masih memiliki satu hari libur lagi.',
  L2:'Hari kedua masa istirahat. Semoga waktu jeda ini cukup menyegarkan, karena besok shift Pagi kembali dimulai.',
};
// Kartu hero Beranda: { big, cls, chip, time, quote }
function heroState(date){
  const ui=userInfo(date), base=baseShiftOf(USER,date), ctx=userAdjToday(date);
  const nm=id=>esc(byId(id).short), tm=sh=>SHIFT[sh].time;
  const mk=(code,o={})=>({ big:code==='L'?'Libur':code==='C'?'Cuti':SHIFT[code].label,
    cls:code==='L'?'libur':code==='C'?'cuti':SHIFT[code].cls, chip:o.chip||null, time:o.time||null, quote:o.quote||'' });

  if (ui.state==='cuti') return mk('C', { quote:'Anda mengambil cuti hari ini. Selamat beristirahat dan pulihkan tenaga.' });
  if (ctx){
    if (ctx.kind==='repay-credit') return mk('L', { chip:'DIBAYAR',
      quote:`Hari ini ${nm(ctx.byId)} menggantikan dinas Anda sebagai pelunasan. Seharusnya Anda bertugas ${SHIFT[base].label}, tetapi cukup beristirahat.` });
    if (ctx.kind==='repay-debt')   return mk(ctx.shift, { chip:'PELUNASAN', time:tm(ctx.shift),
      quote:`Anda membayar dinas ${nm(ctx.toId)} hari ini — pelunasan dari double shift sebelumnya.` });
    if (ctx.kind==='swap'){ const c=ui.state==='libur'?'L':ui.primary;
      return mk(c, { chip:'TUKAR', time:c==='L'?null:tm(ui.primary), quote:`Anda bertukar shift dengan ${nm(ctx.withId)} pada hari ini.` }); }
    if (ctx.kind==='libur'||ctx.kind==='substitute'){ const extra=base==='L'?' Sebenarnya hari ini jadwal libur Anda — terima kasih sudah membantu.':'';
      return mk(ui.primary, { chip:'GANTI', time:tm(ui.primary), quote:`Anda menggantikan ${nm(ctx.forId)} pada shift ini.${extra}` }); }
    if (ctx.kind==='double'){ const extra=ui.shifts.find(s=>s!==base) ?? ui.shifts[1];
      return mk(base, { chip:'DOUBLE', quote:`Dinas ganda menutup ${nm(ctx.forId)}: ${SHIFT[base].label} (${tm(base)}) lalu ${SHIFT[extra].label} (${tm(extra)}).` }); }
    if (ctx.kind==='double-manual'){
      if (ui.state==='double'){ const extra=ui.shifts.find(s=>s!==base) ?? ui.shifts[1];
        return mk(base, { chip:'DOUBLE', quote:`Dinas ganda hari ini: ${SHIFT[base].label} (${tm(base)}) lalu ${SHIFT[extra].label} (${tm(extra)}).` }); }
      return mk(ui.primary, { chip:'EKSTRA', time:tm(ui.primary), quote:'Dinas tambahan di luar pola jadwal pada hari ini.' });
    }
  }
  // hari dinas default (murni siklus) → quote dari ACUAN, chip "KE-n"
  const ph=cyclePhase(date);
  const n = ph ? ph.n : 1;
  const key = (ui.state==='libur'?'L':base) + n;
  const chip = ph ? `KE-${ph.n}` : null;
  if (ui.state==='libur') return mk('L', { chip, quote:ACUAN[key]||'Hari libur — selamat beristirahat.' });
  return mk(ui.primary, { chip, time:tm(ui.primary), quote:ACUAN[key]||`Bertugas pukul ${tm(ui.primary)}.` });
}

/* ---------------- Beranda ---------------- */
function renderBeranda(){
  const hs = heroState(today);
  const cls = hs.cls;
  const r = resolveDay(today);
  const hol = holiday(today);

  return `
  <header class="topbar">
    <div class="topbar__inner">
      <div class="topbar__left">
        <div class="topbar__row">
          <div class="brand"><svg class="brand__mark" viewBox="0 0 100 100" aria-hidden="true"><g fill="#1f9d6b"><circle cx="50" cy="50" r="10.5"/><polygon points="71.50,12.76 67.49,10.72 63.29,9.10 58.94,7.94 54.49,7.24 50.00,7.00 45.51,7.24 41.06,7.94 36.71,9.10 32.51,10.72 28.50,12.76 41.00,34.41 42.68,33.56 44.44,32.88 46.26,32.39 48.12,32.10 50.00,32.00 51.88,32.10 53.74,32.39 55.56,32.88 57.32,33.56 59.00,34.41"/><polygon points="7.00,50.00 7.24,54.49 7.94,58.94 9.10,63.29 10.72,67.49 12.76,71.50 15.21,75.27 18.04,78.77 21.23,81.96 24.73,84.79 28.50,87.24 41.00,65.59 39.42,64.56 37.96,63.38 36.62,62.04 35.44,60.58 34.41,59.00 33.56,57.32 32.88,55.56 32.39,53.74 32.10,51.88 32.00,50.00"/><polygon points="71.50,87.24 75.27,84.79 78.77,81.96 81.96,78.77 84.79,75.27 87.24,71.50 89.28,67.49 90.90,63.29 92.06,58.94 92.76,54.49 93.00,50.00 68.00,50.00 67.90,51.88 67.61,53.74 67.12,55.56 66.44,57.32 65.59,59.00 64.56,60.58 63.38,62.04 62.04,63.38 60.58,64.56 59.00,65.59"/></g></svg><span class="brand__name">SHIFT-RAD</span></div>
        </div>
        <div class="hi"><div class="hi__greet">${greeting(today.getHours())},</div>
          <div class="hi__name">${esc(USER.short)}</div>
          <div class="hi__sub">${esc(USER.role)} · NIP ${esc(USER.nip)}</div></div>
      </div>
      <div class="pfp-wrap">
        <button class="pfp${PHOTO?' pfp--has':''}" type="button" data-pfp aria-label="${PHOTO?'Ganti foto profil':'Tambah foto profil'}">
          ${PHOTO
            ? `<img class="pfp__img" src="${PHOTO}" alt="Foto profil">`
            : `<svg class="pfp__ph" viewBox="0 0 24 24" aria-hidden="true"><g fill="#2ea36c"><circle cx="12" cy="8.2" r="4.1"/><path d="M3.8 21c0-4.3 3.7-7.2 8.2-7.2s8.2 2.9 8.2 7.2z"/></g></svg><span class="pfp__add" aria-hidden="true">+</span>`}
        </button>
        ${PHOTO?`<button class="pfp-x" type="button" data-pfp-del aria-label="Hapus foto profil">✕</button>`:''}
      </div>
    </div>
  </header>
  <main class="page">
    <div class="absen absen--top">${ABSEN.map(a=>`<a class="absen__btn" href="${a.url}" target="_blank" rel="noopener noreferrer"><span class="absen__label">${a.label}</span><span class="absen__go">↗</span></a>`).join('')}</div>
    <section class="hero hero--${cls}">
      <div class="hero__eyebrow"><span class="dot"></span>Shift hari ini</div>
      <div class="hero__main"><div class="hero__shift">${hs.big}</div>${hs.chip?`<span class="hero__chip">${hs.chip}</span>`:''}</div>
      <div class="hero__sub">${HARI[today.getDay()].toUpperCase()} · ${today.getDate()} ${BULAN[today.getMonth()].toUpperCase()} ${today.getFullYear()}</div>
      ${hol?`<div class="hero__flag">Tanggal merah · ${esc(hol)}</div>`:''}
      <div class="hero__rule"></div>
      ${hs.time?`<div class="hero__time">${hs.time}</div>`:''}
      <div class="hero__quote"><span class="hero__qmark">“</span>${hs.quote}</div>
    </section>
    ${sectionTitle('Bertugas hari ini')}
    <div class="stack">
      ${shiftGroup('P',r.byShift.P)}${shiftGroup('S',r.byShift.S)}${shiftGroup('M',r.byShift.M)}
      ${r.byShift.C.length?`<div class="restline restline--cuti">Cuti — ${r.byShift.C.map(x=>esc(x.staff.short)).join(', ')}</div>`:''}
      ${r.byShift.L.length?`<div class="restline">Libur — ${r.byShift.L.map(x=>esc(x.staff.short)).join(', ')}</div>`:''}
    </div>
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
function adjLabel(a){
  if (a.type==='swap')   return { name:`${byId(a.aId).short} ⇄ ${byId(a.bId).short}`, detail:'Tukar shift' };
  if (a.type==='double') return { name:byId(a.staffId).short, detail:`Double · +${SHIFT[a.shift].label}` };
  const s = byId(a.staffId);
  if (a.coverage){ const c=byId(a.coverage.covererId);
    const how = a.coverage.kind==='substitute'?'pengganti':a.coverage.kind==='libur'?'dari libur':a.coverage.kind==='double-akhir'?'upaya terakhir':'double';
    return { name:s.short, detail:`Cuti · diganti ${c.short} (${how})` }; }
  const belum = s.type==='rotator' && ['P','S','M'].includes(baseShiftOf(s,fromKey(a.date)));
  return { name:s.short, detail:'Cuti'+(belum?' · belum diganti':'') };
}
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
    const L = adjLabel(a);
    return `<div class="adj">
      <div class="adj__main"><div class="adj__name">${esc(L.name)}</div>
        <div class="adj__meta">${fmtKey(a.date)} · ${esc(L.detail)}</div></div>
      <button class="adj__del" type="button" data-deladj="${a.id}" aria-label="Hapus">✕</button></div>`;
  }).join('') : `<div class="empty">Belum ada penyesuaian. Buka Kalender, ketuk tanggal, lalu "Tambah penyesuaian".</div>`;

  const debtHTML = debts.length ? debts.map(d=>{
    const ow=byId(d.staffId), cv=byId(d.coverage.covererId), st=debtStatus(d);
    const extra = d.repay ? ` · ${esc(ow.short)} ganti ${SHIFT[d.repay.shift].label} ${fmtKey(d.repay.date)}` : '';
    const action = st.key==='belum'
      ? `<button class="debt__btn" type="button" data-confirm="${d.id}">Konfirmasi</button>`
      : `<button class="debt__btn debt__btn--ghost" type="button" data-confirm="${d.id}">Ubah</button>`;
    return `<div class="debt debt--${st.key}">
      <div class="debt__main">
        <div class="debt__txt"><b>${esc(ow.short)}</b> berutang 1 shift ke <b>${esc(cv.short)}</b></div>
        <div class="debt__meta">sejak ${fmtKey(d.date)}${extra}</div>
        <span class="debt__status debt__status--${st.key}">${st.label}</span>
      </div>${action}</div>`;
  }).join('') : `<div class="empty">Belum ada hutang dinas.</div>`;

  const holHTML = HOL_USER.length ? HOL_USER.map(h=>`<div class="adj">
      <div class="adj__main"><div class="adj__name">${esc(h.name)}</div>
        <div class="adj__meta">${fmtKey(h.date)} · ${h.scope==='all'?'Semua petugas libur':'Hanya petugas dinas pagi'}</div></div>
      <button class="adj__del" type="button" data-delhol="${h.date}" aria-label="Hapus">✕</button></div>`).join('')
    : `<div class="empty">Belum ada hari libur instansi. Tambahkan bila instansi menetapkan libur di luar tanggal merah nasional.</div>`;

  return `
  <header class="topbar topbar--cal"><div class="topbar__row"><h1 class="cal__title">Atur</h1></div>
    <div class="cal__sub">Penyesuaian, hari libur instansi, hutang dinas & konflik</div></header>
  <main class="page">
    ${conflictHTML}
    ${sectionTitle('Penyesuaian aktif')}
    <div class="list">${adjHTML}</div>
    ${sectionTitle('Hari libur instansi')}
    <div class="list">${holHTML}</div>
    <button class="bigbtn bigbtn--ghost" type="button" data-addhol>+ Tambah hari libur instansi</button>
    ${sectionTitle('Arsip hutang dinas')}
    <div class="list">${debtHTML}</div>
  </main>`;
}
const fmtKey = k => { const d=fromKey(k); return `${d.getDate()} ${BULAN3[d.getMonth()]} ${d.getFullYear()}`; };

/* ---------------- Lembar: tambah hari libur instansi ---------------- */
function openHolForm(){
  holScope = 'all';
  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true">
      <div class="sheet__grab"></div>
      <div class="sheet__head"><div><div class="sheet__eyebrow">Hari libur instansi</div>
        <div class="sheet__date">Tambah tanggal libur</div></div>
        <button class="iconbtn" type="button" data-close>✕</button></div>
      <div class="field"><label>Nama libur</label><input id="holName" class="input" type="text" placeholder="mis. HUT Instansi, Cuti Bersama Lokal"></div>
      <div class="field"><label>Tanggal</label><input id="holDate" class="input" type="date" value="${keyOf(today)}"></div>
      <div class="field"><label>Berlaku untuk</label>
        <div class="seg seg--hol">
          <button class="seg__b seg__b--on" type="button" data-holscope="all">Semua petugas</button>
          <button class="seg__b" type="button" data-holscope="pagi">Hanya dinas pagi</button>
        </div>
        <p class="hint">“Semua petugas” → rotator & cadangan ikut libur (instansi tutup). “Hanya dinas pagi” → hanya petugas pagi/cadangan libur, rotator tetap menjalankan shift.</p></div>
      <button class="bigbtn" type="button" data-savehol>Simpan hari libur</button>
    </div>`;
  sheetEl().classList.add('is-open');
}
function saveHolForm(){
  const name = (document.getElementById('holName').value||'').trim() || 'Libur instansi';
  const date = document.getElementById('holDate').value;
  if (!date) return;
  addHol({ date, name, scope: holScope||'all' });
  closeSheet(); render();
}

/* ---------------- Lembar: detail tanggal ---------------- */
const sheetEl = () => document.getElementById('sheet');
function closeSheet(){ sheetEl().classList.remove('is-open'); addCtx=null; }

function openDay(d){
  const date=new Date(state.y,state.m,d), r=resolveDay(date), hol=holiday(date);
  const closed = (holidayInfo(date)||{}).scope==='all';
  const my = userInfo(date);
  const myLabel = my.state==='cuti'?'Cuti':my.state==='libur'?'Libur':my.shifts.map(s=>SHIFT[s].label).join(' + ');
  const myCls = my.state==='cuti'?'cuti':(my.cls||'libur');
  const dayAdj = ADJ.filter(a=>a.date===keyOf(date));
  const adjList = dayAdj.length ? `<div class="sheet__adjs">${dayAdj.map(a=>{
      const L=adjLabel(a);
      return `<div class="adj adj--sm"><div class="adj__main"><div class="adj__name">${esc(L.name)}</div><div class="adj__meta">${esc(L.detail)}</div></div>
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
      ${r.conflicts.length ? (closed
        ? `<div class="sheet__info">Instansi libur — seluruh petugas off hari ini.</div>`
        : `<div class="sheet__warn">⚠ ${r.conflicts.map(s=>SHIFT[s].label).join(', ')} belum ada petugas</div>`) : ''}
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
  addCtx = { date:new Date(state.y,state.m,d), day:d, kind:'cuti' };
  renderAddForm();
}
function staffOptions(date, sel){
  return STAFF.map(s=>{ const sh=baseShiftOf(s,date); return `<option value="${s.id}"${s.id===sel?' selected':''}>${esc(s.short)} — ${SHIFT[sh].label}</option>`; }).join('');
}
function renderAddForm(){
  const { date, kind } = addCtx;
  const dk = keyOf(date), dlabel = `${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
  const seg = `<div class="seg">
    <button class="seg__b ${kind==='cuti'?'seg__b--on':''}" type="button" data-kind="cuti">Cuti</button>
    <button class="seg__b ${kind==='tukar'?'seg__b--on':''}" type="button" data-kind="tukar">Tukar</button>
    <button class="seg__b ${kind==='double'?'seg__b--on':''}" type="button" data-kind="double">Double</button></div>`;
  let fields;
  if (kind==='cuti'){
    fields = `<div class="field"><label>Petugas</label><select id="f1" class="select">${staffOptions(date)}</select></div>
      <div class="field2">
        <div class="field"><label>Dari tanggal</label><input id="fStart" class="input" type="date" value="${dk}"></div>
        <div class="field"><label>Sampai</label><input id="fEnd" class="input" type="date" value="${dk}"></div></div>
      <p class="hint">Satu hari atau rentang. Pengganti tiap hari diatur di langkah berikutnya.</p>`;
  } else if (kind==='tukar'){
    fields = `<div class="field"><label>Petugas A</label><select id="f1" class="select">${staffOptions(date)}</select></div>
      <div class="field"><label>Tukar shift dengan</label><select id="f2" class="select">${staffOptions(date,'aldi')}</select></div>
      <p class="hint">Keduanya bertukar shift pada ${dlabel}.</p>`;
  } else {
    fields = `<div class="field"><label>Petugas</label><select id="f1" class="select">${staffOptions(date)}</select></div>
      <div class="field"><label>Ambil shift tambahan</label>
        <select id="f2" class="select"><option value="P">Pagi</option><option value="S">Sore</option><option value="M">Malam</option></select></div>
      <p class="hint">Petugas bertugas ganda (double) pada ${dlabel}.</p>`;
  }
  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true">
      <div class="sheet__grab"></div>
      <div class="sheet__head"><div><div class="sheet__eyebrow">Tambah penyesuaian</div>
        <div class="sheet__date">${dlabel}</div></div>
        <button class="iconbtn" type="button" data-close>✕</button></div>
      <div class="field"><label>Jenis</label>${seg}</div>
      ${fields}
      <button class="bigbtn" type="button" data-addnext>Lanjut</button>
    </div>`;
  sheetEl().classList.add('is-open');
}
function addNext(){
  const val = id => document.getElementById(id).value;
  const kind = addCtx.kind;
  if (kind==='tukar'){
    const aId=val('f1'), bId=val('f2');
    if (aId===bId) return;
    addAdj({ type:'swap', date:keyOf(addCtx.date), aId, bId });
    closeSheet(); render(); return;
  }
  if (kind==='double'){
    addAdj({ type:'double', date:keyOf(addCtx.date), staffId:val('f1'), shift:val('f2') });
    closeSheet(); render(); return;
  }
  // cuti — bisa satu hari atau rentang
  const id=val('f1'); addCtx.staffId=id;
  let a=fromKey(val('fStart')), b=fromKey(val('fEnd'));
  if (b<a){ const t=a; a=b; b=t; }
  const days=[]; for (let dt=new Date(a); dt<=b; dt=addDays(dt,1)) days.push(new Date(dt));
  if (days.length===1){
    const day=days[0], base=baseShiftOf(byId(id),day);
    if (byId(id).type==='cadangan' || base==='L'){ addAdj({ type:'cuti', staffId:id, date:keyOf(day), coverage:null }); closeSheet(); render(); return; }
    addCtx.date=day; renderPicker(); return;
  }
  buildRangePlan(id, days); renderRangeReview();
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
  const adj = { type:'cuti', staffId:addCtx.staffId, date:keyOf(addCtx.date), coverage:null };
  if (covererId) adj.coverage = { covererId, shift:X, kind, color, debt:debt==='1' };
  addAdj(adj);
  closeSheet(); render();
}

/* ---------------- Lembar: cuti rentang (rencana per hari) ---------------- */
let rangePlan = null;
function buildRangePlan(staffId, days){
  const s = byId(staffId);
  const items = days.map(dt=>{
    const base = baseShiftOf(s, dt);
    if (s.type==='cadangan' || base==='L') return { date:keyOf(dt), shift:base, off:true, cover:null };
    const top = candidatesFor(staffId, dt).list.find(c=>c.color!=='red');
    return { date:keyOf(dt), shift:base, off:false,
      cover: top ? { covererId:top.covererId, shift:top.X, kind:top.kind, color:top.color, debt:top.debt } : null };
  });
  rangePlan = { staffId, items };
}
const dlabelShort = k => { const d=fromKey(k); return `${HARI3[(d.getDay()+6)%7]}, ${d.getDate()} ${BULAN3[d.getMonth()]}`; };
function renderRangeReview(){
  const s=byId(rangePlan.staffId), items=rangePlan.items;
  const rows = items.map((it,i)=>{
    if (it.off) return `<div class="rev"><span class="rev__d">${dlabelShort(it.date)}</span><span class="rev__s">Libur — tak perlu pengganti</span></div>`;
    if (!it.cover) return `<button class="rev rev--empty" type="button" data-rangepick="${i}"><span class="rev__d">${dlabelShort(it.date)} · ${SHIFT[it.shift].label}</span><span class="rev__s">Kosong — ketuk untuk atur</span></button>`;
    const cv=byId(it.cover.covererId);
    return `<button class="rev rev--${it.cover.color}" type="button" data-rangepick="${i}"><span class="rev__d">${dlabelShort(it.date)} · ${SHIFT[it.shift].label}</span><span class="rev__s"><span class="cand__dot"></span>${esc(cv.short)} · ${coverHow(it.cover)}</span></button>`;
  }).join('');
  const fk=fromKey(items[0].date), lk=fromKey(items[items.length-1].date);
  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true">
      <div class="sheet__grab"></div>
      <div class="sheet__head"><div><div class="sheet__eyebrow">Cuti ${esc(s.short)}</div>
        <div class="sheet__date">${fk.getDate()} ${BULAN3[fk.getMonth()]} – ${lk.getDate()} ${BULAN3[lk.getMonth()]} ${lk.getFullYear()}</div></div>
        <button class="iconbtn" type="button" data-close>✕</button></div>
      <p class="hint">Pengganti dipilih otomatis (Muhraini diutamakan). Ketuk hari untuk mengganti.</p>
      <div class="revs">${rows}</div>
      <button class="bigbtn" type="button" data-rangeapply>Terapkan · ${items.length} hari</button>
    </div>`;
  sheetEl().classList.add('is-open');
}
function renderRangePicker(i){
  const it = rangePlan.items[i];
  const { X, list } = candidatesFor(rangePlan.staffId, fromKey(it.date));
  const rows = list.map(c=>{
    const cv=byId(c.covererId), dis=c.color==='red';
    return `<button class="cand cand--${c.color}" type="button" ${dis?'disabled':`data-rangecover="${i}|${c.covererId}|${c.X}|${c.kind}|${c.color}|${c.debt?1:0}"`}>
      <span class="cand__dot"></span>
      <span class="cand__body"><span class="cand__name">${esc(cv.short)}</span><span class="cand__how">${coverHow(c)}</span></span>
      <span class="cand__badge cand__badge--${c.color}">${COVER_COLOR[c.color]}</span></button>`;
  }).join('');
  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true">
      <div class="sheet__grab"></div>
      <div class="sheet__head"><div><div class="sheet__eyebrow">Pengganti · ${dlabelShort(it.date)}</div>
        <div class="sheet__date">${esc(byId(rangePlan.staffId).short)} cuti · ${SHIFT[X].label}</div></div>
        <button class="iconbtn" type="button" data-rangeback>‹</button></div>
      <div class="cands">${rows||'<div class="empty">Tidak ada kandidat.</div>'}</div>
      <button class="bigbtn bigbtn--ghost" type="button" data-rangecover="${i}||${X}||none|0">Biarkan kosong</button>
    </div>`;
  sheetEl().classList.add('is-open');
}
function setRangeCover(v){
  const p=v.split('|'), i=+p[0], covererId=p[1];
  rangePlan.items[i].cover = covererId ? { covererId, shift:p[2], kind:p[3], color:p[4], debt:p[5]==='1' } : null;
  renderRangeReview();
}
function applyRange(){
  for (const it of rangePlan.items) addAdj({ type:'cuti', staffId:rangePlan.staffId, date:it.date, coverage: it.off ? null : (it.cover||null) });
  rangePlan=null; closeSheet(); render();
}

/* ---------------- Lembar: jadwalkan pelunasan hutang ---------------- */
function openRepay(debtId){
  const d = findAdj(debtId);
  if (!d || !d.coverage) return;
  const ow = byId(d.staffId);            // debitur (mis. Humaidi)
  const cv = byId(d.coverage.covererId); // kreditur (mis. Aldi)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end   = new Date(today.getFullYear(), today.getMonth()+2, 0); // akhir bulan depan
  const usedRepay = new Set(ADJ.filter(a=>a.repay && a.id!==debtId).map(a=>a.repay.date));
  const months = {};
  for (let dt=new Date(start); dt<=end; dt=addDays(dt,1)){
    const sh = baseShiftOf(cv, dt);
    if (!['P','S','M'].includes(sh)) continue;          // hanya hari kerja kreditur
    const k = keyOf(dt);
    if (dayHasAdj(dt) || usedRepay.has(k)) continue;     // hindari tanggal yg sudah dipakai
    const hb = baseShiftOf(ow, dt);
    let color, hint;
    if (hb==='L'){ color='green'; hint=`${ow.short} libur — ideal`; }
    else { color = restColor(ow, sh, dt); hint = color==='red' ? `${ow.short} tak bisa` : `${ow.short} double ${hb}+${sh}`; }
    const mk = dt.getFullYear()+'-'+dt.getMonth();
    if (!months[mk]) months[mk] = [];
    months[mk].push({ k, sh, color, hint, dt:new Date(dt) });
  }
  const blocks = Object.keys(months).map(mk=>{
    const mm = +mk.split('-')[1], yy = +mk.split('-')[0];
    const rows = months[mk].map(o=>{
      const dis = o.color==='red';
      return `<button class="cand cand--${o.color}" type="button" ${dis?'disabled':`data-setrepay="${debtId}|${o.k}|${o.sh}"`}>
        <span class="cand__dot"></span>
        <span class="cand__body"><span class="cand__name">${HARI3[(o.dt.getDay()+6)%7]}, ${o.dt.getDate()} ${BULAN3[mm]} · ${SHIFT[o.sh].label}</span>
          <span class="cand__how">${esc(o.hint)}</span></span></button>`;
    }).join('');
    return `<div class="repay__month">${BULAN[mm]} ${yy}</div>${rows}`;
  }).join('');
  sheetEl().innerHTML = `
    <div class="sheet__card" role="dialog" aria-modal="true">
      <div class="sheet__grab"></div>
      <div class="sheet__head"><div><div class="sheet__eyebrow">Jadwalkan pelunasan</div>
        <div class="sheet__date">${esc(ow.short)} ganti dinas ${esc(cv.short)}</div></div>
        <button class="iconbtn" type="button" data-close>✕</button></div>
      <p class="hint">Pilih dinas ${esc(cv.short)} yang diambil ${esc(ow.short)} — ${esc(cv.short)} libur, ${esc(ow.short)} masuk. Otomatis “Lunas” setelah tanggalnya lewat.</p>
      <div class="cands">${blocks||'<div class="empty">Tidak ada tanggal cocok dalam 2 bulan ke depan.</div>'}</div>
      ${d.repay?`<button class="bigbtn bigbtn--ghost" type="button" data-clearrepay="${debtId}">Hapus jadwal pelunasan</button>`:''}
    </div>`;
  sheetEl().classList.add('is-open');
}
function setRepay(val){
  const [id, date, shift] = val.split('|');
  const d = findAdj(id); if (d){ d.repay = { date, shift }; saveAdj(); }
  closeSheet(); render();
}
function clearRepay(id){
  const d = findAdj(id); if (d){ delete d.repay; saveAdj(); }
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

/* ---------------- Simulasi (proyeksi masa depan) ---------------- */
let simDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let simScroll = false;
function teammates(date, sh){ return resolveDay(date).byShift[sh].filter(x=>!x.staff.isUser).map(x=>x.staff.short); }
const shiftCodeOf  = my => my.state==='cuti'?'C':my.state==='libur'?'L':my.primary;
const shiftClsOf   = my => my.state==='cuti'?'cuti':(my.cls||'libur');
const shiftLabelOf = my => my.state==='cuti'?'Cuti':my.state==='libur'?'Libur':my.shifts.map(s=>SHIFT[s].label).join(' + ');
const dlabelFull   = k => { const d=fromKey(k); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };

function ritmeStrip(n){
  let cells='';
  for (let i=0;i<n;i++){
    const dt=addDays(today,i), my=userInfo(dt), hol=holiday(dt);
    cells += `<button class="rday${i===0?' rday--today':''}" type="button" data-simdate="${keyOf(dt)}">
      <span class="rday__w">${HARI3[(dt.getDay()+6)%7]}</span>
      <span class="rday__d">${dt.getDate()}</span>
      <span class="rday__p rday__p--${shiftClsOf(my)}">${shiftCodeOf(my)}</span>
      ${my.dbl?'<span class="rday__x">2×</span>':(hol?'<span class="rday__h" title="tanggal merah">•</span>':'')}</button>`;
  }
  return `<div class="ritme">${cells}</div>`;
}
function cekResult(date){
  const my=userInfo(date), hol=holiday(date);
  const head = `<div class="simr__date">${dlabelFull(keyOf(date))}</div>${hol?`<div class="simr__hol">Tanggal merah · ${esc(hol)}</div>`:''}`;
  let body;
  if (my.state==='cuti') body = `<div class="simr__big simr__big--cuti">Cuti</div>`;
  else if (my.state==='libur') body = `<div class="simr__big simr__big--libur">Libur</div><div class="simr__sub">Tidak ada jadwal dinas — selamat berlibur.</div>`;
  else {
    const blocks = my.shifts.map(sh=>{
      const tm = teammates(date, sh);
      return `<div class="simr__shift">
        <span class="simr__pill simr__pill--${SHIFT[sh].cls}">${SHIFT[sh].label}</span>
        <span class="simr__time">${SHIFT[sh].time}</span>
        <div class="simr__team">${tm.length?('Bersama '+tm.map(esc).join(', ')):'Sendiri di sif ini'}</div></div>`;
    }).join('');
    body = `${my.dbl?'<div class="simr__note">Dinas ganda (double)</div>':''}${blocks}`;
  }
  return `<div class="simr" id="simResult">${head}${body}</div>`;
}
function hariBesarList(){
  const tk=keyOf(today);
  const up = Object.keys(HOLIDAYS).filter(k=>k>=tk).sort().slice(0,10);
  if (!up.length) return '<div class="empty">Tidak ada hari besar mendatang dalam data.</div>';
  return up.map(k=>{
    const dt=fromKey(k), my=userInfo(dt), est=HOLIDAY_EST.has(k);
    return `<button class="hbig" type="button" data-simdate="${k}">
      <div class="hbig__l"><div class="hbig__n">${esc(HOLIDAYS[k])}${est?' <span class="hbig__est">perkiraan</span>':''}</div>
        <div class="hbig__d">${dlabelShort(k)} ${dt.getFullYear()}</div></div>
      <span class="hbig__p hbig__p--${shiftClsOf(my)}">${shiftLabelOf(my)}</span></button>`;
  }).join('');
}
function renderSimulasi(){
  return `
  <header class="topbar topbar--cal"><div class="topbar__row"><h1 class="cal__title">Simulasi</h1></div>
    <div class="cal__sub">Proyeksi jadwal ${esc(USER.short)} ke depan · mengikuti pola shift otomatis</div>
  </header>
  <main class="page">
    ${sectionTitle('Ritme 2 minggu ke depan')}
    ${ritmeStrip(14)}
    ${sectionTitle('Cek tanggal')}
    <div class="field"><input id="simInput" class="input" type="date" value="${keyOf(simDate)}"></div>
    ${cekResult(simDate)}
    ${sectionTitle('Hari besar mendatang')}
    <div class="hbigs">${hariBesarList()}</div>
    <p class="hint" style="margin-top:10px">Tanggal hari raya 2027 masih <b>perkiraan</b> — tanggal resmi menyusul lewat SKB pemerintah. Ketuk hari mana pun untuk lihat detailnya.</p>
  </main>`;
}

/* ---------------- Nav + mount ---------------- */
const NAV = [
  {id:'beranda',  label:'Beranda',  icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.7 12 3.5l9 7.2"/><path d="M5.2 9.4V20h13.6V9.4"/></svg>'},
  {id:'kalender', label:'Kalender', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 9.6h17"/><path d="M8 3.3v3.4M16 3.3v3.4"/></svg>'},
  {id:'simulasi', label:'Simulasi', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.1 1.9"/></svg>'},
  {id:'atur',     label:'Atur',     icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'},
];
function renderNav(){
  const badge = (allConflicts().length)? '<span class="tab__badge"></span>':'';
  return `<nav class="tabbar tabbar--4">${NAV.map(n=>`<button type="button" class="tab ${state.view===n.id?'tab--on':''}" data-view="${n.id}">
    <span class="tab__icon">${n.icon}${n.id==='atur'?badge:''}</span><span class="tab__label">${n.label}</span></button>`).join('')}</nav>`;
}
function render(){
  const v = document.getElementById('view');
  v.innerHTML = state.view==='beranda'?renderBeranda():state.view==='kalender'?renderKalender():state.view==='simulasi'?renderSimulasi():renderAtur();
  document.getElementById('nav').innerHTML = renderNav();
  if(simScroll){ simScroll=false; requestAnimationFrame(()=>{ const r=document.getElementById('simResult'); if(r) r.scrollIntoView({behavior:'smooth',block:'center'}); }); }
  else window.scrollTo({top:0});
}

/* ---------------- Events ---------------- */
document.addEventListener('click', e => {
  const view=e.target.closest('[data-view]'); if(view){ state.view=view.dataset.view; closeSheet(); render(); return; }
  if(e.target.closest('[data-pfp-del]')){ clearPhoto(); render(); return; }
  if(e.target.closest('[data-pfp]')){ pickPhoto(); return; }
  const nav=e.target.closest('[data-nav]'); if(nav){ const v=nav.dataset.nav;
    if(v==='now'){state.y=today.getFullYear();state.m=today.getMonth();} else {state.m+=+v; if(state.m<0){state.m=11;state.y--;} if(state.m>11){state.m=0;state.y++;}} render(); return; }
  if(e.target.closest('[data-pick]')){ openPicker(); return; }
  const ys=e.target.closest('[data-ystep]'); if(ys){ pickYear+=+ys.dataset.ystep; renderMonthPicker(); return; }
  const jm=e.target.closest('[data-jump]'); if(jm){ const [y,m]=jm.dataset.jump.split('.'); state.y=+y;state.m=+m; closeSheet(); render(); return; }
  const add=e.target.closest('[data-add]'); if(add){ openAdd(+add.dataset.add); return; }
  const kd=e.target.closest('[data-kind]'); if(kd){ addCtx.kind=kd.dataset.kind; renderAddForm(); return; }
  if(e.target.closest('[data-addhol]')){ openHolForm(); return; }
  if(e.target.closest('[data-savehol]')){ saveHolForm(); return; }
  const hsc=e.target.closest('[data-holscope]'); if(hsc){ holScope=hsc.dataset.holscope;
    sheetEl().querySelectorAll('.seg--hol .seg__b').forEach(b=>b.classList.toggle('seg__b--on', b.dataset.holscope===holScope)); return; }
  const dh=e.target.closest('[data-delhol]'); if(dh){ removeHol(dh.dataset.delhol); render(); return; }
  if(e.target.closest('[data-addnext]')){ addNext(); return; }
  const cov=e.target.closest('[data-cover]'); if(cov){ applyCover(cov.dataset.cover); return; }
  const rpk=e.target.closest('[data-rangepick]'); if(rpk){ renderRangePicker(+rpk.dataset.rangepick); return; }
  if(e.target.closest('[data-rangeback]')){ renderRangeReview(); return; }
  const rco=e.target.closest('[data-rangecover]'); if(rco){ setRangeCover(rco.dataset.rangecover); return; }
  if(e.target.closest('[data-rangeapply]')){ applyRange(); return; }
  const del=e.target.closest('[data-deladj]'); if(del){ removeAdj(del.dataset.deladj); if(sheetEl().classList.contains('is-open')) closeSheet(); render(); return; }
  const cf=e.target.closest('[data-confirm]'); if(cf){ openRepay(cf.dataset.confirm); return; }
  const sr=e.target.closest('[data-setrepay]'); if(sr){ setRepay(sr.dataset.setrepay); return; }
  const cr=e.target.closest('[data-clearrepay]'); if(cr){ clearRepay(cr.dataset.clearrepay); return; }
  const day=e.target.closest('[data-day]'); if(day){ openDay(+day.dataset.day); return; }
  const sd=e.target.closest('[data-simdate]'); if(sd){ simDate=fromKey(sd.dataset.simdate); simScroll=true; render(); return; }
  if(e.target.closest('[data-close]')||e.target.id==='sheet'){ closeSheet(); }
});
document.addEventListener('change', e=>{ if(e.target.id==='simInput'){ simDate=fromKey(e.target.value); simScroll=true; render(); } });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSheet(); });

render();
if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
