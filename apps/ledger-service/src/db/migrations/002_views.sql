
-- Trial balance as-of (function returns a single row with totals and diff = 0 when balanced)
create or replace function v_trial_balance_asof(as_of timestamptz)
returns table(
  total_debits numeric(20,8),
  total_credits numeric(20,8),
  difference numeric(20,8)
)
language sql
stable
as $$
  select
    coalesce(sum(l.debit),0)::numeric(20,8) as total_debits,
    coalesce(sum(l.credit),0)::numeric(20,8) as total_credits,
    (coalesce(sum(l.debit),0) - coalesce(sum(l.credit),0))::numeric(20,8) as difference
  from gl_entry_lines l
  join gl_entries e on e.id=l.entry_id
  where e.status='posted' and e.occurred_at <= as_of
$$;

-- View for balances per account and period
create or replace view v_account_balances_month as
select
  e.period_month,
  a.id as account_id,
  a.code,
  a.name,
  a.type,
  sum(case when e.status='posted' then l.debit - l.credit else 0 end)::numeric(20,8) as balance
from gl_entry_lines l
join gl_entries e on e.id=l.entry_id
join gl_accounts a on a.id=l.account_id
group by 1,2,3,4,5;


