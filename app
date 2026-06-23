/* =============================================
   ORBIT — Task Manager v2 · app.js
   Features: Groups, Drag & Drop, Priorities,
   Due Dates, Notes, Inline Edit, Search,
   LocalStorage persistence
   ============================================= */

// ── CONSTANTS ──────────────────────────────────
const GROUP_COLORS = ['#1a6cff', '#2cb67d', '#ffa94d', '#ff6b6b', '#cc5de8', '#74c0fc', '#f783ac', '#a9e34b'];
const PRIO_LABEL = { high: 'Alta', medium: 'Media', low: 'Baja', none: null };

// ── STATE ───────────────────────────────────────
let state = { groups: [], tasks: [] };
let editingTaskId = null;
let selectedGroupColor = GROUP_COLORS[0];
let dragTaskId = null;
let dragGroupId = null;
let searchQuery = '';

// ── DOM REFS ────────────────────────────────────
const board = document.getElementById('main-board');
const addGroupBtn = document.getElementById('add-group-btn');
const globalSearch = document.getElementById('global-search');
const groupModal = document.getElementById('group-modal');
const groupNameIn = document.getElementById('group-name-input');
const groupCancel = document.getElementById('group-modal-cancel');
const groupConfirm = document.getElementById('group-modal-confirm');
const colorSwatches = document.getElementById('color-swatches');
const taskModal = document.getElementById('task-modal');
const taskModalClose = document.getElementById('task-modal-close');
const modalTitleIn = document.getElementById('modal-title-input');
const modalNotesIn = document.getElementById('modal-notes-input');
const modalDueIn = document.getElementById('modal-due-input');
const modalGroupSel = document.getElementById('modal-group-select');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalDeleteBtn = document.getElementById('modal-delete-btn');
const modalPrioSel = document.getElementById('modal-priority-selector');
const modalPrioBadge = document.getElementById('modal-priority-badge');
const toast = document.getElementById('toast');
const statTotal = document.getElementById('stat-total');
const statDone = document.getElementById('stat-done');
const statPending = document.getElementById('stat-pending');
const progressFill = document.getElementById('progress-fill');

// ── INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    if (state.groups.length === 0) seedDefaults();
    buildColorSwatches();
    render();
    bindUI();
});

function seedDefaults() {
    const g1 = createGroup('📋 Por hacer', GROUP_COLORS[0]);
    const g2 = createGroup('⚡ En progreso', GROUP_COLORS[2]);
    const g3 = createGroup('✅ Completado', GROUP_COLORS[1]);
    addTask(g1.id, 'Diseñar la pantalla de inicio', 'high', '', '');
    addTask(g1.id, 'Revisar los requerimientos', 'medium', '', '');
    addTask(g2.id, 'Implementar autenticación', 'high', '', '');
    addTask(g3.id, 'Setup del repositorio', 'low', '', '');
    state.tasks.find(t => t.groupId === g3.id).done = true;
}

// ── FACTORIES ─────────────────────────────────────
function createGroup(name, color) {
    const g = { id: uid(), name, color, collapsed: false };
    state.groups.push(g);
    return g;
}

function addTask(groupId, text, priority = 'none', notes = '', due = '') {
    const task = { id: uid(), groupId, text, done: false, priority, notes, due, order: Date.now() };
    state.tasks.push(task);
    return task;
}

function uid() { return '_' + Math.random().toString(36).slice(2, 9); }

// ── RENDER ────────────────────────────────────────
function render() {
    const query = searchQuery.toLowerCase().trim();
    board.innerHTML = '';

    if (state.groups.length === 0) {
        board.innerHTML = `
      <div class="board-empty">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="30" stroke="#2a4a6b" stroke-width="1.5"/>
          <circle cx="32" cy="32" r="6" fill="#1a6cff" opacity=".5"/>
          <path d="M32 2A30 30 0 0 1 62 32" stroke="#1a6cff" stroke-width="1.5" stroke-linecap="round" opacity=".4"/>
        </svg>
        <p>Sin grupos. Crea uno con "Nuevo grupo".</p>
      </div>`;
    }

    state.groups.forEach(group => {
        const groupTasks = state.tasks
            .filter(t => t.groupId === group.id)
            .sort((a, b) => a.order - b.order);
        const visible = query
            ? groupTasks.filter(t => t.text.toLowerCase().includes(query) || t.notes.toLowerCase().includes(query))
            : groupTasks;

        board.appendChild(buildGroupEl(group, visible, groupTasks.length, query));
    });

    updateStats();
}

