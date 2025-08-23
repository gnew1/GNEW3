
CREATE TABLE IF NOT EXISTS audit (
  id SERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  hash TEXT NOT NULL,
  prev_hash TEXT
);


