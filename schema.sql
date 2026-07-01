-- =============================================
--  ORBIT — Esquema SQL para Supabase
--  Ejecuta este archivo en: SQL Editor → New query
-- =============================================

-- ── GRUPOS ──
CREATE TABLE IF NOT EXISTS groups (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#1a6cff',
  collapsed  BOOLEAN DEFAULT false,
  "order"    INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── TAREAS ──
CREATE TABLE IF NOT EXISTS tasks (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id   UUID REFERENCES groups(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  done       BOOLEAN DEFAULT false,
  priority   TEXT DEFAULT 'none' CHECK (priority IN ('none','low','medium','high')),
  notes      TEXT DEFAULT '',
  due        DATE,
  "order"    INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── SUBTAREAS ──
CREATE TABLE IF NOT EXISTS subtasks (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  text    TEXT NOT NULL,
  done    BOOLEAN DEFAULT false
);

-- ── TAGS ──
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (task_id, tag)
);

-- ── COMENTARIOS ──
CREATE TABLE IF NOT EXISTS comments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id),
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── RELACIONES ENTRE TAREAS ──
CREATE TABLE IF NOT EXISTS relations (
  task_id   UUID REFERENCES tasks(id) ON DELETE CASCADE,
  target_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type      TEXT NOT NULL CHECK (type IN ('depende-de', 'bloquea')),
  PRIMARY KEY (task_id, target_id)
);

-- ── CAMPOS PERSONALIZADOS ──
CREATE TABLE IF NOT EXISTS custom_field_defs (
  id      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  type    TEXT NOT NULL CHECK (type IN ('texto','número','URL','persona','checkbox'))
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  field_id UUID REFERENCES custom_field_defs(id) ON DELETE CASCADE,
  task_id  UUID REFERENCES tasks(id) ON DELETE CASCADE,
  value    TEXT,
  PRIMARY KEY (field_id, task_id)
);

-- ── HISTORIAL DE CAMBIOS ──
CREATE TABLE IF NOT EXISTS history (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id),
  msg        TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── WORKSPACES (para colaboración) ──
CREATE TABLE IF NOT EXISTS workspaces (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  owner_id   UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT DEFAULT 'member' CHECK (role IN ('viewer','member','admin','owner')),
  invited_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- =============================================
--  ROW LEVEL SECURITY (RLS)
--  CRÍTICO: actívalo antes de ir a producción
-- =============================================

ALTER TABLE groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE relations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_defs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE history             ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members   ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuario solo ve sus propios datos
CREATE POLICY "own_groups"    ON groups    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_tasks"     ON tasks     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_cf_defs"   ON custom_field_defs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_subtasks" ON subtasks FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid())
);

CREATE POLICY "own_task_tags" ON task_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_tags.task_id AND tasks.user_id = auth.uid())
);

CREATE POLICY "own_comments" ON comments FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = comments.task_id AND tasks.user_id = auth.uid())
);

CREATE POLICY "own_relations" ON relations FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = relations.task_id AND tasks.user_id = auth.uid())
);

CREATE POLICY "own_history" ON history FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = history.task_id AND tasks.user_id = auth.uid())
);

-- Workspace: solo ves workspaces donde eres miembro
CREATE POLICY "member_see_workspace" ON workspaces FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspaces.id AND user_id = auth.uid()
  )
);

CREATE POLICY "owner_manage_workspace" ON workspaces FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "see_own_membership" ON workspace_members FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_members" ON workspace_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'owner')
  )
);

-- =============================================
--  ÍNDICES para mejor rendimiento
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id    ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_group_id   ON tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_user_id   ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_history_task_id  ON history(task_id);
