
-- Core schema for AML real-time monitor

create table if not exists aml_model(
  id text primary key,
  cfg jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists sanctions(
  id bigserial primary key,
  type text not null check (type in ('person','entity','wallet')),
  name text not null,
  country text,
  wallet text,
  doc text,
  unique (name, wallet)
);

create table if not exists tx_events(
  id bigserial primary key,
  tx_id text unique not null,
  user_id text not null,
  counterparty text,
  amount numeric(20,8) not null,
  currency text not null default 'EUR',
  channel text not null,
  ts timestamptz not null default now(),
  raw jsonb not null
);

create table if not exists aml_evidence(
  id uuid primary key,
  prev_hash text,
  hash text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists aml_alerts(
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('L1','L2')),
  status text not null check (status in ('open','ack','l2_review','closed')) default 'open',
  score numeric(6,4) not null,
  tx_id text not null,
  evidence_id uuid not null references aml_evidence(id),
  explanations jsonb not null,
  rules jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  perform 1 from pg_extension where extname = 'pgcrypto';
  if not found then
    create extension if not exists pgcrypto;
  end if;
end $$;


