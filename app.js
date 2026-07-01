// ═══════════════════════════════════════════════════
//  ORBIT — Task Manager v3 · Full Feature Build
// ═══════════════════════════════════════════════════

// ── CONSTANTS ──
const GROUP_COLORS = ['#1a6cff','#2cb67d','#ffa94d','#ff6b6b','#cc5de8','#74c0fc','#f783ac','#a9e34b','#ff922b','#20c997'];
const PRIO_LABELS  = {high:'Alta',medium:'Media',low:'Baja',none:'—'};
const CF_TYPES     = ['texto','número','URL','persona','checkbox'];
const TEMPLATES    = [
  {icon:'🚀',name:'Proyecto de Software',desc:'Backlog · Sprint · En revisión · Listo',groups:[
    {name:'📋 Backlog',color:'#7a8fa8'},{name:'⚡ En progreso',color:'#ffa94d'},{name:'🔍 En revisión',color:'#cc5de8'},{name:'✅ Listo',color:'#2cb67d'}
  ]},
  {icon:'📅',name:'Planeación semanal',desc:'Por hacer · Hoy · Hecho',groups:[
    {name:'📌 Por hacer',color:'#1a6cff'},{name:'🔥 Hoy',color:'#ff6b6b'},{name:'✅ Hecho',color:'#2cb67d'}
  ]},
  {icon:'🎯',name:'OKRs',desc:'Objetivos · Key Results · Iniciativas',groups:[
    {name:'🎯 Objetivos',color:'#cc5de8'},{name:'📊 Key Results',color:'#1a6cff'},{name:'🛠 Iniciativas',color:'#ffa94d'}
  ]},
  {icon:'🐛',name:'Bug Tracker',desc:'Reportado · Investigando · Fix · Cerrado',groups:[
    {name:'🐛 Reportado',color:'#ff6b6b'},{name:'🔎 Investigando',color:'#ffa94d'},{name:'🛠 Fix en curso',color:'#74c0fc'},{name:'✅ Cerrado',color:'#2cb67d'}
  ]},
  {icon:'📝',name:'Editorial',desc:'Ideas · Redacción · Revisión · Publicado',groups:[
    {name:'💡 Ideas',color:'#a9e34b'},{name:'✍️ Redacción',color:'#1a6cff'},{name:'📖 Revisión',color:'#ffa94d'},{name:'🌐 Publicado',color:'#2cb67d'}
  ]},
  {icon:'🏠',name:'Vida personal',desc:'Hogar · Salud · Aprendizaje · Compras',groups:[
    {name:'🏠 Hogar',color:'#ff922b'},{name:'💪 Salud',color:'#2cb67d'},{name:'📚 Aprendizaje',color:'#1a6cff'},{name:'🛒 Compras',color:'#cc5de8'}
  ]},
];

// ── STATE ──
let S = {groups:[],tasks:[],allTags:[],customFieldDefs:[]};
let view          = 'list';
let filterStatus  = 'all';
let filterPrio    = 'all';
let filterTags    = [];
let sortMode      = 'manual';
let searchQ       = '';
let editTaskId    = null;
let editTaskDraft = {};
let selectedColor = GROUP_COLORS[0];
let dragTaskId    = null;
let calYear       = new Date().getFullYear();
let calMonth      = new Date().getMonth();
let cfAddType     = 'texto';
let showHistory   = false;

// ── DOM REFS ──
const $ = id => document.getElementById(id);
const mainEl      = $('main');
const searchInput = $('search-input');
const toast       = $('toast');
const cmdOverlay  = $('cmd-overlay');
const cmdIn       = $('cmd-in');
const cmdResults  = $('cmd-results');
const groupModal  = $('group-modal');
const gmName      = $('gm-name');
const gmColors    = $('gm-colors');
const tplModal    = $('tpl-modal');
const tplGrid     = $('tpl-grid');
const taskModal   = $('task-modal');
const filterBar   = $('filter-bar');
const tagFiltersEl= $('tag-filters');
const sortSel     = $('sort-sel');

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  if (!S.groups.length) seedDefaults();
  buildColorSwatches(gmColors, c => selectedColor = c);
  buildTemplates();
  bindUI();
  render();
});

function seedDefaults() {
  const g1 = mkGroup('📋 Por hacer',   '#1a6cff');
  const g2 = mkGroup('⚡ En progreso', '#ffa94d');
  const g3 = mkGroup('✅ Completado',  '#2cb67d');
  addTask(g1.id,'Diseñar pantalla de inicio','high','',new Date(Date.now()+86400000*3).toISOString().slice(0,10),['diseño']);
  addTask(g1.id,'Revisar requerimientos','medium','','',[]);
  addTask(g1.id,'Escribir tests unitarios','low','','',[]);
  const t2 = addTask(g2.id,'Implementar autenticación','high','Usar JWT + refresh tokens.',new Date(Date.now()-86400000).toISOString().slice(0,10),['backend','auth']);
  t2.subtasks = [{id:uid(),text:'Diseñar schema DB',done:true},{id:uid(),text:'Implementar endpoints',done:false},{id:uid(),text:'Escribir documentación',done:false}];
  const t3 = addTask(g3.id,'Setup del repositorio','low','','',[]);
  t3.done = true;
  S.allTags = ['diseño','backend','auth','frontend','docs','bug'];
}

// ── FACTORIES ──
function mkGroup(name, color) {
  const g = {id:uid(),name,color,collapsed:false,order:Date.now()};
  S.groups.push(g); return g;
}
function addTask(gid, text, priority='none', notes='', due='', tags=[]) {
  const t = {id:uid(),groupId:gid,text,done:false,priority,notes,due,tags:[...tags],subtasks:[],comments:[],customFields:{},history:[],order:Date.now()};
  logHistory(t,'Tarea creada');
  S.tasks.push(t); return t;
}
function uid() { return '_'+Math.random().toString(36).slice(2,9); }

// ── HISTORY ──
function logHistory(task, msg) {
  if (!task.history) task.history = [];
  task.history.unshift({msg, ts: Date.now()});
  if (task.history.length > 30) task.history.pop();
}

// ── RENDER ROUTER ──
function render() {
  updateStats();
  updateTagFilters();
  const q = searchQ.toLowerCase().trim();
  if (view==='list')     renderList(q);
  else if (view==='kanban') renderKanban(q);
  else if (view==='calendar') renderCalendar();
}

// ── FILTERED TASKS FOR GROUP ──
function getGroupTasks(gid) {
  let tasks = S.tasks.filter(t => t.groupId===gid);
  if (filterStatus==='done')    tasks = tasks.filter(t=>t.done);
  if (filterStatus==='pending') tasks = tasks.filter(t=>!t.done);
  if (filterPrio!=='all')       tasks = tasks.filter(t=>t.priority===filterPrio);
  if (filterTags.length)        tasks = tasks.filter(t=>filterTags.every(tag=>t.tags&&t.tags.includes(tag)));
  if (searchQ) {
    const q = searchQ.toLowerCase();
    tasks = tasks.filter(t=>t.text.toLowerCase().includes(q)||t.notes.toLowerCase().includes(q)||t.tags.some(tg=>tg.includes(q)));
  }
  // sort
  if (sortMode==='name')     tasks.sort((a,b)=>a.text.localeCompare(b.text));
  else if (sortMode==='priority') { const po={high:0,medium:1,low:2,none:3}; tasks.sort((a,b)=>(po[a.priority]||3)-(po[b.priority]||3)); }
  else if (sortMode==='due') tasks.sort((a,b)=>{ if(!a.due&&!b.due)return 0; if(!a.due)return 1; if(!b.due)return-1; return a.due.localeCompare(b.due); });
  else tasks.sort((a,b)=>a.order-b.order);
  return tasks;
}

