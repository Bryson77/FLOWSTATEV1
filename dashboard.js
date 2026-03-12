/* ── theme ── */
const html = document.documentElement;
(()=>{
  const t=localStorage.getItem('fs4_theme');
  if(t){html.dataset.theme=t;const b=document.getElementById('th-btn');if(b)b.textContent=t==='light'?'Light':'Dark';}
})();
function toggleTheme(){
  const is=html.dataset.theme==='light';
  html.dataset.theme=is?'dark':'light';
  document.getElementById('th-btn').textContent=is?'Dark':'Light';
  localStorage.setItem('fs4_theme',html.dataset.theme);
}

/* ── toast ── */
let ttm;
function dbToast(m){
  const e=document.getElementById('db-toast');
  e.textContent=m;e.classList.add('show');
  clearTimeout(ttm);ttm=setTimeout(()=>e.classList.remove('show'),2400);
}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* ── auth ui ── */
function switchTab(t){
  document.getElementById('tab-in').style.display=t==='in'?'':'none';
  document.getElementById('tab-up').style.display=t==='up'?'':'none';
  document.querySelectorAll('.auth-tab').forEach((b,i)=>b.classList.toggle('active',(t==='in'&&i===0)||(t==='up'&&i===1)));
  clearNotices();
}
function showErr(m){const e=document.getElementById('auth-err');e.textContent=m;e.classList.add('show');}
function showMsg(m){const e=document.getElementById('auth-msg');e.textContent=m;e.classList.add('show');}
function clearNotices(){document.getElementById('auth-err').classList.remove('show');document.getElementById('auth-msg').classList.remove('show');}
function setLoading(on){
  document.getElementById('auth-form').style.display=on?'none':'';
  document.getElementById('auth-loading').style.display=on?'':'none';
}

/* ── sign in ── */
async function doSignIn(){
  clearNotices();
  const email=document.getElementById('si-email').value.trim();
  const pass=document.getElementById('si-pass').value;
  if(!email||!pass){showErr('Please fill in all fields.');return;}
  const btn=document.getElementById('si-btn');
  btn.disabled=true;btn.textContent='Signing in…';
  try{await sbSignInEmail(email,pass);}
  catch(e){showErr(e.message||'Sign in failed.');btn.disabled=false;btn.textContent='Sign in';}
}
async function doSignUp(){
  clearNotices();
  const name=document.getElementById('su-name').value.trim();
  const email=document.getElementById('su-email').value.trim();
  const pass=document.getElementById('su-pass').value;
  if(!name||!email||!pass){showErr('Please fill in all fields.');return;}
  if(pass.length<8){showErr('Password must be at least 8 characters.');return;}
  const btn=document.getElementById('su-btn');
  btn.disabled=true;btn.textContent='Creating…';
  try{
    await sbSignUpEmail(email,pass,name);
    showMsg('Account created! Check your email to confirm, then sign in.');
    btn.disabled=false;btn.textContent='Create account';
  }catch(e){showErr(e.message||'Sign up failed.');btn.disabled=false;btn.textContent='Create account';}
}
async function doGoogle(){
  clearNotices();
  try{await sbSignInGoogle();}
  catch(e){showErr(e.message||'Google sign in failed.');}
}
async function doSignOut(){
  await sbSignOut();
  document.getElementById('dashboard').style.display='none';
  document.getElementById('auth-screen').style.display='flex';
}

/* enter key */
['si-email','si-pass'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter')doSignIn();});
});
['su-name','su-email','su-pass'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter')doSignUp();});
});

/* ── local data ── */
function getLocal(){
  try{
    return{
      stats:JSON.parse(localStorage.getItem('fs4_stats')||'{}'),
      hist: JSON.parse(localStorage.getItem('fs4_hist') ||'[]')
    };
  }catch{return{stats:{},hist:[]};}
}

/* ── render ── */
function fillProfile(user){
  const name=user.user_metadata?.full_name||user.email?.split('@')[0]||'User';
  const init=name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const joined=new Date(user.created_at).toLocaleDateString([],{month:'long',year:'numeric'});
  document.getElementById('db-av').textContent=init;
  document.getElementById('db-uname').textContent=name.split(' ')[0];
  document.getElementById('db-hero-av').textContent=init;
  document.getElementById('db-hero-name').textContent=name;
  document.getElementById('db-hero-email').textContent=user.email;
  document.getElementById('db-hero-joined').textContent='Member since '+joined;
}

