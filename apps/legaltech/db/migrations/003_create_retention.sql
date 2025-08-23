
CREATE TABLE IF NOT EXISTS data_records (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  category TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retention_audit (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  deleted_count INT NOT NULL,
  run_at TIMESTAMP DEFAULT now(),
  dsar BOOLEAN DEFAULT false
);