// ─────────────────────────────────────────────────
//  LIST VIEW
// ─────────────────────────────────────────────────
function renderList(q) {
  if (!S.groups.length) { mainEl.innerHTML = emptyBoardHTML(); return; }
  const wrap = document.createElement('div');
  wrap.className = 'group-wrap';
  S.groups.slice().sort((a,b)=>a.order-b.order).forEach(g => {
    wrap.appendChild(buildGroupEl(g, q));
  });
  mainEl.innerHTML = '';
  mainEl.appendChild(wrap);
  bindDragDrop();
}

function buildGroupEl(group, q) {
  const tasks = getGroupTasks(group.id);
  const total = S.tasks.filter(t=>t.groupId===group.id).length;
  const el = document.createElement('div');
  el.className = `group${group.collapsed?' collapsed':''}`;
  el.dataset.gid = group.id;

  el.innerHTML = `
    <div class="g-hdr" data-gid="${group.id}">
      <div class="g-color" style="background:${group.color}"></div>
      <input class="g-name-in" value="${esc(group.name)}" data-gid="${group.id}" title="Clic para renombrar"/>
      <span class="g-count">${total}</span>
      <div class="g-actions">
        <button class="btn-ic" data-action="add-task" data-gid="${group.id}" title="Agregar tarea">
          <svg viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
        <button class="btn-ic danger" data-action="del-group" data-gid="${group.id}" title="Eliminar grupo">
          <svg viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M4 3.5l.7 8a.5.5 0 00.5.5h4.6a.5.5 0 00.5-.5l.7-8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        </button>
      </div>
      <svg class="g-chevron" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="g-body" id="gb-${group.id}">
      ${tasks.length===0 && !q ? `<div class="g-empty">Sin tareas. Agrega una abajo.</div>` : ''}
      ${tasks.map(t=>buildTaskHTML(t,q)).join('')}
      ${q ? '' : `<div class="add-row" data-gid="${group.id}">
        <input class="add-in" placeholder="+ Nueva tarea..." maxlength="120" data-gid="${group.id}"/>
        <button class="add-btn-sm" data-gid="${group.id}">↵</button>
      </div>`}
    </div>`;

  // header toggle
  el.querySelector('.g-hdr').addEventListener('click', e => {
    if (e.target.closest('.g-name-in')||e.target.closest('.btn-ic')) return;
    group.collapsed = !group.collapsed; save(); render();
  });
  // rename
  el.querySelector('.g-name-in').addEventListener('change', e => {
    group.name = e.target.value.trim()||group.name; save(); render();
  });
  el.querySelector('.g-name-in').addEventListener('click', e => e.stopPropagation());
  // del group
  const delBtn = el.querySelector('[data-action="del-group"]');
  if (delBtn) delBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar grupo "${group.name}" y sus tareas?`)) return;
    S.groups = S.groups.filter(g=>g.id!==group.id);
    S.tasks  = S.tasks.filter(t=>t.groupId!==group.id);
    save(); render(); toast_('Grupo eliminado');
  });
  // add task shortcut
  const addTaskBtn = el.querySelector('[data-action="add-task"]');
  if (addTaskBtn) addTaskBtn.addEventListener('click', e => {
    e.stopPropagation();
    group.collapsed = false; save(); render();
    setTimeout(() => el.querySelector('.add-in')?.focus(), 50);
  });
  // add-row
  const addRow = el.querySelector('.add-row');
  if (addRow) {
    const inp = addRow.querySelector('.add-in');
    const btn = addRow.querySelector('.add-btn-sm');
    const submit = () => {
      const v = inp.value.trim(); if (!v) return;
      addTask(group.id, v); save(); render(); toast_('Tarea agregada');
    };
    inp.addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
    btn.addEventListener('click', submit);
  }
  // task actions
  el.querySelectorAll('[data-open-task]').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); openTaskModal(b.dataset.openTask); });
  });
  el.querySelectorAll('[data-del-task]').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      S.tasks = S.tasks.filter(t=>t.id!==b.dataset.delTask);
      save(); render(); toast_('Tarea eliminada');
    });
  });
  el.querySelectorAll('[data-chk]').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const t = S.tasks.find(t=>t.id===b.dataset.chk); if(!t) return;
      t.done = !t.done; logHistory(t, t.done?'Marcada como completada':'Marcada como pendiente');
      save(); render();
    });
  });
  el.querySelectorAll('[data-sub-chk]').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const [tid,sid] = b.dataset.subChk.split('|');
      const t = S.tasks.find(t=>t.id===tid); if(!t) return;
      const sub = t.subtasks.find(s=>s.id===sid); if(!sub) return;
      sub.done = !sub.done; save(); render();
    });
  });
  // drop zone
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over-group'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over-group'));
  el.addEventListener('drop', e => {
    e.preventDefault(); el.classList.remove('drag-over-group');
    if (!dragTaskId) return;
    const task = S.tasks.find(t=>t.id===dragTaskId); if(!task) return;
    if (task.groupId===group.id) return;
    task.groupId = group.id; task.order = Date.now();
    logHistory(task,`Movida al grupo "${group.name}"`);
    save(); render(); toast_('Tarea movida');
  });
  return el;
}

function buildTaskHTML(t, q) {
  const doneSubs = t.subtasks?.filter(s=>s.done).length||0;
  const totalSubs= t.subtasks?.length||0;
  const isOverdue= t.due && !t.done && new Date(t.due+'T00:00:00')<new Date(new Date().toDateString());
  const tags = (t.tags||[]).map(tag=>{
    const c = tagColor(tag);
    return `<span class="tag-b" style="background:${c}22;color:${c};border:1px solid ${c}44">${esc(tag)}</span>`;
  }).join('');
  const txt = q ? highlight(esc(t.text),q) : esc(t.text);
  const subHTML = t.subtasks?.length ? `
    <div class="subtasks">
      ${t.subtasks.map(s=>`
        <div class="sub-item">
          <button class="sub-chk${s.done?' done':''}" data-sub-chk="${t.id}|${s.id}">
            <svg viewBox="0 0 9 8" fill="none"><path d="M1 4l2.5 3 5-6" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <span class="sub-text" style="${s.done?'text-decoration:line-through;color:var(--txt3)':''}">${esc(s.text)}</span>
        </div>`).join('')}
      ${totalSubs>1?`<div class="sub-progress"><div class="sub-progress-fill" style="width:${Math.round(doneSubs/totalSubs*100)}%"></div></div>`:''}
    </div>` : '';
  return `
    <div class="task-item${t.done?' done-item':''}" draggable="true" data-task-id="${t.id}">
      <div class="drag-h">
        <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><circle cx="3" cy="2" r="1" fill="currentColor"/><circle cx="7" cy="2" r="1" fill="currentColor"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="7" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="10" r="1" fill="currentColor"/><circle cx="7" cy="10" r="1" fill="currentColor"/></svg>
      </div>
      <button class="chk${t.done?' done':''}" data-chk="${t.id}">
        <svg viewBox="0 0 9 8" fill="none"><path d="M1 4l2.5 3 5-6" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="t-main">
        <span class="t-text">${txt}</span>
        <div class="t-sub">
          ${t.priority&&t.priority!=='none'?`<span class="prio-b p-${t.priority}">${PRIO_LABELS[t.priority]}</span>`:''}
          ${t.due?`<span class="due-b${isOverdue?' ov':''}"><svg viewBox="0 0 10 10" fill="none"><rect x="1" y="1.5" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.1"/><path d="M3 .5v2M7 .5v2M1 4.5h8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>${fmtDate(t.due)}</span>`:''}
          ${tags}
          ${t.notes?`<span class="note-dot" title="Tiene nota"></span>`:''}
          ${totalSubs?`<span class="sub-count"><svg viewBox="0 0 10 10" fill="none"><path d="M2 3h6M2 5h6M2 7h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>${doneSubs}/${totalSubs}</span>`:''}
          ${t.comments?.length?`<span class="comments-count"><svg viewBox="0 0 10 10" fill="none"><path d="M1 2a1 1 0 011-1h6a1 1 0 011 1v5a1 1 0 01-1 1H6L4 9.5 2 8H2a1 1 0 01-1-1V2z" stroke="currentColor" stroke-width="1.2"/></svg>${t.comments.length}</span>`:''}
        </div>
      </div>
      <div class="t-actions">
        <button class="btn-ic" data-open-task="${t.id}" title="Abrir detalle">
          <svg viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </button>
        <button class="btn-ic danger" data-del-task="${t.id}" title="Eliminar">
          <svg viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M4 3.5l.7 8a.5.5 0 00.5.5h4.6a.5.5 0 00.5-.5l.7-8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        </button>
      </div>
      ${subHTML}
    </div>`;
}

// ─────────────────────────────────────────────────
//  KANBAN VIEW
// ─────────────────────────────────────────────────
function renderKanban(q) {
  if (!S.groups.length) { mainEl.innerHTML = emptyBoardHTML(); return; }
  mainEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'kanban-wrap';
  S.groups.slice().sort((a,b)=>a.order-b.order).forEach(g => {
    const tasks = getGroupTasks(g.id);
    const kol = document.createElement('div');
    kol.className = 'kol';
    kol.dataset.gid = g.id;
    kol.innerHTML = `
      <div class="kol-hdr">
        <div class="g-color" style="background:${g.color};height:12px;width:3px"></div>
        <span class="kol-name">${esc(g.name)}</span>
        <span class="kol-count">${tasks.length}</span>
      </div>
      <div class="kol-body" id="kb-${g.id}">
        ${tasks.map(t=>`
          <div class="kcard${t.done?' kcard-done':''}" draggable="true" data-task-id="${t.id}">
            <span class="kcard-text">${q?highlight(esc(t.text),q):esc(t.text)}</span>
            <div class="kcard-meta">
              ${t.priority&&t.priority!=='none'?`<span class="prio-b p-${t.priority}">${PRIO_LABELS[t.priority]}</span>`:''}
              ${t.due?`<span class="due-b${(!t.done&&new Date(t.due+'T00:00:00')<new Date())?' ov':''}"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="1.5" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.1"/><path d="M3 .5v2M7 .5v2M1 4.5h8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>${fmtDate(t.due)}</span>`:''}
              ${(t.tags||[]).map(tag=>{const c=tagColor(tag);return`<span class="tag-b" style="background:${c}22;color:${c}">${esc(tag)}</span>`;}).join('')}
              ${t.subtasks?.length?`<span class="kcard-sub"><svg viewBox="0 0 10 10" fill="none"><path d="M2 3h6M2 5h6M2 7h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>${t.subtasks.filter(s=>s.done).length}/${t.subtasks.length}</span>`:''}
            </div>
          </div>`).join('')}
      </div>
      <div class="k-add-row" data-gid="${g.id}">
        <input class="k-add-in" placeholder="+ Agregar tarea..." data-gid="${g.id}"/>
      </div>`;
    // kcard click → open modal
    kol.querySelectorAll('.kcard').forEach(kc => {
      kc.addEventListener('click', () => openTaskModal(kc.dataset.taskId));
      kc.addEventListener('dragstart', e => { dragTaskId=kc.dataset.taskId; kc.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      kc.addEventListener('dragend', () => { kc.classList.remove('dragging'); dragTaskId=null; document.querySelectorAll('.kol').forEach(k=>k.classList.remove('drag-over-group')); });
    });
    // k-add-row
    const kin = kol.querySelector('.k-add-in');
    kin.addEventListener('keydown', e => {
      if (e.key!=='Enter') return;
      const v = kin.value.trim(); if (!v) return;
      addTask(g.id,v); save(); render(); toast_('Tarea agregada');
    });
    // drop
    kol.addEventListener('dragover', e => { e.preventDefault(); kol.classList.add('drag-over-group'); });
    kol.addEventListener('dragleave', () => kol.classList.remove('drag-over-group'));
    kol.addEventListener('drop', e => {
      e.preventDefault(); kol.classList.remove('drag-over-group');
      if (!dragTaskId) return;
      const task = S.tasks.find(t=>t.id===dragTaskId); if(!task||task.groupId===g.id) return;
      task.groupId = g.id; task.order = Date.now();
      logHistory(task,`Movida al grupo "${g.name}"`);
      save(); render(); toast_('Tarea movida');
    });
    wrap.appendChild(kol);
  });
  mainEl.appendChild(wrap);
}

// ─────────────────────────────────────────────────
//  CALENDAR VIEW
// ─────────────────────────────────────────────────
function renderCalendar() {
  mainEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'cal-wrap';
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const today = new Date();
  const firstDay = new Date(calYear,calMonth,1);
  const lastDay  = new Date(calYear,calMonth+1,0);
  const startDow = (firstDay.getDay()+6)%7; // Monday=0
  wrap.innerHTML = `
    <div class="cal-nav">
      <button class="btn-ghost" id="cal-prev" style="padding:5px 10px">&larr;</button>
      <h2>${monthNames[calMonth]} ${calYear}</h2>
      <button class="btn-ghost" id="cal-next" style="padding:5px 10px">&rarr;</button>
      <button class="btn-ghost" id="cal-today" style="padding:5px 10px;font-size:.76rem">Hoy</button>
    </div>
    <div class="cal-grid">
      ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}
    </div>`;
  const grid = wrap.querySelector('.cal-grid');
  // Pad start
  for(let i=0;i<startDow;i++){
    const d=document.createElement('div'); d.className='cal-day other-month'; grid.appendChild(d);
  }
  // Days
  for(let day=1;day<=lastDay.getDate();day++){
    const isoDate = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday = today.getFullYear()===calYear&&today.getMonth()===calMonth&&today.getDate()===day;
    const dayTasks = S.tasks.filter(t=>t.due===isoDate);
    const el = document.createElement('div');
    el.className = `cal-day${isToday?' today':''}`;
    el.innerHTML = `<div class="cal-day-num">${day}</div>`;
    const maxShow = 3;
    dayTasks.slice(0,maxShow).forEach(t=>{
      const pill = document.createElement('div');
      pill.className = `cal-task-pill${t.done?' pil-done':t.priority==='high'?' pil-high':t.priority==='medium'?' pil-medium':''}`;
      pill.textContent = t.text;
      pill.addEventListener('click', ()=>openTaskModal(t.id));
      el.appendChild(pill);
    });
    if(dayTasks.length>maxShow){
      const more = document.createElement('div');
      more.className='cal-more';
      more.textContent = `+${dayTasks.length-maxShow} más`;
      el.appendChild(more);
    }
    grid.appendChild(el);
  }
  // Pad end to complete last row
  const totalCells = startDow+lastDay.getDate();
  const rem = (7-totalCells%7)%7;
  for(let i=0;i<rem;i++){
    const d=document.createElement('div'); d.className='cal-day other-month'; grid.appendChild(d);
  }
  mainEl.appendChild(wrap);
  $('cal-prev').addEventListener('click',()=>{ calMonth--; if(calMonth<0){calMonth=11;calYear--;} render(); });
  $('cal-next').addEventListener('click',()=>{ calMonth++; if(calMonth>11){calMonth=0;calYear++;} render(); });
  $('cal-today').addEventListener('click',()=>{ calYear=today.getFullYear();calMonth=today.getMonth(); render(); });
}

// ─────────────────────────────────────────────────
//  TASK DETAIL MODAL
// ─────────────────────────────────────────────────
function openTaskModal(taskId) {
  const t = S.tasks.find(t=>t.id===taskId); if(!t) return;
  editTaskId   = taskId;
  editTaskDraft = JSON.parse(JSON.stringify(t)); // deep copy
  showHistory  = false;
  taskModal.hidden = false;
  // title
  $('td-title').value = t.text;
  // notes
  $('td-notes').value = t.notes||'';
  $('td-notes-preview').style.display='none';
  $('td-notes-preview').innerHTML='';
  $('td-notes').style.display='';
  $('td-preview-btn').style.display='';
  $('td-edit-btn').style.display='none';
  // priority
  document.querySelectorAll('#td-prio-row .prio-opt').forEach(b=>{
    b.className='prio-opt'+(b.dataset.p===t.priority?` sel-${t.priority}`:'');
  });
  renderPrioBadge(t.priority);
  // due
  $('td-due').value = t.due||'';
  // group
  const gs = $('td-group');
  gs.innerHTML = S.groups.map(g=>`<option value="${g.id}"${g.id===t.groupId?' selected':''}>${esc(g.name)}</option>`).join('');
  // tags
  renderModalTags();
  // custom fields
  renderCustomFields();
  // subtasks
  renderModalSubtasks();
  // comments
  renderComments();
  // history
  renderHistory();
  $('td-title').focus();
}

function renderPrioBadge(prio) {
  const badge = $('td-prio-badge');
  if (!prio||prio==='none') { badge.textContent=''; badge.className=''; return; }
  badge.textContent = PRIO_LABELS[prio];
  badge.className = `prio-b p-${prio}`;
}

function renderModalTags() {
  const t = S.tasks.find(t=>t.id===editTaskId); if(!t) return;
  const wrap = $('td-tags-wrap');
  // remove old pills
  wrap.querySelectorAll('.tag-pill-rem').forEach(el=>el.remove());
  const inp = $('td-tags-in');
  (t.tags||[]).forEach(tag=>{
    const c = tagColor(tag);
    const pill = document.createElement('button');
    pill.className='tag-pill-rem';
    pill.style.cssText=`background:${c}22;color:${c};border:1px solid ${c}44`;
    pill.innerHTML=`${esc(tag)}<span>×</span>`;
    pill.addEventListener('click',()=>{ t.tags=t.tags.filter(tg=>tg!==tag); renderModalTags(); });
    wrap.insertBefore(pill, inp);
  });
}

function renderModalSubtasks() {
  const t = S.tasks.find(t=>t.id===editTaskId); if(!t) return;
  const container = $('td-subtasks'); container.innerHTML='';
  (t.subtasks||[]).forEach(s=>{
    const el=document.createElement('div');
    el.className=`sub-modal-item${s.done?' sub-modal-done':''}`;
    el.innerHTML=`
      <button class="sub-chk sub-modal-chk${s.done?' done':''}" style="width:14px;height:14px;border-radius:3px;border:1.5px solid var(--bd-hi);background:${s.done?'var(--done)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all .17s">
        <svg viewBox="0 0 9 8" fill="none" style="width:8px;height:8px;opacity:${s.done?1:0}"><path d="M1 4l2.5 3 5-6" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="sub-modal-text">${esc(s.text)}</span>
      <button class="btn-ic danger" style="padding:2px"><svg viewBox="0 0 14 14" fill="none" style="width:11px;height:11px"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M4 3.5l.7 8a.5.5 0 00.5.5h4.6a.5.5 0 00.5-.5l.7-8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>`;
    el.querySelector('.sub-modal-chk').addEventListener('click',()=>{ s.done=!s.done; save(); renderModalSubtasks(); render(); });
    el.querySelector('.btn-ic').addEventListener('click',()=>{ t.subtasks=t.subtasks.filter(x=>x.id!==s.id); save(); renderModalSubtasks(); render(); });
    container.appendChild(el);
  });
}

function renderComments() {
  const t = S.tasks.find(t=>t.id===editTaskId); if(!t) return;
  const c = $('td-comments'); c.innerHTML='';
  (t.comments||[]).forEach((cm,i)=>{
    const el=document.createElement('div'); el.className='comment-item';
    el.innerHTML=`
      <div class="comment-meta">
        <div class="comment-avatar">YO</div>
        <span class="comment-ts">${fmtTs(cm.ts)}</span>
        <button class="comment-del" data-ci="${i}">× Eliminar</button>
      </div>
      <div class="comment-text">${esc(cm.text)}</div>`;
    el.querySelector('.comment-del').addEventListener('click',()=>{ t.comments.splice(i,1); save(); renderComments(); });
    c.appendChild(el);
  });
  if (!t.comments?.length) c.innerHTML='<div style="font-size:.78rem;color:var(--txt3);padding:4px 0">Sin comentarios aún.</div>';
}

function renderHistory() {
  const t = S.tasks.find(t=>t.id===editTaskId); if(!t) return;
  const list = $('td-history');
  list.innerHTML = (t.history||[]).map(h=>`
    <div class="hist-item"><b>${esc(h.msg)}</b> · ${fmtTs(h.ts)}</div>`).join('');
}

function renderCustomFields() {
  const t = S.tasks.find(t=>t.id===editTaskId); if(!t) return;
  const list = $('td-cf-list'); list.innerHTML='';
  (S.customFieldDefs||[]).forEach(cf=>{
    const val = t.customFields?.[cf.id]||'';
    const row = document.createElement('div'); row.className='cf-row';
    if(cf.type==='checkbox'){
      row.innerHTML=`
        <input type="checkbox" ${val?'checked':''} style="width:15px;height:15px;cursor:pointer;accent-color:var(--accent)"/>
        <span style="font-size:.82rem;color:var(--txt2)">${esc(cf.name)}</span>
        <button class="btn-ic danger" data-cfid="${cf.id}" style="margin-left:auto"><svg viewBox="0 0 14 14" fill="none" style="width:11px;height:11px"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`;
      row.querySelector('input').addEventListener('change',e=>{ if(!t.customFields)t.customFields={}; t.customFields[cf.id]=e.target.checked; save(); });
    } else {
      row.innerHTML=`
        <span class="cf-type-badge">${cf.type}</span>
        <span style="font-size:.78rem;color:var(--txt2);min-width:70px">${esc(cf.name)}</span>
        <input class="cf-val-in" type="${cf.type==='número'?'number':cf.type==='URL'?'url':'text'}" value="${esc(val)}" placeholder="Valor..." style="flex:1"/>
        <button class="btn-ic danger" data-cfid="${cf.id}"><svg viewBox="0 0 14 14" fill="none" style="width:11px;height:11px"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`;
      row.querySelector('.cf-val-in').addEventListener('change',e=>{ if(!t.customFields)t.customFields={}; t.customFields[cf.id]=e.target.value; save(); });
    }
    row.querySelector('[data-cfid]').addEventListener('click',()=>{ S.customFieldDefs=S.customFieldDefs.filter(c=>c.id!==cf.id); save(); renderCustomFields(); });
    list.appendChild(row);
  });
}

function closeTaskModal() {
  taskModal.hidden=true; editTaskId=null; editTaskDraft={};
  $('td-tag-sug').style.display='none';
}

// ─────────────────────────────────────────────────
//  STATS & TAG FILTERS
// ─────────────────────────────────────────────────
function updateStats() {
  const total = S.tasks.length;
  const done  = S.tasks.filter(t=>t.done).length;
  const pend  = total-done;
  const ov    = S.tasks.filter(t=>!t.done&&t.due&&new Date(t.due+'T00:00:00')<new Date(new Date().toDateString())).length;
  $('s-total').textContent=total;
  $('s-done').textContent=done;
  $('s-pend').textContent=pend;
  $('s-ov').textContent=ov;
  $('s-overdue-pill').style.display=ov>0?'':'none';
  $('prog-fill').style.width=total>0?Math.round(done/total*100)+'%':'0%';
}

function updateTagFilters() {
  // collect all tags
  const allT = [...new Set(S.tasks.flatMap(t=>t.tags||[]))].sort();
  tagFiltersEl.innerHTML='';
  allT.forEach(tag=>{
    const c=tagColor(tag);
    const btn=document.createElement('button');
    btn.className='tag-filter-btn';
    btn.style.cssText=filterTags.includes(tag)?`background:${c}33;color:${c};border-color:${c}`:`background:${c}11;color:${c};border-color:${c}44`;
    btn.textContent=tag;
    btn.addEventListener('click',()=>{
      if(filterTags.includes(tag)) filterTags=filterTags.filter(t=>t!==tag);
      else filterTags.push(tag);
      render();
    });
    tagFiltersEl.appendChild(btn);
  });
}

// ─────────────────────────────────────────────────
//  DRAG & DROP (LIST)
// ─────────────────────────────────────────────────
function bindDragDrop() {
  document.querySelectorAll('.task-item[draggable]').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragTaskId = el.dataset.taskId;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      dragTaskId=null;
      document.querySelectorAll('.group').forEach(g=>g.classList.remove('drag-over-group'));
    });
    el.addEventListener('dragover', e => {
      if (!dragTaskId||dragTaskId===el.dataset.taskId) return;
      e.preventDefault(); e.stopPropagation();
      const dragged=S.tasks.find(t=>t.id===dragTaskId);
      const target =S.tasks.find(t=>t.id===el.dataset.taskId);
      if(!dragged||!target) return;
      const di=S.tasks.indexOf(dragged), ti=S.tasks.indexOf(target);
      S.tasks.splice(di,1);
      dragged.groupId=target.groupId;
      S.tasks.splice(S.tasks.indexOf(target),0,dragged);
      S.tasks.filter(t=>t.groupId===target.groupId).forEach((t,i)=>t.order=i);
      save(); render();
    });
  });
}