function fillStats(s,hist){
  const m=s.focusMins||0;
  const hrs=m>=60?(m/60).toFixed(1)+'h':m+'m';
  const streak=s.streak||0;
  document.getElementById('db-streak-num').innerHTML=`${streak}<em> day streak</em>`;
  document.getElementById('db-best').textContent=s.best||0;
  document.getElementById('db-week').textContent=s.week||0;
  document.getElementById('db-total').textContent=s.total||0;
  document.getElementById('db-hours').textContent=hrs;
  document.getElementById('db-today').textContent=s.today||0;
  document.getElementById('db-tasks').textContent=s.tasksDone||0;

  /* flame */
  const fl=document.getElementById('db-flame');
  if(streak>=30){fl.textContent='🔥';fl.className='db-flame hot';}
  else if(streak>=7){fl.textContent='🔥';fl.className='db-flame hot';}
  else if(streak>=3){fl.textContent='⚡';fl.className='db-flame hot';}
  else if(streak>=1){fl.textContent='✦'; fl.className='db-flame';}
  else{fl.textContent='○';fl.className='db-flame';}

  /* badges */
  const bd=document.getElementById('db-badges');bd.innerHTML='';
  [
    {lbl:'1 day',req:1,k:'streak'},{lbl:'7 days',req:7,k:'streak'},{lbl:'30 days',req:30,k:'streak'},
    {lbl:'10 sessions',req:10,k:'total'},{lbl:'50 sessions',req:50,k:'total'},{lbl:'100 sessions',req:100,k:'total'},
  ].forEach(b=>{
    const val=b.k==='streak'?streak:(s.total||0);
    const d=document.createElement('div');
    d.className='db-badge'+(val>=b.req?' earned':'');
    d.textContent=(val>=b.req?'✓ ':'')+b.lbl;
    bd.appendChild(d);
  });
}

function buildHeatmap(hist){
  const hm=document.getElementById('db-heatmap');
  const mr=document.getElementById('db-month-row');
  if(!hm)return;
  hm.innerHTML='';mr.innerHTML='';

  const WEEKS=24;
  const now=new Date();
  const counts={};
  hist.forEach(h=>{const d=(h.date||'').slice(0,10);if(d)counts[d]=(counts[d]||0)+1;});

  const start=new Date(now);
  start.setDate(start.getDate()-start.getDay()-(WEEKS-1)*7);

  /* day label col */
  const lblCol=document.createElement('div');
  lblCol.className='hm-col lbl-col';
  ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>{
    const c=document.createElement('div');c.className='hm-cell';c.textContent=d;lblCol.appendChild(c);
  });
  hm.appendChild(lblCol);

  /* month labels */
  let lastM=-1;
  for(let w=0;w<WEEKS;w++){
    const d=new Date(start);d.setDate(d.getDate()+w*7);
    const lbl=document.createElement('div');
    lbl.className='db-month-lbl';
    if(d.getMonth()!==lastM){lbl.textContent=d.toLocaleDateString([],{month:'short'});lastM=d.getMonth();}
    mr.appendChild(lbl);
  }

  /* week cols */
  const todayISO=now.toISOString().slice(0,10);
  for(let w=0;w<WEEKS;w++){
    const col=document.createElement('div');col.className='hm-col';
    for(let d=0;d<7;d++){
      const date=new Date(start);date.setDate(date.getDate()+w*7+d);
      const cell=document.createElement('div');
      if(date>now){cell.className='hm-cell';cell.style.background='transparent';}
      else{
        const iso=date.toISOString().slice(0,10);
        const cnt=counts[iso]||0;
        const lvl=cnt===0?0:cnt===1?1:cnt<=3?2:cnt<=5?3:4;
        cell.className=`hm-cell lv${lvl}${iso===todayISO?' today-cell':''}`;
        cell.title=iso+(cnt?` · ${cnt} session${cnt>1?'s':''}`:'');
      }
      col.appendChild(cell);
    }
    hm.appendChild(col);
  }
}