function buildGroupEl(group, tasks, totalCount, query) {
    const el = document.createElement('div');
    el.className = `group${group.collapsed ? ' collapsed' : ''}`;
    el.dataset.groupId = group.id;

    // Drop zone for entire group
    el.addEventListener('dragover', onGroupDragOver);
    el.addEventListener('drop', onGroupDrop);
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));

    // Header
    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
    <div class="group-color-bar" style="background:${group.color}"></div>
    <div class="group-title-wrap">
      <input class="group-name" value="${esc(group.name)}" data-gid="${group.id}" title="Clic para renombrar" />
      <span class="group-count">${totalCount}</span>
    </div>
    <div class="group-header-actions">
      <button class="btn-icon danger" data-action="del-group" data-gid="${group.id}" title="Eliminar grupo">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M4 3.5l.7 8a.5.5 0 00.5.5h4.6a.5.5 0 00.5-.5l.7-8M6 6.5v3.5M8 6.5v3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <svg class="group-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    // Toggle collapse on header (but not on input or action buttons)
    header.addEventListener('click', (e) => {
        if (e.target.closest('.group-name') || e.target.closest('.btn-icon')) return;
        group.collapsed = !group.collapsed;
        saveState();
        render();
    });

    // Rename inline
    header.querySelector('.group-name').addEventListener('change', (e) => {
        group.name = e.target.value.trim() || group.name;
        saveState();
        render();
    });
    header.querySelector('.group-name').addEventListener('click', e => e.stopPropagation());

    // Delete group
    header.querySelector('[data-action="del-group"]').addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`¿Eliminar el grupo "${group.name}" y sus tareas?`)) return;
        state.groups = state.groups.filter(g => g.id !== group.id);
        state.tasks = state.tasks.filter(t => t.groupId !== group.id);
        saveState();
        render();
        showToast('Grupo eliminado');
    });

    // Body
    const body = document.createElement('div');
    body.className = 'group-body';

    if (tasks.length === 0 && !query) {
        body.innerHTML = `<div class="group-empty">Sin tareas. Agrega una abajo.</div>`;
    }

    tasks.forEach(task => {
        body.appendChild(buildTaskEl(task, query));
    });

    // Add task row
    if (!query) {
        const addRow = document.createElement('div');
        addRow.className = 'add-task-row';
        addRow.innerHTML = `
      <input class="add-task-input" placeholder="+ Agregar tarea..." data-gid="${group.id}" />
      <button class="add-task-btn" data-gid="${group.id}">↵</button>`;

        const inp = addRow.querySelector('.add-task-input');
        const btn = addRow.querySelector('.add-task-btn');

        const submit = () => {
            const val = inp.value.trim();
            if (!val) return;
            addTask(group.id, val);
            saveState();
            render();
            showToast('Tarea agregada');
        };

        inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
        btn.addEventListener('click', submit);
        body.appendChild(addRow);
    }

    el.appendChild(header);
    el.appendChild(body);
    return el;
}