// ─────────────────────────────────────────────────
//  CMD PALETTE
// ─────────────────────────────────────────────────
function openCmd() { cmdOverlay.hidden=false; cmdIn.value=''; renderCmdResults(''); cmdIn.focus(); }
function closeCmd() { cmdOverlay.hidden=true; }

function renderCmdResults(q) {
  cmdResults.innerHTML='';
  const actions = [
    {label:'Nuevo grupo',hint:'Crea un grupo',icon:'⊞',action:()=>{closeCmd();openGroupModal();}},
    {label:'Vista Lista',hint:'',icon:'☰',action:()=>{closeCmd();switchView('list');}},
    {label:'Vista Kanban',hint:'',icon:'⊟',action:()=>{closeCmd();switchView('kanban');}},
    {label:'Vista Calendario',hint:'',icon:'📅',action:()=>{closeCmd();switchView('calendar');}},
    {label:'Templates',hint:'',icon:'📋',action:()=>{closeCmd();tplModal.hidden=false;}},
  ];
  if (!q) {
    const sec=document.createElement('div'); sec.className='cmd-section'; sec.textContent='Acciones rápidas';
    cmdResults.appendChild(sec);
    actions.forEach(a=>cmdResults.appendChild(mkCmdItem(a)));
    if (S.tasks.length) {
      const sec2=document.createElement('div'); sec2.className='cmd-section'; sec2.textContent='Tareas recientes';
      cmdResults.appendChild(sec2);
      S.tasks.slice(-5).reverse().forEach(t=>{
        cmdResults.appendChild(mkCmdItem({label:t.text,hint:S.groups.find(g=>g.id===t.groupId)?.name||'',icon:'◻',action:()=>{closeCmd();openTaskModal(t.id);}}));
      });
    }
    return;
  }
  const ql=q.toLowerCase();
  const matchedActions=actions.filter(a=>a.label.toLowerCase().includes(ql));
  const matchedTasks=S.tasks.filter(t=>t.text.toLowerCase().includes(ql)||t.notes.toLowerCase().includes(ql));
  if (!matchedActions.length&&!matchedTasks.length) {
    cmdResults.innerHTML='<div class="cmd-empty">Sin resultados para "'+esc(q)+'"</div>'; return;
  }
  if (matchedActions.length) {
    const sec=document.createElement('div'); sec.className='cmd-section'; sec.textContent='Acciones';
    cmdResults.appendChild(sec);
    matchedActions.forEach(a=>cmdResults.appendChild(mkCmdItem(a)));
  }
  if (matchedTasks.length) {
    const sec=document.createElement('div'); sec.className='cmd-section'; sec.textContent='Tareas';
    cmdResults.appendChild(sec);
    matchedTasks.slice(0,8).forEach(t=>{
      cmdResults.appendChild(mkCmdItem({label:t.text,hint:S.groups.find(g=>g.id===t.groupId)?.name||'',icon:'◻',action:()=>{closeCmd();openTaskModal(t.id);}}));
    });
  }
}

