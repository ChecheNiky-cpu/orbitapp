// =============================================
//  ORBIT — Supabase Client
//  Reemplaza localStorage por base de datos real
// =============================================

// ── CONFIGURACIÓN ──
// Reemplaza estos valores con los de tu proyecto en supabase.com
// Settings → API → Project URL y anon public key
const SUPABASE_URL     = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';

// Inicializar cliente (requiere @supabase/supabase-js)
// CDN: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ── GRUPOS ──
export async function fetchGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('order');
  if (error) throw error;
  return data;
}

export async function upsertGroup(group) {
  const { data, error } = await supabase
    .from('groups')
    .upsert({
      id:        group.id,
      user_id:   supabase.auth.getUser()?.id,
      name:      group.name,
      color:     group.color,
      collapsed: group.collapsed,
      order:     group.order,
    });
  if (error) throw error;
  return data;
}

export async function deleteGroup(id) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── TAREAS ──
export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      subtasks (*),
      task_tags (tag),
      comments (*, created_at),
      relations (target_id, type)
    `)
    .order('order');
  if (error) throw error;

  // Normalizar estructura para que sea compatible con app.js
  return data.map(t => ({
    ...t,
    tags:      t.task_tags?.map(tt => tt.tag) ?? [],
    subtasks:  t.subtasks  ?? [],
    comments:  t.comments  ?? [],
    relations: t.relations ?? [],
  }));
}

export async function upsertTask(task, userId) {
  const { error: taskError } = await supabase
    .from('tasks')
    .upsert({
      id:       task.id,
      user_id:  userId,
      group_id: task.groupId,
      text:     task.text,
      done:     task.done,
      priority: task.priority,
      notes:    task.notes,
      due:      task.due || null,
      order:    task.order,
    });
  if (taskError) throw taskError;

  // Sincronizar tags
  await supabase.from('task_tags').delete().eq('task_id', task.id);
  if (task.tags?.length) {
    await supabase.from('task_tags').insert(
      task.tags.map(tag => ({ task_id: task.id, tag }))
    );
  }

  // Sincronizar subtareas
  await supabase.from('subtasks').delete().eq('task_id', task.id);
  if (task.subtasks?.length) {
    await supabase.from('subtasks').insert(
      task.subtasks.map(s => ({ id: s.id, task_id: task.id, text: s.text, done: s.done }))
    );
  }
}

export async function deleteTask(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── COMENTARIOS ──
export async function addComment(taskId, userId, text) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, user_id: userId, text })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComment(id) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── TIEMPO REAL ──
export function subscribeToChanges(onTask, onGroup) {
  return supabase
    .channel('orbit-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },   onTask)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, onGroup)
    .subscribe();
}

export { supabase };
