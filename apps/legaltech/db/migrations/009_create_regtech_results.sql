
CREATE TABLE IF NOT EXISTS regtech_results (
  id SERIAL PRIMARY KEY,
  company_id TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB NOT NULL,
  checked_at TIMESTAMP DEFAULT now()
);