function mkCmdItem({label,hint,icon,action}) {
  const el=document.createElement('div'); el.className='cmd-item';
  el.innerHTML=`<span style="font-size:1rem">${icon}</span><span class="cmd-item-label">${esc(label)}</span>${hint?`<span class="cmd-item-hint">${esc(hint)}</span>`:''}`;
  el.addEventListener('click',action);
  return el;
}

// ─────────────────────────────────────────────────
//  GROUP MODAL
// ─────────────────────────────────────────────────
function openGroupModal() { gmName.value=''; groupModal.hidden=false; gmName.focus(); }

function buildColorSwatches(container, onSelect) {
  GROUP_COLORS.forEach((c,i)=>{
    const s=document.createElement('div');
    s.className=`csw${i===0?' sel':''}`;
    s.style.background=c; s.dataset.c=c;
    s.addEventListener('click',()=>{ container.querySelectorAll('.csw').forEach(x=>x.classList.remove('sel')); s.classList.add('sel'); onSelect(c); });
    container.appendChild(s);
  });
}

// ─────────────────────────────────────────────────
//  TEMPLATES
// ─────────────────────────────────────────────────
function buildTemplates() {
  tplGrid.innerHTML='';
  TEMPLATES.forEach(tpl=>{
    const c=document.createElement('div'); c.className='tpl-card';
    c.innerHTML=`<div class="tpl-icon">${tpl.icon}</div><div class="tpl-name">${esc(tpl.name)}</div><div class="tpl-desc">${esc(tpl.desc)}</div>`;
    c.addEventListener('click',()=>{
      if(!confirm(`¿Agregar template "${tpl.name}"? Se crearán ${tpl.groups.length} grupos nuevos.`)) return;
      tpl.groups.forEach(g=>mkGroup(g.name,g.color));
      save(); render(); tplModal.hidden=true; toast_(`Template "${tpl.name}" aplicado`);
    });
    tplGrid.appendChild(c);
  });
}

