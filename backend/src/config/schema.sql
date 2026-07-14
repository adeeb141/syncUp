CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users(
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name VARCHAR(255),
email VARCHAR(255) UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
is_verified BOOL DEFAULT FALSE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--roles table
CREATE TABLE roles(
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name VARCHAR(50) UNIQUE NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

---user-roles junction table
CREATE TABLE user_roles(
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
PRIMARY KEY (user_id,role_id)
);

 -- Workspaces 
-- CREATE TABLE workspaces (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   slug VARCHAR(100) UNIQUE NOT NULL,  
--   owner_id UUID REFERENCES users(id),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
 

 CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);


-- Workspace members
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, user_id)
);

--workspace invites
CREATE TABLE workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  -- invited_user UUID REFERENCES users(id) ON DELETE CASCADE,
  -- invited_by UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
invited_by_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at DATE DEFAULT CURRENT_DATE
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_project_per_workspace
  UNIQUE (workspace_id, name)
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id),  -- for subtasks
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',       -- todo, in_progress, in_review, done
  priority VARCHAR(50) DEFAULT 'medium',   -- low, medium, high, urgent
  assignee_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  due_date TIMESTAMP,
  position FLOAT,
  review_remarks TEXT DEFAULT NULL,         -- rejection feedback from reviewer
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, title)
);

CREATE TABLE task_assignees (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- Collaborative Documents
CREATE TABLE documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT DEFAULT '',
  access       VARCHAR(20) NOT NULL DEFAULT 'open_collab',  -- 'view_only' | 'open_collab' | 'selective'
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type         VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'whiteboard')),
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id      UUID REFERENCES tasks(id) ON DELETE SET NULL,
  room_name    VARCHAR(500) NOT NULL UNIQUE,
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborators for selective-access documents
CREATE TABLE document_collaborators (
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, user_id)
);


-- for files 

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,
  type TEXT,

  uploaded_by UUID REFERENCES users(id),

  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE files ADD COLUMN key TEXT;




-- ============================================================================
-- STEP 4 — THE OP LOG TABLE
-- ============================================================================
-- One row = one tiny edit (an insert of one character, or a delete of one).
-- This is the durable, append-only history of a document. We never UPDATE
-- or DELETE rows here — the log only ever grows. That's what makes "replay
-- everything after sequence N" and "reconstruct the document as of time T"
-- both possible later, for free.

CREATE TABLE IF NOT EXISTS crdt_ops (
  seq BIGSERIAL PRIMARY KEY,          -- strictly increasing, this IS the delivery order for replay
  doc_id UUID NOT NULL,                -- which document this edit belongs to
  op_type TEXT NOT NULL CHECK (op_type IN ('insert', 'delete')),

  -- the id of the character this op is ABOUT
  -- (for insert: the new character's own id. for delete: the id being removed)
  id_site TEXT NOT NULL,
  id_clock INTEGER NOT NULL,

  value TEXT,                          -- the actual character — only set for inserts
  origin_site TEXT,                    -- "inserted right after this character" — only set for inserts
  origin_clock INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Same op arriving twice (e.g. a client retries, or a message gets
  -- delivered twice over the network) should be a no-op, not a duplicate row.
  UNIQUE (doc_id, op_type, id_site, id_clock)
);

-- Every reconnect asks "ops for THIS doc, after sequence N" — index for that.
CREATE INDEX IF NOT EXISTS idx_crdt_ops_doc_seq ON crdt_ops (doc_id, seq);

-- ============================================================================
-- Push Subscriptions (Web Push API)
-- ============================================================================
-- Stores browser push subscriptions per user, so we can deliver notifications
-- even when the user has no active WebSocket connection (browser/tab closed).
-- One user can have multiple rows here (different browsers/devices).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);