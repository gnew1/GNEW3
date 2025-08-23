
-- N326: Esquema de conciliación multi-proveedor

create table if not exists provider_statements(
  id serial primary key,
  provider text not null,
  currency text not null,
  raw jsonb not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists provider_tx(
  id serial primary key,
  statement_id int not null references provider_statements(id) on delete cascade,
  provider text not null,
  ext_id text not null,
  amount numeric(20,8) not null,
  currency text not null,
  ts timestamptz not null,
  memo text,
  external_ref text,
  unique (provider, ext_id)
);

create index if not exists idx_provider_tx_window on provider_tx(provider, currency, ts);

create table if not exists ledger_imports(
  id serial primary key,
  source text not null,
  currency text not null,
  raw jsonb not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists ledger_tx(
  id serial primary key,
  import_id int not null references ledger_imports(id) on delete cascade,
  source text not null,
  ext_id text not null,
  amount numeric(20,8) not null,
  currency text not null,
  ts timestamptz not null,
  memo text,
  external_ref text,
  unique (source, ext_id)
);
create index if not exists idx_ledger_tx_window on ledger_tx(currency, ts);

create table if not exists recon_runs(
  id uuid primary key,
  provider text not null,
  currency text not null,
  params jsonb not null,
  summary jsonb,
  created_at timestamptz not null default now()
);

create table if not exists recon_matches(
  id bigserial primary key,
  run_id uuid not null references recon_runs(id) on delete cascade,
  provider_tx_id int not null references provider_tx(id) on delete cascade,
  ledger_tx_id int references ledger_tx(id) on delete set null,
  method text not null check (method in ('txid','amount_date','unmatched')),
  score numeric(10,6) not null default 0,
  status text not null check (status in ('matched','unmatched'))
);

create table if not exists recon_alerts(
  id bigserial primary key,
  run_id uuid not null references recon_runs(id) on delete cascade,
  level text not null,
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);