// ─────────────────────────────────────────────────
//  UI BINDINGS
// ─────────────────────────────────────────────────
function bindUI() {
  // View tabs
  document.querySelectorAll('.vtab').forEach(btn=>{
    btn.addEventListener('click',()=>switchView(btn.dataset.view));
  });
  // New group
  $('new-group-btn').addEventListener('click', openGroupModal);
  $('gm-cancel').addEventListener('click',()=>groupModal.hidden=true);
  $('gm-confirm').addEventListener('click',()=>{
    const n=gmName.value.trim(); if(!n){gmName.focus();return;}
    mkGroup(n,selectedColor); save(); render(); groupModal.hidden=true; toast_(`Grupo "${n}" creado`);
  });
  gmName.addEventListener('keydown',e=>{if(e.key==='Enter')$('gm-confirm').click();});
  groupModal.addEventListener('click',e=>{if(e.target===groupModal)groupModal.hidden=true;});

  // Templates
  $('templates-btn').addEventListener('click',()=>{tplModal.hidden=false;});
  tplModal.addEventListener('click',e=>{if(e.target===tplModal)tplModal.hidden=true;});
  $('tpl-cancel').addEventListener('click',()=>{tplModal.hidden=true});

  // Search
  searchInput.addEventListener('input',e=>{searchQ=e.target.value;render();});

  // Filter chips (status)
  filterBar.querySelectorAll('[data-status]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      filterStatus=btn.dataset.status;
      filterBar.querySelectorAll('[data-status]').forEach(b=>b.classList.toggle('active',b===btn));
      render();
    });
  });
  // Filter chips (prio)
  filterBar.querySelectorAll('[data-prio-f]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      filterPrio=btn.dataset.prioF;
      filterBar.querySelectorAll('[data-prio-f]').forEach(b=>b.classList.toggle('active',b===btn));
      render();
    });
  });
  // Sort
  sortSel.addEventListener('change',()=>{sortMode=sortSel.value;render();});

  // CMD palette
  $('cmd-overlay').addEventListener('click',e=>{if(e.target===cmdOverlay)closeCmd();});
  cmdIn.addEventListener('input',()=>renderCmdResults(cmdIn.value));
  cmdIn.addEventListener('keydown',e=>{if(e.key==='Escape')closeCmd();});

  // Global keyboard shortcuts
  document.addEventListener('keydown',e=>{
    const inInput=document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA';
    if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();cmdOverlay.hidden?openCmd():closeCmd();return;}
    if(e.key==='Escape'){
      if(!cmdOverlay.hidden){closeCmd();return;}
      if(!taskModal.hidden){closeTaskModal();return;}
      if(!groupModal.hidden){groupModal.hidden=true;return;}
      if(!tplModal.hidden){tplModal.hidden=true;return;}
    }
    if(!inInput&&e.key==='n'){e.preventDefault();openGroupModal();}
  });

  // ── TASK MODAL ──
  $('td-close').addEventListener('click',closeTaskModal);
  $('td-cancel').addEventListener('click',closeTaskModal);
  taskModal.addEventListener('click',e=>{if(e.target===taskModal)closeTaskModal();});

  // priority buttons
  document.querySelectorAll('#td-prio-row .prio-opt').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const t=S.tasks.find(t=>t.id===editTaskId); if(!t) return;
      t.priority=btn.dataset.p;
      document.querySelectorAll('#td-prio-row .prio-opt').forEach(b=>b.className='prio-opt'+(b===btn?` sel-${t.priority}`:''));
      renderPrioBadge(t.priority);
    });
  });

  // notes preview/edit toggle
  $('td-preview-btn').addEventListener('click',()=>{
    const raw=$('td-notes').value;
    $('td-notes-preview').innerHTML=parseMarkdown(raw)||'<span style="color:var(--txt3);font-size:.82rem">Sin notas.</span>';
    $('td-notes').style.display='none';
    $('td-notes-preview').style.display='';
    $('td-preview-btn').style.display='none';
    $('td-edit-btn').style.display='';
  });
  $('td-edit-btn').addEventListener('click',()=>{
    $('td-notes').style.display='';
    $('td-notes-preview').style.display='none';
    $('td-preview-btn').style.display='';
    $('td-edit-btn').style.display='none';
  });

  // tags input
  const tagsIn=$('td-tags-in');
  tagsIn.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===','){ e.preventDefault(); addTagToTask(tagsIn.value.trim()); tagsIn.value=''; updateTagSuggestions(''); }
    if(e.key==='Backspace'&&!tagsIn.value){ const t=S.tasks.find(t=>t.id===editTaskId); if(t&&t.tags.length){t.tags.pop();renderModalTags();} }
  });
  tagsIn.addEventListener('input',()=>updateTagSuggestions(tagsIn.value.trim()));
  tagsIn.addEventListener('blur',()=>setTimeout(()=>$('td-tag-sug').style.display='none',150));
  $('td-tags-wrap').addEventListener('click',()=>tagsIn.focus());

  // add custom field
  $('td-add-cf').addEventListener('click',()=>{
    const name=prompt('Nombre del campo:'); if(!name) return;
    const type=prompt(`Tipo (${CF_TYPES.join(', ')}):`)?.toLowerCase(); if(!CF_TYPES.includes(type)) return;
    if(!S.customFieldDefs) S.customFieldDefs=[];
    S.customFieldDefs.push({id:uid(),name,type});
    save(); renderCustomFields();
  });

  // subtasks in modal
  const subIn=$('td-sub-in');
  $('td-sub-add').addEventListener('click',()=>{
    const v=subIn.value.trim(); if(!v) return;
    const t=S.tasks.find(t=>t.id===editTaskId); if(!t) return;
    if(!t.subtasks) t.subtasks=[];
    t.subtasks.push({id:uid(),text:v,done:false});
    save(); renderModalSubtasks(); subIn.value='';
  });
  subIn.addEventListener('keydown',e=>{if(e.key==='Enter')$('td-sub-add').click();});

  // comments
  $('td-comment-send').addEventListener('click',()=>{
    const v=$('td-comment-in').value.trim(); if(!v) return;
    const t=S.tasks.find(t=>t.id===editTaskId); if(!t) return;
    if(!t.comments) t.comments=[];
    t.comments.push({id:uid(),text:v,ts:Date.now()});
    save(); renderComments(); $('td-comment-in').value='';
  });
  $('td-comment-in').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('td-comment-send').click();});

  // history toggle
  $('hist-toggle').addEventListener('click',()=>{
    showHistory=!showHistory;
    $('td-history').style.display=showHistory?'':'none';
    $('hist-toggle').textContent=showHistory?'Ocultar historial':'Mostrar historial de cambios';
  });

  // save task
  $('td-save').addEventListener('click',()=>{
    const t=S.tasks.find(t=>t.id===editTaskId); if(!t) return;
    const newTitle=$('td-title').value.trim(); if(!newTitle){$('td-title').focus();return;}
    if(t.text!==newTitle) logHistory(t,`Título cambiado a "${newTitle}"`);
    t.text    = newTitle;
    t.notes   = $('td-notes').value.trim();
    t.due     = $('td-due').value;
    t.groupId = $('td-group').value;
    // tags saved live
    // custom fields saved live
    // subtasks saved live
    save(); render(); closeTaskModal(); toast_('Tarea guardada');
  });

  // delete task from modal
  $('td-delete').addEventListener('click',()=>{
    S.tasks=S.tasks.filter(t=>t.id!==editTaskId);
    save(); render(); closeTaskModal(); toast_('Tarea eliminada');
  });
}

