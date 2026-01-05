-- Knowledge Base Articles
CREATE TABLE IF NOT EXISTS kb_articles (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(100),
    tags VARCHAR(255),
    status VARCHAR(20) DEFAULT 'draft',
    author_id INTEGER REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Full Text Search Index
CREATE INDEX IF NOT EXISTS idx_kb_tfidf ON kb_articles USING GIN (to_tsvector('english', title || ' ' || COALESCE(content, '')));