function buildTaskEl(task, query) {
    const li = document.createElement('div');
    li.className = `task-item${task.done ? ' done-item' : ''}`;
    li.dataset.taskId = task.id;
    li.draggable = true;

    // Highlight search match
    const displayText = query ? highlight(esc(task.text), query) : esc(task.text);

    // Due date display
    let dueBadgeHtml = '';
    if (task.due) {
        const overdue = !task.done && new Date(task.due) < new Date(new Date().toDateString());
        dueBadgeHtml = `<span class="due-badge${overdue ? ' overdue' : ''}">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.1"/>
        <path d="M3 1v2M7 1v2M1 5h8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
      </svg>
      ${formatDate(task.due)}
    </span>`;
    }

    // Priority badge
    const prioBadge = task.priority !== 'none' && task.priority
        ? `<span class="prio-badge prio-${task.priority}">${PRIO_LABEL[task.priority]}</span>` : '';

    // Notes dot
    const notesDot = task.notes ? `<span class="notes-dot" title="Tiene nota"></span>` : '';

    li.innerHTML = `
    <div class="drag-handle" title="Arrastrar">
      <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
        <circle cx="4" cy="3"  r="1.2" fill="currentColor"/>
        <circle cx="8" cy="3"  r="1.2" fill="currentColor"/>
        <circle cx="4" cy="7"  r="1.2" fill="currentColor"/>
        <circle cx="8" cy="7"  r="1.2" fill="currentColor"/>
        <circle cx="4" cy="11" r="1.2" fill="currentColor"/>
        <circle cx="8" cy="11" r="1.2" fill="currentColor"/>
      </svg>
    </div>
    <button class="task-check" aria-label="${task.done ? 'Desmarcar' : 'Completar'}">
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4l3 3 5-6" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="task-main">
      <span class="task-text">${displayText}</span>
      ${(prioBadge || dueBadgeHtml || notesDot) ? `<div class="task-meta-row">${prioBadge}${dueBadgeHtml}${notesDot}</div>` : ''}
    </div>
    <div class="task-actions">
      <button class="btn-icon" data-action="open" title="Abrir detalle">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7h10M9 4l3 3-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="btn-icon danger" data-action="del-task" title="Eliminar">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M4 3.5l.7 8a.5.5 0 00.5.5h4.6a.5.5 0 00.5-.5l.7-8M6 6.5v3.5M8 6.5v3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </button>
    </div>`;

    // Checkbox toggle
    li.querySelector('.task-check').addEventListener('click', (e) => {
        e.stopPropagation();
        task.done = !task.done;
        saveState();
        render();
    });

    // Open modal
    li.querySelector('[data-action="open"]').addEventListener('click', (e) => {
        e.stopPropagation();
        openTaskModal(task.id);
    });

    // Delete
    li.querySelector('[data-action="del-task"]').addEventListener('click', (e) => {
        e.stopPropagation();
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        saveState();
        render();
        showToast('Tarea eliminada');
    });

    // Drag events
    li.addEventListener('dragstart', (e) => {
        dragTaskId = task.id;
        dragGroupId = task.groupId;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        dragTaskId = null;
        dragGroupId = null;
        document.querySelectorAll('.drag-placeholder').forEach(el => el.remove());
        document.querySelectorAll('.group').forEach(g => g.classList.remove('drag-over'));
    });
    li.addEventListener('dragover', onTaskDragOver(task));

    return li;
}

// ── DRAG & DROP ───────────────────────────────────
function onTaskDragOver(targetTask) {
    return (e) => {
        if (!dragTaskId || dragTaskId === targetTask.id) return;
        e.preventDefault();
        e.stopPropagation();
        // Reorder in state
        const draggedIdx = state.tasks.findIndex(t => t.id === dragTaskId);
        const targetIdx = state.tasks.findIndex(t => t.id === targetTask.id);
        if (draggedIdx < 0 || targetIdx < 0) return;
        const [removed] = state.tasks.splice(draggedIdx, 1);
        removed.groupId = targetTask.groupId;
        state.tasks.splice(targetIdx, 0, removed);
        // Fix order field
        state.tasks
            .filter(t => t.groupId === targetTask.groupId)
            .forEach((t, i) => { t.order = i; });
        saveState();
        render();
    };
}

function onGroupDragOver(e) {
    if (!dragTaskId) return;
    e.preventDefault();
    const groupEl = e.currentTarget;
    groupEl.classList.add('drag-over');
}

function onGroupDrop(e) {
    if (!dragTaskId) return;
    e.preventDefault();
    const groupEl = e.currentTarget;
    const targetGroupId = groupEl.dataset.groupId;
    groupEl.classList.remove('drag-over');
    const task = state.tasks.find(t => t.id === dragTaskId);
    if (!task || task.groupId === targetGroupId) return;
    task.groupId = targetGroupId;
    task.order = Date.now();
    saveState();
    render();
    showToast('Tarea movida');
}

// ── TASK MODAL ────────────────────────────────────
function openTaskModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    editingTaskId = taskId;

    modalTitleIn.value = task.text;
    modalNotesIn.value = task.notes || '';
    modalDueIn.value = task.due || '';

    // Priority selector
    document.querySelectorAll('.prio-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.prio === (task.priority || 'none'));
    });
    updateModalPrioBadge(task.priority);

    // Group selector
    modalGroupSel.innerHTML = state.groups.map(g =>
        `<option value="${g.id}"${g.id === task.groupId ? ' selected' : ''}>${g.name}</option>`
    ).join('');

    taskModal.hidden = false;
    modalTitleIn.focus();
}