function addTagToTask(tag) {
  if(!tag) return;
  const t=S.tasks.find(t=>t.id===editTaskId); if(!t) return;
  tag=tag.toLowerCase().replace(/[^a-z0-9áéíóúñü\-_]/g,'');
  if(!tag||t.tags.includes(tag)) return;
  t.tags.push(tag);
  if(!S.allTags.includes(tag)) S.allTags.push(tag);
  renderModalTags();
}

function updateTagSuggestions(q) {
  const sug=$('td-tag-sug');
  const t=S.tasks.find(t=>t.id===editTaskId);
  const existing=t?.tags||[];
  const matches=S.allTags.filter(tag=>!existing.includes(tag)&&(!q||tag.includes(q.toLowerCase())));
  if(!matches.length){sug.style.display='none';return;}
  sug.innerHTML=matches.slice(0,6).map(tag=>`<div class="tag-sug-item" data-tag="${tag}">${tag}</div>`).join('');
  sug.querySelectorAll('.tag-sug-item').forEach(el=>{
    el.addEventListener('mousedown',e=>{e.preventDefault();addTagToTask(el.dataset.tag);$('td-tags-in').value='';sug.style.display='none';});
  });
  sug.style.display='';
}

function switchView(v) {
  view=v;
  document.querySelectorAll('.vtab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  render();
}

// ─────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function highlight(text,q){const safe=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return text.replace(new RegExp(`(${safe})`,'gi'),'<mark class="hl">$1</mark>');}
function fmtDate(iso){if(!iso)return'';const d=new Date(iso+'T00:00:00');return d.toLocaleDateString('es-CL',{day:'numeric',month:'short'});}
function fmtTs(ts){return new Date(ts).toLocaleString('es-CL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
function emptyBoardHTML(){return`<div class="empty-board"><svg width="56" height="56" viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" stroke="#2a4a6b" stroke-width="1.5"/><circle cx="28" cy="28" r="5" fill="#1a6cff" opacity=".5"/><path d="M28 2A26 26 0 0 1 54 28" stroke="#1a6cff" stroke-width="1.5" stroke-linecap="round" opacity=".4"/></svg><p>Sin grupos. Usa "Nuevo grupo" o carga un template.</p></div>`;}
let toastTimer;
function toast_(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2400);}

const TAG_COLORS=['#1a6cff','#2cb67d','#ffa94d','#ff6b6b','#cc5de8','#74c0fc','#f783ac','#a9e34b','#ff922b','#20c997'];
const tagColorCache={};
function tagColor(tag){if(!tagColorCache[tag]){let h=0;for(let c of tag)h=(h*31+c.charCodeAt(0))&0xfffffff;tagColorCache[tag]=TAG_COLORS[h%TAG_COLORS.length];}return tagColorCache[tag];}

function parseMarkdown(md) {
  if(!md) return '';
  let html = esc(md);
  html = html.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g,'<em>$1</em>');
  html = html.replace(/`(.+?)`/g,'<code>$1</code>');
  html = html.replace(/^\- (.+)$/gm,'<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s,'<ul>$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm,'<li>$1</li>');
  html = html.replace(/\n\n/g,'</p><p>');
  html = html.replace(/\n/g,'<br/>');
  return '<p>'+html+'</p>';
}

// ─────────────────────────────────────────────────
//  PERSISTENCE
// ─────────────────────────────────────────────────
function save(){try{localStorage.setItem('orbit-v3',JSON.stringify(S));}catch(e){}}
function loadState(){
  try{const r=localStorage.getItem('orbit-v3');if(r)S=JSON.parse(r);}
  catch(e){S={groups:[],tasks:[],allTags:[],customFieldDefs:[]};}
  // migration: ensure arrays exist
  S.tasks.forEach(t=>{
    if(!t.subtasks)   t.subtasks=[];
    if(!t.comments)   t.comments=[];
    if(!t.tags)       t.tags=[];
    if(!t.history)    t.history=[];
    if(!t.relations)  t.relations=[];
    if(!t.customFields) t.customFields={};
  });
}

// ─────────────────────────────────────────────────
//  EXPORT / IMPORT
// ─────────────────────────────────────────────────
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `orbit-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast_('Datos exportados ✓');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.groups || !data.tasks) throw new Error('Formato inválido');
      if (!confirm(`¿Importar datos? Se reemplazarán ${S.groups.length} grupos y ${S.tasks.length} tareas actuales.`)) return;
      S = data;
      // ensure migrations
      S.tasks.forEach(t=>{
        if(!t.subtasks)  t.subtasks=[];
        if(!t.comments)  t.comments=[];
        if(!t.tags)      t.tags=[];
        if(!t.history)   t.history=[];
        if(!t.relations) t.relations=[];
        if(!t.customFields) t.customFields={};
      });
      save(); render(); toast_('Datos importados correctamente ✓');
    } catch(err) {
      alert('Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ─────────────────────────────────────────────────
//  THEME
// ─────────────────────────────────────────────────
let isLight = localStorage.getItem('orbit-theme') === 'light';
function applyTheme() {
  document.body.classList.toggle('light', isLight);
  const icon = $('theme-icon');
  if (icon) icon.innerHTML = isLight
    ? '<path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.9 2.9l.7.7M10.4 10.4l.7.7M2.9 11.1l.7-.7M10.4 3.6l.7-.7M7 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
    : '<path d="M12 7.5A5.5 5.5 0 016.5 2 5.5 5.5 0 102 7.5 5.5 5.5 0 0012 7.5z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>';
  localStorage.setItem('orbit-theme', isLight ? 'light' : 'dark');
}

function toggleTheme() { isLight = !isLight; applyTheme(); }

// ─────────────────────────────────────────────────
//  DUPLICATE TASK
// ─────────────────────────────────────────────────
function duplicateTask(taskId) {
  const t = S.tasks.find(t=>t.id===taskId); if(!t) return;
  const copy = JSON.parse(JSON.stringify(t));
  copy.id    = uid();
  copy.text  = copy.text + ' (copia)';
  copy.done  = false;
  copy.order = Date.now();
  copy.history = [{msg:'Tarea duplicada',ts:Date.now()}];
  copy.comments = [];
  S.tasks.splice(S.tasks.indexOf(t)+1, 0, copy);
  save(); render(); toast_('Tarea duplicada');
  return copy.id;
}

// ─────────────────────────────────────────────────
//  RELATIONS
// ─────────────────────────────────────────────────
let pendingRelType = null;

function renderRelations() {
  const t = S.tasks.find(t=>t.id===editTaskId); if(!t) return;
  const container = $('td-relations'); container.innerHTML = '';
  (t.relations||[]).forEach((rel,i) => {
    const related = S.tasks.find(r=>r.id===rel.targetId);
    if (!related) return;
    const el = document.createElement('div'); el.className='rel-item';
    const typeLabel = rel.type==='depende-de' ? 'Depende de' : 'Bloquea';
    const typeClass = rel.type==='bloquea' ? 'blocks' : 'blocked-by';
    el.innerHTML = `
      <span class="rel-type ${typeClass}">${typeLabel}</span>
      <span class="rel-name">${esc(related.text)}</span>
      <button class="rel-del" data-ri="${i}">× Quitar</button>`;
    el.querySelector('.rel-del').addEventListener('click', () => {
      t.relations.splice(i,1); save(); renderRelations();
    });
    container.appendChild(el);
  });
  if (!t.relations?.length) container.innerHTML = '<div style="font-size:.76rem;color:var(--txt3);padding:2px 0">Sin relaciones.</div>';
}

function openRelPicker(relType) {
  pendingRelType = relType;
  const picker = $('td-rel-picker'); picker.style.display='';
  const searchIn = $('td-rel-search'); searchIn.value=''; searchIn.focus();
  renderRelResults('');
}

function renderRelResults(q) {
  const t = S.tasks.find(t=>t.id===editTaskId); if(!t) return;
  const existing = (t.relations||[]).map(r=>r.targetId);
  const results  = $('td-rel-results'); results.innerHTML='';
  const matches  = S.tasks
    .filter(task => task.id!==editTaskId && !existing.includes(task.id) && (!q || task.text.toLowerCase().includes(q.toLowerCase())))
    .slice(0,8);
  if (!matches.length) { results.innerHTML='<div style="font-size:.76rem;color:var(--txt3);padding:6px">Sin resultados.</div>'; return; }
  matches.forEach(task => {
    const btn = document.createElement('button');
    btn.className = 'btn-ghost'; btn.style.cssText='width:100%;justify-content:flex-start;font-size:.8rem;padding:5px 10px;margin:1px 0';
    btn.textContent = task.text;
    btn.addEventListener('click', () => {
      if(!t.relations) t.relations=[];
      t.relations.push({type:pendingRelType, targetId:task.id});
      logHistory(t, `Relación "${pendingRelType}" → "${task.text}"`);
      save(); renderRelations(); $('td-rel-picker').style.display='none'; pendingRelType=null;
    });
    results.appendChild(btn);
  });
}

// ─────────────────────────────────────────────────
//  EXTEND openTaskModal WITH NEW FEATURES
// ─────────────────────────────────────────────────
const _origOpenTaskModal = openTaskModal;
openTaskModal = function(taskId) {
  _origOpenTaskModal(taskId);
  renderRelations();
  // bind relation buttons
  document.querySelectorAll('[data-rel-type]').forEach(btn => {
    btn.onclick = () => openRelPicker(btn.dataset.relType);
  });
  $('td-rel-search').oninput = e => renderRelResults(e.target.value);
  // bind duplicate from modal
  $('td-duplicate').onclick = () => {
    const newId = duplicateTask(editTaskId);
    closeTaskModal();
  };
  // Ctrl+Enter saves
  taskModal.addEventListener('keydown', function onKey(e) {
    if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); $('td-save').click(); taskModal.removeEventListener('keydown',onKey); }
    if (e.key==='Escape') taskModal.removeEventListener('keydown',onKey);
  }, {once:false});
};

// ─────────────────────────────────────────────────
//  EXTEND BIND UI WITH NEW BINDINGS
// ─────────────────────────────────────────────────
const _origBindUI = bindUI;
bindUI = function() {
  _origBindUI();

  // Theme
  applyTheme();
  $('theme-btn').addEventListener('click', toggleTheme);

  // Export
  $('export-btn').addEventListener('click', exportData);

  // Import
  $('import-input').addEventListener('change', e => {
    if (e.target.files[0]) { importData(e.target.files[0]); e.target.value=''; }
  });

  // Shortcuts panel
  $('shortcuts-close').addEventListener('click', () => $('shortcuts-overlay').hidden=true);
  $('shortcuts-overlay').addEventListener('click', e => { if(e.target===$('shortcuts-overlay')) $('shortcuts-overlay').hidden=true; });

  // Extended keyboard shortcuts
  document.addEventListener('keydown', e => {
    const inInput = document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='TEXTAREA'||document.activeElement.tagName==='SELECT';
    if (inInput) return;
    // view shortcuts
    if (e.key==='1') switchView('list');
    if (e.key==='2') switchView('kanban');
    if (e.key==='3') switchView('calendar');
    // search focus
    if (e.key==='/') { e.preventDefault(); searchInput.focus(); }
    // theme
    if (e.key==='t'||e.key==='T') toggleTheme();
    // shortcuts panel
    if (e.key==='?') $('shortcuts-overlay').hidden = !$('shortcuts-overlay').hidden;
    // export
    if ((e.ctrlKey||e.metaKey) && e.key==='e') { e.preventDefault(); exportData(); }
    // duplicate (when modal is open)
    if ((e.ctrlKey||e.metaKey) && e.key==='d' && !taskModal.hidden) { e.preventDefault(); if(editTaskId) duplicateTask(editTaskId); }
  });
};
