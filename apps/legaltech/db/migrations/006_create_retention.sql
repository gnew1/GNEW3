
CREATE TABLE IF NOT EXISTS retention_rules (
  id UUID PRIMARY KEY,
  table TEXT NOT NULL,
  column TEXT NOT NULL,
  days INT NOT NULL,
  jurisdiction TEXT NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS retention_audit (
  id SERIAL PRIMARY KEY,
  rule_id UUID REFERENCES retention_rules(id),
  deleted_count INT NOT NULL,
  executed_at TIMESTAMP DEFAULT now()
);


