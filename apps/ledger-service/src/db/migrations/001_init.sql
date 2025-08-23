
-- Core tables for double-entry ledger

create table if not exists gl_accounts(
  id serial primary key,
  code text not null unique,
  name text not null,
  type text not null check (type in ('asset','liability','equity','income','expense')),
  currency text not null default 'EUR',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists gl_entries(
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  period_month date not null, -- yyyy-mm-01
  status text not null check (status in ('draft','posted','void')) default 'draft',
  posted_at timestamptz,
  reference text,
  external_ref text
);

create index if not exists gl_entries_period_idx on gl_entries(period_month);

create table if not exists gl_entry_lines(
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references gl_entries(id) on delete cascade,
  account_id int not null references gl_accounts(id),
  debit numeric(20,8) not null default 0 check (debit >= 0),
  credit numeric(20,8) not null default 0 check (credit >= 0),
  description text,
  txid text,
  chain text,
  external_ref text,
  metadata jsonb not null default '{}'::jsonb,
  check (not (debit > 0 and credit > 0))
);

create index if not exists gl_lines_entry_idx on gl_entry_lines(entry_id);
create index if not exists gl_lines_txid_idx on gl_entry_lines(txid);

-- Period locking
create table if not exists gl_periods(
  period_month date primary key,
  locked boolean not null default false,
  locked_at timestamptz default now(),
  locked_by text
);

-- External events for reconciliation (bank, on-chain, etc.)
create table if not exists ext_events(
  id uuid primary key default gen_random_uuid(),
  txid text,
  chain text,
  amount numeric(20,8),
  external_ref text,
  occurred_at timestamptz not null default now()
);

create index if not exists ext_events_txid_idx on ext_events(txid);

create table if not exists gl_reconciliations(
  id uuid primary key default gen_random_uuid(),
  line_id uuid references gl_entry_lines(id) on delete set null,
  event_id uuid references ext_events(id) on delete cascade,
  status text not null check (status in ('matched','unmatched','mismatch')) default 'matched',
  matched_at timestamptz default now()
);

-- Extension used by gen_random_uuid (enable when available)
do $$ begin
  perform 1 from pg_extension where extname = 'pgcrypto';
  if not found then
    create extension if not exists pgcrypto;
  end if;
end $$;