function buildHistory(hist){
  const list=document.getElementById('db-hist-list');
  const cnt=document.getElementById('db-hist-cnt');
  if(!list)return;
  cnt.textContent=hist.length+' session'+(hist.length!==1?'s':'');
  list.innerHTML='';
  if(!hist.length){
    list.innerHTML='<div class="db-empty">No sessions yet.<br>Complete your first focus block in the timer to see it here.</div>';
    return;
  }
  hist.slice(0,100).forEach(h=>{
    const d=new Date(h.date);
    const item=document.createElement('div');
    item.className='db-hist-item';
    item.innerHTML=`
      <div class="db-hist-dot"></div>
      <div class="db-hist-info">
        <div class="db-hist-label">${esc(h.label||'Focus session')}</div>
        <div class="db-hist-meta">${d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})} · ${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <div class="db-hist-dur">${h.mins||45}m</div>`;
    list.appendChild(item);
  });
}

async function loadDashboard(user){
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('dashboard').style.display='block';
  fillProfile(user);

  /* local first */
  const{stats:ls,hist:lh}=getLocal();
  fillStats(ls,lh);buildHeatmap(lh);buildHistory(lh);

  /* cloud overlay — runs even if cloud returns empty (new account) */
  try{
    const[cs,csess]=await Promise.all([sbFetchStats(user.id),sbFetchSessions(user.id)]);
    /* cs is null on a brand new account — that's fine, just use local */
    const merged={
      streak:   Math.max(ls.streak||0,   cs?.focus_streak||0),
      total:    Math.max(ls.total||0,    cs?.total_sessions||0),
      focusMins:Math.max(ls.focusMins||0,cs?.total_focus_time||0),
      tasksDone:Math.max(ls.tasksDone||0,cs?.tasks_done||0),
      best:     Math.max(ls.best||0,     cs?.best_day||0),
      today:ls.today||0,week:ls.week||0,
    };
    /* merge cloud sessions with local history, deduplicate */
    const combined=[...lh];
    (csess||[]).forEach(s=>{
      if(!combined.some(h=>h.date?.slice(0,10)===s.date&&h.label===s.label))
        combined.push({date:s.date+'T00:00:00Z',label:s.label||'Focus session',mins:s.duration});
    });
    combined.sort((a,b)=>new Date(b.date)-new Date(a.date));
    fillStats(merged,combined);buildHeatmap(combined);buildHistory(combined);
  }catch(e){
    /* only show CTA if it looks like a config/connection problem, not empty data */
    if(e.message&&(e.message.includes('fetch')||e.message.includes('network')||e.message.includes('initialised'))){
      document.getElementById('db-cta').style.display='';
    }
    console.warn('Cloud fetch issue:',e.message);
  }
}

/* ── init ── */
async function init(){
  const configured=typeof SUPABASE_URL!=='undefined'&&!SUPABASE_URL.includes('YOUR_PROJECT');
  if(!configured){
    /* no keys — show local data, skip auth */
    document.getElementById('auth-screen').style.display='none';
    document.getElementById('dashboard').style.display='block';
    document.getElementById('db-cta').style.display='';
    const{stats:ls,hist:lh}=getLocal();
    document.getElementById('db-av').textContent='?';
    document.getElementById('db-uname').textContent='Guest';
    document.getElementById('db-hero-av').textContent='?';
    document.getElementById('db-hero-name').textContent='Guest (not signed in)';
    document.getElementById('db-hero-email').textContent='Add Supabase keys to enable auth';
    document.getElementById('db-hero-joined').textContent='';
    fillStats(ls,lh);buildHeatmap(lh);buildHistory(lh);
    return;
  }

  sbOnAuthChange((event,user)=>{
    if(user){loadDashboard(user);}
    else if(event==='SIGNED_OUT'){
      document.getElementById('dashboard').style.display='none';
      document.getElementById('auth-screen').style.display='flex';
    }
  });

  setLoading(true);
  const user=await sbGetUser();
  setLoading(false);
  if(user){loadDashboard(user);}
}

init();