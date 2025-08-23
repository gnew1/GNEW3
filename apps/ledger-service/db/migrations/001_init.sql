
-- N323: Esquema de libro mayor doble-entrada + eventos + snapshots + conciliación

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
  currency TEXT NOT NULL DEFAULT 'EUR'
);

CREATE TABLE IF NOT EXISTS periods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- YYYY-MM
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT,
  period_id INT NOT NULL REFERENCES periods(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed')),
  posted_at TIMESTAMPTZ,
  external_txid TEXT, -- rastreabilidad (on/off-ramp, tx hash)
  source TEXT CHECK (source IN ('onchain','offchain')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id BIGSERIAL PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id INT NOT NULL REFERENCES accounts(id),
  debit NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_jl_entry ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_je_period ON journal_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_je_txid ON journal_entries(external_txid);

CREATE TABLE IF NOT EXISTS ledger_events (
  id BIGSERIAL PRIMARY KEY,
  entry_id UUID,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconciliations (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  statement_json JSONB NOT NULL,
  entry_id UUID REFERENCES journal_entries(id),
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snapshots (
  id BIGSERIAL PRIMARY KEY,
  as_of TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  hash TEXT NOT NULL,
  tx

Tú dijiste:
Como IA programadora de GNEW, ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt" empezando en N321 (N320 se ejecutó en la interacción actual) y avanza +1 en cada ejecución hasta N340, sin repetirte. Para cada prompt: 1) entrega exactamente lo pedido con código listo para producción; 2) empieza la respuesta con la RUTA COMPLETA del archivo de salida y debajo el código en el lenguaje indicado; 3) mantén coherencia con el monorepo (Node/TypeScript predominante, backend principal app.ts) y convenciones establecidas; 4) incluye pruebas y scripts de integración cuando proceda; 5) evita texto superfluo fuera de rutas+código salvo breves notas de uso; 6) conserva y actualiza un puntero interno de progreso para continuar en N+1 y detenerse al llegar a N340.
ChatGPT Plus
Pensó durante 48s

