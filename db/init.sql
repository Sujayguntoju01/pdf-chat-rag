-- The app creates its table on first run; this just makes sure pgvector is enabled.
CREATE EXTENSION IF NOT EXISTS vector;
