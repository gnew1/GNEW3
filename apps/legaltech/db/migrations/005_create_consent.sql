
CREATE TABLE IF NOT EXISTS consent (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  action TEXT NOT NULL,
  version INT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  signature TEXT NOT NULL
);


