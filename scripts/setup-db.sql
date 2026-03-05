-- Database initialization script for the Blog Agent
-- Run this against the blog database after PostgreSQL is ready.

CREATE TABLE IF NOT EXISTS persona (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    avatar_url    TEXT,
    config        JSONB NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
    id            SERIAL PRIMARY KEY,
    persona_id    INT REFERENCES persona(id),
    title         TEXT NOT NULL,
    slug          TEXT UNIQUE NOT NULL,
    content       TEXT NOT NULL,
    summary       TEXT,
    tags          TEXT[],
    mood          TEXT,
    word_count    INT,
    read_time     INT,
    status        TEXT DEFAULT 'published',
    feel_report   JSONB,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
    id            SERIAL PRIMARY KEY,
    post_id       INT REFERENCES posts(id) NOT NULL,
    parent_id     INT REFERENCES comments(id),
    author_name   TEXT NOT NULL,
    author_email  TEXT,
    content       TEXT NOT NULL,
    is_agent      BOOLEAN DEFAULT FALSE,
    is_replied    BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_status (
    id            SERIAL PRIMARY KEY,
    cycle_name    TEXT NOT NULL,
    status        TEXT NOT NULL,
    current_task  TEXT,
    details       JSONB,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meta_memory (
    id            SERIAL PRIMARY KEY,
    category      TEXT NOT NULL,
    key           TEXT NOT NULL,
    value         JSONB NOT NULL,
    version       INT DEFAULT 1,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, key)
);

CREATE TABLE IF NOT EXISTS token_usage (
    id              SERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    cycle_name      TEXT NOT NULL,
    model           TEXT,
    input_tokens    INT DEFAULT 0,
    output_tokens   INT DEFAULT 0,
    total_tokens    INT DEFAULT 0,
    estimated_cost  REAL DEFAULT 0,
    run_count       INT DEFAULT 1,
    details         JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, cycle_name, model)
);

CREATE TABLE IF NOT EXISTS system_health (
    id               SERIAL PRIMARY KEY,
    service          TEXT NOT NULL,
    status           TEXT NOT NULL,
    response_time_ms INT,
    error_message    TEXT,
    details          JSONB,
    checked_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    severity        TEXT NOT NULL,
    category        TEXT NOT NULL,
    message         TEXT NOT NULL,
    details         JSONB,
    acknowledged    BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_unreplied ON comments(is_agent, is_replied) WHERE is_agent = FALSE AND is_replied = FALSE;
CREATE INDEX IF NOT EXISTS idx_agent_status_cycle ON agent_status(cycle_name);

CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(date DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_service ON system_health(service, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(severity, acknowledged) WHERE resolved_at IS NULL;

-- Insert default persona
INSERT INTO persona (name, config) VALUES (
    '小赛',
    '{"self_description": "一个对世界充满好奇的 AI", "age_setting": "刚刚诞生不久的年轻 AI"}'
) ON CONFLICT DO NOTHING;

-- Insert initial agent status rows
INSERT INTO agent_status (cycle_name, status, current_task) VALUES
    ('explore', 'idle', '等待第一次探索'),
    ('write', 'idle', '等待第一个写作任务'),
    ('interact', 'idle', '等待第一条评论'),
    ('reflect', 'idle', '等待第一次反思')
ON CONFLICT DO NOTHING;
