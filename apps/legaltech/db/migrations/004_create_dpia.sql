
CREATE TABLE IF NOT EXISTS dpia (
  id UUID PRIMARY KEY,
  feature TEXT NOT NULL,
  owner TEXT NOT NULL,
  risks JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  approved BOOLEAN DEFAULT false,
  approver TEXT,
  approved_at TIMESTAMP
);


