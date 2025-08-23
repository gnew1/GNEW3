
CREATE TABLE IF NOT EXISTS ropa (
  id SERIAL PRIMARY KEY,
  process_name TEXT NOT NULL,
  owner TEXT NOT NULL,
  purpose TEXT,
  data_categories TEXT[] NOT NULL,
  recipients TEXT[] NOT NULL,
  retention_period TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);


