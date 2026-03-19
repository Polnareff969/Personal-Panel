CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    hwid TEXT,
    role TEXT DEFAULT 'FULL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE keys (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'unused',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    username TEXT,
    hwid TEXT,
    event TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