function closeTaskModal() {
    taskModal.hidden = true;
    editingTaskId = null;
}

function updateModalPrioBadge(prio) {
    if (!prio || prio === 'none') {
        modalPrioBadge.textContent = '';
        modalPrioBadge.className = 'task-modal-priority';
        return;
    }
    modalPrioBadge.textContent = PRIO_LABEL[prio];
    modalPrioBadge.className = `task-modal-priority prio-badge prio-${prio}`;
}

// ── GROUP MODAL ───────────────────────────────────
function buildColorSwatches() {
    colorSwatches.innerHTML = '';
    GROUP_COLORS.forEach((c, i) => {
        const s = document.createElement('div');
        s.className = `color-swatch${i === 0 ? ' selected' : ''}`;
        s.style.background = c;
        s.dataset.color = c;
        s.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
            s.classList.add('selected');
            selectedGroupColor = c;
        });
        colorSwatches.appendChild(s);
    });
}

// ── UI BINDINGS ───────────────────────────────────
function bindUI() {
    // Group modal
    addGroupBtn.addEventListener('click', () => {
        groupNameIn.value = '';
        groupModal.hidden = false;
        groupNameIn.focus();
    });
    groupCancel.addEventListener('click', () => { groupModal.hidden = true; });
    groupConfirm.addEventListener('click', () => {
        const name = groupNameIn.value.trim();
        if (!name) { groupNameIn.focus(); return; }
        createGroup(name, selectedGroupColor);
        saveState();
        render();
        groupModal.hidden = true;
        showToast(`Grupo "${name}" creado`);
    });
    groupNameIn.addEventListener('keydown', e => { if (e.key === 'Enter') groupConfirm.click(); });

    // Close modals on overlay click
    groupModal.addEventListener('click', e => { if (e.target === groupModal) groupModal.hidden = true; });
    taskModal.addEventListener('click', e => { if (e.target === taskModal) closeTaskModal(); });
    taskModalClose.addEventListener('click', closeTaskModal);

    // Priority selector in task modal
    modalPrioSel.addEventListener('click', (e) => {
        const btn = e.target.closest('.prio-btn');
        if (!btn) return;
        document.querySelectorAll('.prio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateModalPrioBadge(btn.dataset.prio);
    });

    // Save task modal
    modalSaveBtn.addEventListener('click', () => {
        const task = state.tasks.find(t => t.id === editingTaskId);
        if (!task) return;
        const newTitle = modalTitleIn.value.trim();
        if (!newTitle) { modalTitleIn.focus(); return; }
        task.text = newTitle;
        task.notes = modalNotesIn.value.trim();
        task.due = modalDueIn.value;
        task.groupId = modalGroupSel.value;
        task.priority = document.querySelector('.prio-btn.active')?.dataset.prio || 'none';
        saveState();
        render();
        closeTaskModal();
        showToast('Tarea actualizada');
    });

    // Delete from modal
    modalDeleteBtn.addEventListener('click', () => {
        if (!editingTaskId) return;
        state.tasks = state.tasks.filter(t => t.id !== editingTaskId);
        saveState();
        render();
        closeTaskModal();
        showToast('Tarea eliminada');
    });

    // Global search
    globalSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!taskModal.hidden) closeTaskModal();
            if (!groupModal.hidden) groupModal.hidden = true;
        }
    });
}

// ── STATS ─────────────────────────────────────────
function updateStats() {
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.done).length;
    const pending = total - done;
    statTotal.textContent = total;
    statDone.textContent = done;
    statPending.textContent = pending;
    progressFill.style.width = total > 0 ? `${Math.round((done / total) * 100)}%` : '0%';
}

// ── HELPERS ───────────────────────────────────────
function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlight(text, query) {
    if (!query) return text;
    const safeQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${safeQ})`, 'gi'), '<mark class="hl">$1</mark>');
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function showToast(msg, duration = 2200) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── PERSISTENCE ───────────────────────────────────
function saveState() {
    try { localStorage.setItem('orbit-v2', JSON.stringify(state)); } catch (e) { }
}

function loadState() {
    try {
        const raw = localStorage.getItem('orbit-v2');
        if (raw) state = JSON.parse(raw);
    } catch (e) { state = { groups: [], tasks: [] }; }
}
